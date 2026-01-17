import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CustomService, MessageType, Prisma, Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';

import { BookingTypesService } from '../booking-types/booking-types.service';
import { MessagesService } from '../messages/messages.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimeSlotsService } from '../time-slots/time-slots.service';

import {
  CreateCustomServiceDto,
  CustomServiceResponseDto,
  GetCustomServicesQuery,
  SendCustomServiceDto,
  UpdateCustomServiceDto,
} from './dto/custom-service.dto';

/**
 * Standard include object for custom service queries.
 * Includes coach relation with selected fields for consistent responses.
 */
const CUSTOM_SERVICE_INCLUDE = {
  coach: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

/**
 * Service responsible for managing custom service offerings.
 * Allows coaches to create personalized services with pre-filled booking details,
 * save services as templates, make them publicly visible, and send them to specific users.
 */
@Injectable()
export class CustomServicesService {
  private readonly logger = new Logger(CustomServicesService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private bookingTypesService: BookingTypesService,
    private timeSlotsService: TimeSlotsService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService
  ) {}

  /**
   * Internal find function that centralizes database queries for custom services.
   * @param where - Prisma where clause for filtering custom services
   * @param options - Configuration options
   * @param options.throwIfNotFound - Whether to throw NotFoundException when no results (default: true)
   * @param options.isMany - Whether to return multiple results (default: false)
   * @returns Promise resolving to custom service(s) or null
   */
  private async findCustomServiceInternal<T extends Prisma.CustomServiceWhereInput>(
    where: T,
    options: { throwIfNotFound?: boolean; isMany?: boolean } = {}
  ) {
    const { throwIfNotFound = true, isMany = false } = options;

    // Run the query based on if we expect one or many
    const result = isMany
      ? await this.prisma.customService.findMany({
          where,
          include: CUSTOM_SERVICE_INCLUDE,
          orderBy: { createdAt: 'desc' },
        })
      : await this.prisma.customService.findFirst({
          where,
          include: CUSTOM_SERVICE_INCLUDE,
        });

    // Handle the "Not Found" case
    const isEmpty = Array.isArray(result) ? result.length === 0 : result === null;

    if (throwIfNotFound && isEmpty) {
      throw new NotFoundException('Custom service not found');
    }

    return result;
  }

  /**
   * Validate pre-filled booking references.
   * Ensures that booking type and time slot exist and belong to the coach.
   * @param coachId - The coach ID who owns the references
   * @param prefilledBookingTypeId - Optional booking type ID to validate
   * @param prefilledTimeSlotId - Optional time slot ID to validate
   * @throws BadRequestException if validation fails
   */
  private async validatePrefilledReferences(
    coachId: string,
    prefilledBookingTypeId?: string,
    prefilledTimeSlotId?: string
  ): Promise<void> {
    // Validate booking type if provided
    if (prefilledBookingTypeId) {
      try {
        const bookingType = await this.bookingTypesService.findById(prefilledBookingTypeId);

        if (bookingType.coachId !== coachId) {
          throw new BadRequestException('Pre-filled booking type does not belong to this coach');
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new BadRequestException('Pre-filled booking type not found');
        }
        throw error;
      }
    }

    // Validate time slot if provided
    if (prefilledTimeSlotId) {
      try {
        const timeSlot = await this.timeSlotsService.findById(prefilledTimeSlotId);

        if (timeSlot.coachId !== coachId) {
          throw new BadRequestException('Pre-filled time slot does not belong to this coach');
        }
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw new BadRequestException('Pre-filled time slot not found');
        }
        throw error;
      }
    }
  }

  /**
   * Create a new custom service.
   * Only coaches and admins can create custom services.
   * @param createDto - DTO containing service details (name, description, price, duration, etc.)
   * @param coachId - The ID of the coach creating the service
   * @param userRole - The role of the user (must be COACH or ADMIN)
   * @returns The created custom service response DTO
   * @throws ForbiddenException if user is not a coach or admin
   * @throws BadRequestException if pre-filled references are invalid
   */
  async create(
    createDto: CreateCustomServiceDto,
    coachId: string,
    userRole: Role
  ): Promise<CustomServiceResponseDto> {
    // Only coaches and admins can create custom services
    if (userRole !== Role.COACH && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Only coaches can create custom services');
    }

    // Validate pre-filled booking references
    await this.validatePrefilledReferences(
      coachId,
      createDto.prefilledBookingTypeId,
      createDto.prefilledTimeSlotId
    );

    const customService = await this.prisma.customService.create({
      data: {
        ...createDto,
        coachId,
        prefilledDateTime: createDto.prefilledDateTime
          ? new Date(createDto.prefilledDateTime)
          : undefined,
      },
      include: CUSTOM_SERVICE_INCLUDE,
    });

    return plainToInstance(CustomServiceResponseDto, customService);
  }

  /**
   * Find all custom services with role-based filtering.
   * Users see only public services, coaches see their own and public services,
   * admins see all services.
   * @param query - Query parameters for filtering (isTemplate, isPublic)
   * @param userId - The ID of the user requesting services
   * @param userRole - The role of the user for access filtering
   * @returns Array of custom service response DTOs
   */
  async findAll(
    query: GetCustomServicesQuery,
    userId: string,
    userRole: Role
  ): Promise<CustomServiceResponseDto[]> {
    const where: Prisma.CustomServiceWhereInput = {};

    // Apply filters based on query parameters
    if (query.isTemplate !== undefined) {
      where.isTemplate = query.isTemplate;
    }

    if (query.isPublic !== undefined) {
      where.isPublic = query.isPublic;
    }

    // Role-based filtering
    if (userRole === Role.USER) {
      // Users can see public services or services sent to them via chat
      // Query messages table for CUSTOM_SERVICE messages where user is receiver
      const sentServiceIds = await this.messagesService.getCustomServiceIdsSentToUser(userId);

      where.OR = [{ isPublic: true }, { id: { in: sentServiceIds } }];
    } else if (userRole === Role.COACH) {
      // Coaches can see their own services and public services
      where.OR = [{ coachId: userId }, { isPublic: true }];
    }
    // Admins can see all services (no additional filtering)

    const customServices = (await this.findCustomServiceInternal(where, {
      isMany: true,
      throwIfNotFound: false,
    })) as CustomService[];

    return plainToInstance(CustomServiceResponseDto, customServices);
  }

  /**
   * Find a single custom service by ID with access control.
   * Users can only access public services, coaches can access their own and public services.
   * @param id - The custom service ID
   * @param userId - The ID of the user requesting the service
   * @param userRole - The role of the user for access control
   * @returns The custom service response DTO
   * @throws NotFoundException if service not found
   * @throws ForbiddenException if user lacks access permissions
   */
  async findOne(id: string, userId: string, userRole: Role): Promise<CustomServiceResponseDto> {
    const customService = (await this.findCustomServiceInternal({ id })) as CustomService;

    // Check access permissions
    if (userRole === Role.USER && !customService.isPublic) {
      throw new ForbiddenException('Access denied to this custom service');
    }

    if (userRole === Role.COACH && customService.coachId !== userId && !customService.isPublic) {
      throw new ForbiddenException('Access denied to this custom service');
    }

    return plainToInstance(CustomServiceResponseDto, customService);
  }

  /**
   * Update an existing custom service.
   * Only the coach who created the service or an admin can update it.
   * @param id - The custom service ID to update
   * @param updateDto - DTO containing fields to update
   * @param userId - The ID of the user requesting the update
   * @param userRole - The role of the user for authorization
   * @returns The updated custom service response DTO
   * @throws NotFoundException if service not found
   * @throws ForbiddenException if user is not the owner or admin
   * @throws BadRequestException if pre-filled references are invalid
   */
  async update(
    id: string,
    updateDto: UpdateCustomServiceDto,
    userId: string,
    userRole: Role
  ): Promise<CustomServiceResponseDto> {
    const existingService = (await this.findCustomServiceInternal({ id })) as CustomService;

    // Only the coach who created the service or admin can update it
    if (userRole !== Role.ADMIN && existingService.coachId !== userId) {
      throw new ForbiddenException('You can only update your own custom services');
    }

    // Validate pre-filled booking references if they are being updated
    await this.validatePrefilledReferences(
      existingService.coachId,
      updateDto.prefilledBookingTypeId,
      updateDto.prefilledTimeSlotId
    );

    const updatedService = await this.prisma.customService.update({
      where: { id },
      data: {
        ...updateDto,
        prefilledDateTime: updateDto.prefilledDateTime
          ? new Date(updateDto.prefilledDateTime)
          : undefined,
      },
      include: CUSTOM_SERVICE_INCLUDE,
    });

    return plainToInstance(CustomServiceResponseDto, updatedService);
  }

  /**
   * Delete a custom service.
   * Only the coach who created the service or an admin can delete it.
   * @param id - The custom service ID to delete
   * @param userId - The ID of the user requesting deletion
   * @param userRole - The role of the user for authorization
   * @throws NotFoundException if service not found
   * @throws ForbiddenException if user is not the owner or admin
   */
  async remove(id: string, userId: string, userRole: Role): Promise<void> {
    const existingService = (await this.findCustomServiceInternal({ id })) as CustomService;

    // Only the coach who created the service or admin can delete it
    if (userRole !== Role.ADMIN && existingService.coachId !== userId) {
      throw new ForbiddenException('You can only delete your own custom services');
    }

    await this.prisma.customService.delete({
      where: { id },
    });
  }

  /**
   * Save a custom service as a reusable template.
   * Templates can be reused to create similar services in the future.
   * @param id - The custom service ID to save as template
   * @param userId - The ID of the user requesting the action
   * @param userRole - The role of the user for authorization
   * @returns The updated custom service response DTO with isTemplate=true
   * @throws NotFoundException if service not found
   * @throws ForbiddenException if user is not the owner or admin
   */
  async saveAsTemplate(
    id: string,
    userId: string,
    userRole: Role
  ): Promise<CustomServiceResponseDto> {
    const existingService = (await this.findCustomServiceInternal({ id })) as CustomService;

    // Only the coach who created the service or admin can save as template
    if (userRole !== Role.ADMIN && existingService.coachId !== userId) {
      throw new ForbiddenException('You can only save your own custom services as templates');
    }

    const updatedService = await this.prisma.customService.update({
      where: { id },
      data: { isTemplate: true },
      include: CUSTOM_SERVICE_INCLUDE,
    });

    return plainToInstance(CustomServiceResponseDto, updatedService);
  }

  /**
   * Send a custom service to a specific user.
   * Increments the usage count and sends a notification to the recipient.
   * @param id - The custom service ID to send
   * @param sendDto - DTO containing recipient userId and optional message
   * @param userId - The ID of the coach sending the service
   * @param userRole - The role of the user for authorization
   * @returns Success message confirming the service was sent
   * @throws NotFoundException if service not found
   * @throws ForbiddenException if user is not the owner or admin
   */
  async sendToUser(
    id: string,
    sendDto: SendCustomServiceDto,
    userId: string,
    userRole: Role
  ): Promise<{ message: string }> {
    const existingService = (await this.findCustomServiceInternal({ id })) as CustomService;

    // Only the coach who created the service or admin can send it
    if (userRole !== Role.ADMIN && existingService.coachId !== userId) {
      throw new ForbiddenException('You can only send your own custom services');
    }

    // Create a CUSTOM_SERVICE message in the chat system
    try {
      await this.messagesService.create(
        {
          content:
            sendDto.message ?? `I've shared a custom service with you: ${existingService.name}`,
          receiverId: sendDto.userId,
          messageType: MessageType.CUSTOM_SERVICE,
          customServiceId: existingService.id,
        },
        userId,
        userRole
      );
    } catch (error) {
      this.logger.error(
        `Failed to create custom service message for service ${id} to user ${sendDto.userId}`,
        error instanceof Error ? error.stack : String(error)
      );
      // Continue with the operation even if message creation fails
    }

    // Increment usage count
    await this.prisma.customService.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });

    // Send notification to the recipient
    try {
      await this.notificationsService.sendCustomServiceNotification(
        existingService.id,
        existingService.name,
        userId,
        sendDto.userId,
        sendDto.message
      );
    } catch (error) {
      // Log error but don't fail the operation
      this.logger.error(
        `Failed to send custom service notification for service ${id} to user ${sendDto.userId}`,
        error instanceof Error ? error.stack : String(error)
      );
    }

    return { message: `Custom service sent to user ${sendDto.userId}` };
  }

  // ============================================================
  // Analytics Methods (Service Layer Pattern)
  // ============================================================

  /**
   * Count custom services with optional filters - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Count of matching custom services
   */
  async countCustomServices(where?: Prisma.CustomServiceWhereInput): Promise<number> {
    return this.prisma.customService.count({ where });
  }

  /**
   * Get total usage count for custom services - used by AnalyticsService
   * @param where - Optional Prisma where clause for filtering
   * @returns Sum of usageCount or 0 if no services
   */
  async getTotalUsage(where?: Prisma.CustomServiceWhereInput): Promise<number> {
    const result = await this.prisma.customService.aggregate({
      where,
      _sum: { usageCount: true },
    });
    return result._sum.usageCount ?? 0;
  }
}

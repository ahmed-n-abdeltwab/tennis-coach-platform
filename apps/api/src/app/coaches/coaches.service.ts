import { PrismaService } from '@app/prisma/prisma.service';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { BookingType, Coach } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SignupCoachDto } from '../auth/dto/auth.dto';
import coachesConfig from './config/coaches.config';
import { UpdateCoachDto } from './dto/coach.dto';

@Injectable()
export class CoachesService {
  constructor(
    private prisma: PrismaService,
    @Inject(coachesConfig.KEY)
    private readonly coachesConfiguration: ConfigType<typeof coachesConfig>
  ) {}
  async create(signupDto: SignupCoachDto): Promise<Coach> {
    const existingCoach = await this.prisma.coach.findUnique({
      where: { email: signupDto.email },
    });

    if (existingCoach) {
      throw new ConflictException('Coach with this email already exists');
    }

    const passwordHash = await bcrypt.hash(signupDto.password, 10);

    return this.prisma.coach.create({
      data: {
        email: signupDto.email,
        name: signupDto.name,
        passwordHash,
        isAdmin: signupDto.isAdmin ?? true,
        bio: signupDto.bio,
        credentials: signupDto.credentials,
        philosophy: signupDto.philosophy,
        profileImage: signupDto.profileImage,
      },
    });
  }

  async findByEmail(email: string): Promise<Coach | null> {
    return this.prisma.coach.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<Coach | null> {
    return this.prisma.coach.findUnique({
      where: { id },
    });
  }

  async validatePassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  async updateOnlineStatus(coachId: string, isOnline: boolean): Promise<Coach> {
    return this.prisma.coach.update({
      where: { id: coachId },
      data: { isOnline },
    });
  }

  async findAll(): Promise<
    Array<
      Pick<Coach, 'id' | 'name' | 'bio' | 'credentials' | 'philosophy' | 'profileImage'> & {
        bookingTypes: Pick<BookingType, 'id' | 'name' | 'description' | 'basePrice'>[];
      }
    >
  > {
    return this.prisma.coach.findMany({
      select: {
        id: true,
        name: true,
        bio: true,
        credentials: true,
        philosophy: true,
        profileImage: true,
        bookingTypes: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<
    Pick<Coach, 'id' | 'name' | 'bio' | 'credentials' | 'philosophy' | 'profileImage'> & {
      bookingTypes: Pick<BookingType, 'id' | 'name' | 'description' | 'basePrice'>[];
    }
  > {
    const coach = await this.prisma.coach.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        bio: true,
        credentials: true,
        philosophy: true,
        profileImage: true,
        bookingTypes: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            basePrice: true,
          },
        },
      },
    });

    if (!coach) {
      throw new NotFoundException('Coach not found');
    }

    return coach;
  }

  async updateProfile(id: string, updateDto: UpdateCoachDto): Promise<Coach> {
    return this.prisma.coach.update({
      where: { id },
      data: updateDto,
    });
  }
}

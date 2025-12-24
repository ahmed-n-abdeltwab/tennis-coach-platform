import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../app/prisma/prisma.service';

export interface FindAllOptions {
  skip?: number;
  take?: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'> | Record<string, 'asc' | 'desc'>[];
  include?: Record<string, boolean | object>;
}

/**
 * Abstract base service providing common CRUD operations.
 * Extend this class to get standardized database operations with consistent error handling.
 *
 * @template T - The entity type returned by operations
 * @template CreateDto - The DTO type for create operations
 * @template UpdateDto - The DTO type for update operations
 *
 * @example
 * export class SessionsService extends BaseService<Session, CreateSessionDto, UpdateSessionDto> {
 *   protected readonly modelName = 'session';
 *
 *   constructor(prisma: PrismaService) {
 *     super(prisma);
 *   }
 * }
 */
export abstract class BaseService<T, CreateDto, UpdateDto> {
  /**
   * The Prisma model name (lowercase, e.g., 'session', 'account', 'discount')
   */
  protected abstract readonly modelName: string;

  constructor(protected readonly prisma: PrismaService) {}

  /**
   * Get the Prisma model delegate for this service.
   * Uses dynamic access to PrismaService based on modelName.
   */
  protected get model(): PrismaModelDelegate {
    const model = (this.prisma as unknown as Record<string, PrismaModelDelegate>)[this.modelName];
    if (!model) {
      throw new Error(`Model "${this.modelName}" not found in PrismaService`);
    }
    return model;
  }

  /**
   * Find all entities matching the given options.
   * @param options - Query options (skip, take, where, orderBy, include)
   * @returns Array of entities
   */
  async findAll(options?: FindAllOptions): Promise<T[]> {
    return this.model.findMany(options) as Promise<T[]>;
  }

  /**
   * Find a single entity by ID.
   * @param id - Entity ID
   * @throws NotFoundException if entity not found
   * @returns The entity
   */
  async findOne(id: string): Promise<T> {
    const entity = await this.model.findUnique({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`${this.capitalizedModelName} with ID ${id} not found`);
    }
    return entity as T;
  }

  /**
   * Create a new entity.
   * @param data - Creation data
   * @returns The created entity
   */
  async create(data: CreateDto): Promise<T> {
    return this.model.create({ data }) as Promise<T>;
  }

  /**
   * Update an existing entity.
   * @param id - Entity ID
   * @param data - Update data
   * @throws NotFoundException if entity not found
   * @returns The updated entity
   */
  async update(id: string, data: UpdateDto): Promise<T> {
    await this.findOne(id); // Throws NotFoundException if not found
    return this.model.update({ where: { id }, data }) as Promise<T>;
  }

  /**
   * Delete an entity by ID.
   * @param id - Entity ID
   * @throws NotFoundException if entity not found
   * @returns The deleted entity
   */
  async delete(id: string): Promise<T> {
    await this.findOne(id); // Throws NotFoundException if not found
    return this.model.delete({ where: { id } }) as Promise<T>;
  }

  /**
   * Count entities matching the given criteria.
   * @param where - Filter criteria
   * @returns Count of matching entities
   */
  async count(where?: Record<string, unknown>): Promise<number> {
    return this.model.count({ where });
  }

  /**
   * Get the capitalized model name for error messages.
   */
  private get capitalizedModelName(): string {
    return this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1);
  }
}

/**
 * Type representing a Prisma model delegate with common operations.
 * This is a simplified type for the dynamic model access pattern.
 */
interface PrismaModelDelegate {
  findMany(args?: unknown): Promise<unknown[]>;
  findUnique(args: { where: { id: string } }): Promise<unknown | null>;
  create(args: { data: unknown }): Promise<unknown>;
  update(args: { where: { id: string }; data: unknown }): Promise<unknown>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  count(args?: { where?: unknown }): Promise<number>;
}

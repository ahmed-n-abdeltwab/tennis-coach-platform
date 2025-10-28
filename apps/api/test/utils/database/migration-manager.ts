/**
 * MigrationManager - Utilities for managing database migrations in test environments
 *
 * This module provides:
 * - Migration execution for test databases
 * - Schema validation and verification
 * - Migration rollback capabilities
 * - Test-specific migration utilities
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface MigrationInfo {
  id: string;
  checksum: string;
  finished_at: Date | null;
  migration_name: string;
  logs: string | null;
  rolled_back_at: Date | null;
  started_at: Date;
  applied_steps_count: number;
}

export interface MigrationOptions {
  timeout?: number;
  skipGenerate?: boolean;
  skipSeed?: boolean;
  verbose?: boolean;
}

export class MigrationManager {
  private prismaSchemaPath;
  private migrationsPath: string;
  private originalDatabaseUrl: string;

  constructor(
    prismaSchemaPath: string = 'apps/api/prisma/schema.prisma',
    migrationsPath: string = 'apps/api/prisma/migrations'
  ) {
    this.prismaSchemaPath = prismaSchemaPath;
    this.migrationsPath = migrationsPath;
    this.originalDatabaseUrl = process.env.DATABASE_URL || '';
  }

  /**
   * Deploy all pending migrations to a test database
   */
  async deployMigrations(databaseUrl: string, options: MigrationOptions = {}): Promise<void> {
    const { timeout = 60000, skipGenerate = false, verbose = false } = options;

    try {
      // Temporarily set the database URL
      const originalUrl = this.originalDatabaseUrl;
      this.originalDatabaseUrl = databaseUrl;

      if (verbose) {
        console.log(`Deploying migrations to: ${this.maskDatabaseUrl(databaseUrl)}`);
      }

      // Generate Prisma client if needed
      if (!skipGenerate) {
        await this.generatePrismaClient(databaseUrl, { verbose });
      }

      // Deploy migrations
      const deployCommand = 'npx prisma migrate deploy';

      if (verbose) {
        console.log(`Executing: ${deployCommand}`);
      }

      execSync(deployCommand, {
        cwd: process.cwd(),
        stdio: verbose ? 'inherit' : 'pipe',
        timeout,
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });

      if (verbose) {
        console.log('Migrations deployed successfully');
      }

      // Restore original URL
      if (originalUrl) {
        this.originalDatabaseUrl = originalUrl;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to deploy migrations: ${error.message}`);
      }
      // fallback for non-Error objects
      throw new Error(`Failed to deploy migrations: ${String(error)}`);
    }
  }

  /**
   * Reset the database and apply all migrations
   */
  async resetDatabase(databaseUrl: string, options: MigrationOptions = {}): Promise<void> {
    const { timeout = 60000, skipSeed = false, verbose = false } = options;

    try {
      const originalUrl = this.originalDatabaseUrl;
      this.originalDatabaseUrl = databaseUrl;

      if (verbose) {
        console.log(`Resetting database: ${this.maskDatabaseUrl(databaseUrl)}`);
      }

      // Reset database
      const resetCommand = 'npx prisma migrate reset --force';

      if (verbose) {
        console.log(`Executing: ${resetCommand}`);
      }

      execSync(resetCommand, {
        cwd: process.cwd(),
        stdio: verbose ? 'inherit' : 'pipe',
        timeout,
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });

      // Run seed if not skipped
      if (!skipSeed && this.hasSeedFile()) {
        await this.runSeed(databaseUrl, { verbose });
      }

      if (verbose) {
        console.log('Database reset completed');
      }

      // Restore original URL
      if (originalUrl) {
        this.originalDatabaseUrl = originalUrl;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to reset database: ${error.message}`);
      }
      throw new Error(`Failed to reset database: ${String(error)}`);
    }
  }

  /**
   * Generate Prisma client for the specified database
   */
  async generatePrismaClient(
    databaseUrl: string,
    options: { verbose?: boolean } = {}
  ): Promise<void> {
    const { verbose = false } = options;

    try {
      const originalUrl = this.originalDatabaseUrl;
      this.originalDatabaseUrl = databaseUrl;

      if (verbose) {
        console.log('Generating Prisma client...');
      }

      const generateCommand = 'npx prisma generate';

      execSync(generateCommand, {
        cwd: process.cwd(),
        stdio: verbose ? 'inherit' : 'pipe',
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });

      if (verbose) {
        console.log('Prisma client generated successfully');
      }

      // Restore original URL
      if (originalUrl) {
        this.originalDatabaseUrl = originalUrl;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate Prisma client: ${error.message}`);
      }
      throw new Error(`Failed to generate Prisma client: ${String(error)}`);
    }
  }

  /**
   * Run database seed script
   */
  async runSeed(databaseUrl: string, options: { verbose?: boolean } = {}): Promise<void> {
    const { verbose = false } = options;

    if (!this.hasSeedFile()) {
      if (verbose) {
        console.log('No seed file found, skipping seed');
      }
      return;
    }

    try {
      const originalUrl = this.originalDatabaseUrl;
      this.originalDatabaseUrl = databaseUrl;

      if (verbose) {
        console.log('Running database seed...');
      }

      const seedCommand = 'npx prisma db seed';

      execSync(seedCommand, {
        cwd: process.cwd(),
        stdio: verbose ? 'inherit' : 'pipe',
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });

      if (verbose) {
        console.log('Database seed completed');
      }

      // Restore original URL
      if (originalUrl) {
        this.originalDatabaseUrl = originalUrl;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to run seed: ${error.message}`);
      }
      throw new Error(`Failed to run seed: ${String(error)}`);
    }
  }

  /**
   * Get migration history from the database
   */
  async getMigrationHistory(client: PrismaClient): Promise<MigrationInfo[]> {
    try {
      const migrations = await client.$queryRaw<MigrationInfo[]>`
        SELECT * FROM "_prisma_migrations" ORDER BY started_at ASC
      `;
      return migrations;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get the Migration History: ${error.message}`);
      }
      throw new Error(`Failed to get the Migration History: ${String(error)}`);
    }
  }

  /**
   * Verify that all migrations have been applied
   */
  async verifyMigrations(client: PrismaClient): Promise<{
    isUpToDate: boolean;
    pendingMigrations: string[];
    appliedMigrations: string[];
  }> {
    try {
      const appliedMigrations = await this.getMigrationHistory(client);
      const availableMigrations = this.getAvailableMigrations();

      const appliedMigrationNames = appliedMigrations.map(m => m.migration_name);
      const pendingMigrations = availableMigrations.filter(
        name => !appliedMigrationNames.includes(name)
      );

      return {
        isUpToDate: pendingMigrations.length === 0,
        pendingMigrations,
        appliedMigrations: appliedMigrationNames,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to verify migrations: ${error.message}`);
      }
      throw new Error(`Failed to verify migrations: ${String(error)}`);
    }
  }

  /**
   * Create a development migration (for testing schema changes)
   */
  async createDevMigration(
    name: string,
    databaseUrl: string,
    options: { verbose?: boolean } = {}
  ): Promise<string> {
    const { verbose = false } = options;

    try {
      const originalUrl = this.originalDatabaseUrl;
      this.originalDatabaseUrl = databaseUrl;

      if (verbose) {
        console.log(`Creating migration: ${name}`);
      }

      const migrateCommand = `npx prisma migrate dev --name "${name}" --create-only`;

      const output = execSync(migrateCommand, {
        cwd: process.cwd(),
        stdio: 'pipe',
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });

      // Extract migration file path from output
      const migrationMatch = output.match(/Created migration (\d+_[^/\s]+)/);
      const migrationName = migrationMatch ? migrationMatch[1] : name;

      if (verbose) {
        console.log(`Migration created: ${migrationName}`);
      }

      // Restore original URL
      if (originalUrl) {
        this.originalDatabaseUrl = originalUrl;
      }

      return migrationName;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create migration: ${error.message}`);
      }
      throw new Error(`Failed to create migration: ${String(error)}`);
    }
  }

  /**
   * Validate database schema against Prisma schema
   */
  async validateSchema(client: PrismaClient): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    try {
      // This is a simplified validation - in a real scenario you might want more comprehensive checks
      const tables = await client.$queryRaw<Array<{ table_name: string }>>`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name != '_prisma_migrations'
      `;

      const expectedTables = this.getExpectedTablesFromSchema();
      const actualTables = tables.map(t => t.table_name);

      const missingTables = expectedTables.filter(table => !actualTables.includes(table));
      const extraTables = actualTables.filter(table => !expectedTables.includes(table));

      const errors: string[] = [];
      if (missingTables.length > 0) {
        errors.push(`Missing tables: ${missingTables.join(', ')}`);
      }
      if (extraTables.length > 0) {
        errors.push(`Extra tables: ${extraTables.join(', ')}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          isValid: false,
          errors: [`Schema validation failed: ${error.message}`],
        };
      }
      return {
        isValid: false,
        errors: [`Schema validation failed: ${String(error)}`],
      };
    }
  }

  /**
   * Setup a fresh test database with migrations
   */
  async setupTestDatabase(
    databaseUrl: string,
    options: MigrationOptions & { seedData?: boolean } = {}
  ): Promise<void> {
    const { seedData = false, verbose = false } = options;

    try {
      if (verbose) {
        console.log(`Setting up test database: ${this.maskDatabaseUrl(databaseUrl)}`);
      }

      // Deploy migrations
      await this.deployMigrations(databaseUrl, options);

      // Seed data if requested
      if (seedData) {
        await this.runSeed(databaseUrl, { verbose });
      }

      if (verbose) {
        console.log('Test database setup completed');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to setup test database: ${error.message}`);
      }
      throw new Error(`Failed to setup test database: ${String(error)}`);
    }
  }

  // Private helper methods

  private getAvailableMigrations(): string[] {
    if (!existsSync(this.migrationsPath)) {
      return [];
    }

    const fs = require('fs');
    return fs
      .readdirSync(this.migrationsPath)
      .filter((item: string) => {
        const itemPath = join(this.migrationsPath, item);
        return fs.statSync(itemPath).isDirectory() && item.match(/^\d+_/);
      })
      .sort();
  }

  private hasSeedFile(): boolean {
    const seedPath = join('apps/api/prisma', 'seed.ts');
    return existsSync(seedPath);
  }

  private getExpectedTablesFromSchema(): string[] {
    try {
      const schemaContent = readFileSync(this.prismaSchemaPath, 'utf8');
      const modelMatches = schemaContent.match(/model\s+(\w+)\s*{/g);

      if (!modelMatches) {
        return [];
      }

      return modelMatches
        .map(match => {
          const modelName = match.match(/model\s+(\w+)/)?.[1];
          if (!modelName) return '';

          // Check for @@map directive
          const modelBlock = this.extractModelBlock(schemaContent, modelName);
          const mapMatch = modelBlock.match(/@@map\("([^"]+)"\)/);

          return mapMatch ? mapMatch[1] : this.toSnakeCase(modelName);
        })
        .filter(Boolean);
    } catch (error) {
      if (error instanceof Error) {
        console.warn(`Could not parse schema file: ${error.message}`);
      }
      console.warn(`Could not parse schema file: ${String(error)}`);
      return [];
    }
  }

  private extractModelBlock(schemaContent: string, modelName: string): string {
    const modelStart = schemaContent.indexOf(`model ${modelName} {`);
    if (modelStart === -1) return '';

    let braceCount = 0;
    let i = modelStart;

    while (i < schemaContent.length) {
      if (schemaContent[i] === '{') braceCount++;
      if (schemaContent[i] === '}') braceCount--;
      if (braceCount === 0 && schemaContent[i] === '}') {
        return schemaContent.substring(modelStart, i + 1);
      }
      i++;
    }

    return '';
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`).substring(1);
  }

  private maskDatabaseUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.username}:***@${urlObj.host}${urlObj.pathname}`;
    } catch {
      return url.replace(/:[^:@]+@/, ':***@');
    }
  }
}

/**
 * Factory function to create a MigrationManager instance
 */
export function createMigrationManager(
  prismaSchemaPath?: string,
  migrationsPath?: string
): MigrationManager {
  return new MigrationManager(prismaSchemaPath, migrationsPath);
}

/**
 * Global migration manager instance
 */
export const migrationManager = createMigrationManager();

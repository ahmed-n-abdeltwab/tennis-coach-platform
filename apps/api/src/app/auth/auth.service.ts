import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Coach, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import bcrypt from 'bcryptjs';
import authConfig from './config/auth.config';
import { LoginDto, RegisterDto } from './dto/auth.dto';

// Interface for entities that have passwordHash and common user fields
interface EntityWithPasswordHash {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}

// Narrow union of User and Coach to entities with password field
type Entity = User | Coach;

import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(authConfig.KEY) private readonly authConfiguration: ConfigType<typeof authConfig>
  ) {
    this.saltRounds = Number(this.authConfiguration.saltRounds) || 10;
  }

  /**
   * Generic method for registering a user or coach.
   * Finds existing entity, hashes password, creates new entity,
   * then generates JWT token.
   */
  private async registerEntity<T extends Entity>(
    registerDto: RegisterDto,
    findUnique: (args: { where: { email: string } }) => Promise<T | null>,
    create: (args: { data: Omit<T, 'id'> & { passwordHash: string } }) => Promise<T>,
    type: 'user' | 'coach'
  ) {
    const { email, password, name } = registerDto;

    const existing = await findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException(
        `${type.charAt(0).toUpperCase() + type.slice(1)} already exists`
      );
    }

    const passwordHash = await bcrypt.hash(password, this.saltRounds);

    const data = {
      email,
      name,
      passwordHash,
    } as unknown as Omit<T, 'id'> & { passwordHash: string };

    const entity = await create({ data });

    const payload: JwtPayload = { sub: entity.id, email: entity.email, type };
    const token = await this.jwtService.signAsync(payload);

    return {
      user: {
        id: entity.id,
        email: entity.email,
        name: entity.name,
        type,
      },
      token,
    };
  }

  /**
   * Generic method for logging in a user or coach.
   * Validates credentials, throws if invalid, returns JWT token.
   */
  private async loginEntity<T extends EntityWithPasswordHash>(
    loginDto: LoginDto,
    findUnique: (args: { where: { email: string } }) => Promise<T | null>,
    type: 'user' | 'coach'
  ) {
    const { email, password } = loginDto;

    const entity = await findUnique({ where: { email } });
    if (!entity) throw new UnauthorizedException('Invalid credentials');

    const isValidPassword = await bcrypt.compare(password, entity.passwordHash);
    if (!isValidPassword) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = { sub: entity.id, email: entity.email, type };
    const token = await this.jwtService.signAsync(payload);

    return {
      user: {
        id: entity.id,
        email: entity.email,
        name: entity.name,
        type,
      },
      token,
    };
  }

  async register(registerDto: RegisterDto) {
    return this.registerEntity(
      registerDto,
      this.prisma.user.findUnique.bind(this.prisma.user),
      this.prisma.user.create.bind(this.prisma.user),
      'user'
    );
  }

  async login(loginDto: LoginDto) {
    return this.loginEntity(loginDto, this.prisma.user.findUnique.bind(this.prisma.user), 'user');
  }

  async registerCoach(registerDto: RegisterDto) {
    return this.registerEntity(
      registerDto,
      this.prisma.coach.findUnique.bind(this.prisma.coach),
      this.prisma.coach.create.bind(this.prisma.coach),
      'coach'
    );
  }

  async loginCoach(loginDto: LoginDto) {
    return this.loginEntity(
      loginDto,
      this.prisma.coach.findUnique.bind(this.prisma.coach),
      'coach'
    );
  }
}

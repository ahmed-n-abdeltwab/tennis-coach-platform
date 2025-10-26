import { SignupUserDto } from '@app/auth/dto/auth.dto';
import { PrismaService } from '@app/prisma/prisma.service';
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import usersConfig from './config/users.config';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject(usersConfig.KEY) private readonly usersConfiguration: ConfigType<typeof usersConfig>
  ) {}
  async create(signupDto: SignupUserDto): Promise<User> {
    const existingUser: User | null = await this.prisma.user.findUnique({
      where: { email: signupDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate disability logic
    if (signupDto.disability && !signupDto.disabilityCause) {
      throw new BadRequestException('disabilityCause is required when disability is true');
    }

    const passwordHash = await bcrypt.hash(signupDto.password, 10);

    return this.prisma.user.create({
      data: {
        email: signupDto.email,
        name: signupDto.name,
        passwordHash,
        gender: signupDto.gender,
        age: signupDto.age,
        height: signupDto.height,
        weight: signupDto.weight,
        disability: signupDto.disability ?? false,
        disabilityCause: signupDto.disabilityCause,
        country: signupDto.country,
        address: signupDto.address,
        notes: signupDto.notes,
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async validatePassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }

  async updateOnlineStatus(userId: string, isOnline: boolean): Promise<User> {
    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: { isOnline },
    });
  }

  async updateProfile(id: string, updateDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateDto,
      select: {
        id: true,
        email: true,
        name: true,
        gender: true,
        age: true,
        height: true,
        weight: true,
        disability: true,
        country: true,
        address: true,
        notes: true,
      },
    });
  }
}

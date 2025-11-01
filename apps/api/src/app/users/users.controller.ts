import { JwtPayload } from '@auth-helpers/common';
import { CurrentUser, Roles } from '@common';
import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UpdateUserDto, UserApiResponses } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user profile' })
  @UserApiResponses.Found('User profile retrieved successfully')
  async getProfile(@CurrentUser() user: JwtPayload) {
    return this.usersService.findById(user.sub);
  }

  @Put('profile')
  @Roles(UserRole.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @UserApiResponses.Updated('User profile updated successfully')
  async updateProfile(@Body() updateDto: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.updateProfile(user.sub, updateDto);
  }
}

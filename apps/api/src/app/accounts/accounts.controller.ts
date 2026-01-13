import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { ApiResponses } from '../../common';
import { Auth } from '../iam/authentication/decorators/auth.decorator';
import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { AuthType } from '../iam/authentication/enums/auth-type.enum';
import { Roles } from '../iam/authorization/decorators/roles.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import { AccountsService } from './accounts.service';
import {
  AccountResponseDto,
  BulkProfileUpdateDto,
  ProfileCompletenessDto,
  ProfileValidationDto,
  RoleSpecificFieldsDto,
  UpdateAccountDto,
  UpdateRoleDto,
  UploadProfileImageUrlDto,
} from './dto/account.dto';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.COACH)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all accounts (admin only)' })
  @(ApiResponses.for(AccountResponseDto).FoundMany('Accounts retrieved successfully'))
  async findAll(): Promise<AccountResponseDto[]> {
    // Return all accounts for admin
    return this.accountsService.findUsers();
  }

  @Get('coaches')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Get all coaches (public)' })
  @(ApiResponses.for(AccountResponseDto).FoundMany('Coaches retrieved successfully'))
  async findCoaches(): Promise<AccountResponseDto[]> {
    return this.accountsService.findCoaches();
  }

  @Get('coaches/:id')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Get coach by ID (public)' })
  @(ApiResponses.for(AccountResponseDto).Found('Coach retrieved successfully'))
  async findCoachById(@Param('id') id: string): Promise<AccountResponseDto> {
    return this.accountsService.findCoachById(id);
  }

  @Get('me')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user account' })
  @(ApiResponses.for(AccountResponseDto).Found('Account retrieved successfully'))
  async getMe(@CurrentUser() user: JwtPayload): Promise<AccountResponseDto> {
    return this.accountsService.findById(user.sub);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get account by ID' })
  @(ApiResponses.for(AccountResponseDto).Found('Account retrieved successfully'))
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AccountResponseDto> {
    // Users can only view their own account unless they're admin
    const accountId = user.role === Role.ADMIN ? id : user.sub;
    return this.accountsService.findById(accountId);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update account' })
  @(ApiResponses.for(AccountResponseDto).PartiallyUpdated('Account updated successfully'))
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AccountResponseDto> {
    // Users can only update their own account unless they're admin
    const accountId = user.role === Role.ADMIN ? id : user.sub;
    return this.accountsService.update(accountId, updateDto);
  }

  @Patch(':id/role')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update account role (admin only)' })
  @(ApiResponses.for(AccountResponseDto).PartiallyUpdated('Account role updated successfully'))
  async updateRole(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AccountResponseDto> {
    // Prevent admin from changing their own role
    if (id === user.sub) {
      throw new BadRequestException('Cannot change your own role');
    }
    return this.accountsService.updateRole(id, updateRoleDto.role);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.COACH)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete account (admin only)' })
  @(ApiResponses.for(AccountResponseDto).NoContent('Account deleted successfully'))
  async delete(@Param('id') id: string): Promise<void> {
    return this.accountsService.delete(id);
  }

  @Get(':id/profile/completeness')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Check profile completeness' })
  @(ApiResponses.for(ProfileCompletenessDto).Found('Profile completeness retrieved successfully'))
  async checkProfileCompleteness(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<ProfileCompletenessDto> {
    // Users can only check their own profile unless they're admin
    const accountId = user.role === Role.ADMIN ? id : user.sub;
    return this.accountsService.checkProfileCompleteness(accountId);
  }

  @Patch(':id/profile/bulk-update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bulk update profile with missing information' })
  @(ApiResponses.for(AccountResponseDto).PartiallyUpdated('Profile updated successfully'))
  async bulkUpdateProfile(
    @Param('id') id: string,
    @Body() updateDto: BulkProfileUpdateDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AccountResponseDto> {
    // Users can only update their own profile unless they're admin
    const accountId = user.role === Role.ADMIN ? id : user.sub;
    return this.accountsService.bulkUpdateProfile(accountId, updateDto);
  }

  @Post(':id/profile/validate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate profile fields based on role' })
  @(ApiResponses.for(ProfileValidationDto).Created('Profile fields validated successfully'))
  async validateProfileFields(
    @Param('id') id: string,
    @Body() data: Record<string, unknown>,
    @CurrentUser() user: JwtPayload
  ): Promise<ProfileValidationDto> {
    // Users can only validate their own profile unless they're admin
    const accountId = user.role === Role.ADMIN ? id : user.sub;
    return this.accountsService.validateProfileFields(accountId, data);
  }

  @Post(':id/profile/upload-image')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Upload profile image' })
  @(ApiResponses.for(AccountResponseDto).PartiallyUpdated('Profile image updated successfully'))
  async uploadProfileImage(
    @Param('id') id: string,
    @Body() uploadDto: UploadProfileImageUrlDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AccountResponseDto> {
    // Users can only update their own profile image unless they're admin
    const accountId = user.role === Role.ADMIN ? id : user.sub;
    return this.accountsService.updateProfileImage(accountId, uploadDto.imageUrl);
  }

  @Get('role/:role/fields')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get role-specific field requirements' })
  @(ApiResponses.for(RoleSpecificFieldsDto).Found('Role-specific fields retrieved successfully'))
  async getRoleSpecificFields(@Param('role') role: Role): Promise<RoleSpecificFieldsDto> {
    return this.accountsService.getRoleSpecificFields(role);
  }
}

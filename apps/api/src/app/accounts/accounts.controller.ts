import { CurrentUser, JwtPayload, Roles } from '@common';
import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { AccountsService } from './accounts.service';
import { AccountApiResponses, AccountResponseDto, UpdateAccountDto } from './dto/account.dto';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.COACH)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all accounts (admin only)' })
  @AccountApiResponses.FoundMany('Accounts retrieved successfully')
  async findAll(): Promise<AccountResponseDto[]> {
    // Return all accounts for admin
    return this.accountsService.findUsers({});
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user account' })
  @AccountApiResponses.Found('Account retrieved successfully')
  async getMe(@CurrentUser() user: JwtPayload): Promise<AccountResponseDto> {
    return this.accountsService.findById(user.sub);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get account by ID' })
  @AccountApiResponses.Found('Account retrieved successfully')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AccountResponseDto> {
    // Users can only view their own account unless they're admin
    const accountId = user.role === Role.ADMIN ? id : user.sub;
    return this.accountsService.findById(accountId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update account' })
  @AccountApiResponses.Updated('Account updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AccountResponseDto> {
    // Users can only update their own account unless they're admin
    const accountId = user.role === Role.ADMIN ? id : user.sub;
    return this.accountsService.update(accountId, updateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete account (admin only)' })
  @AccountApiResponses.Deleted('Account deleted successfully')
  async delete(@Param('id') id: string): Promise<AccountResponseDto> {
    return this.accountsService.delete(id);
  }
}

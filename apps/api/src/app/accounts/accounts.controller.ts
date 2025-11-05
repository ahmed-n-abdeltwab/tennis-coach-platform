import { JwtPayload } from '@auth-helpers';
import { CurrentUser, Roles } from '@common';
import { Body, Controller, Delete, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AccountsService } from './accounts.service';
import { AccountApiResponses, UpdateAccountDto } from './dto/account.dto';

@ApiTags('accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all accounts (admin only)' })
  @AccountApiResponses.Found('Accounts retrieved successfully')
  async findAll() {
    // Return all accounts for admin
    return this.accountsService.findUsers({});
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user account' })
  @AccountApiResponses.Found('Account retrieved successfully')
  async getMe(@CurrentUser() user: JwtPayload) {
    return this.accountsService.findById(user.sub);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get account by ID' })
  @AccountApiResponses.Found('Account retrieved successfully')
  async findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    // Users can only view their own account unless they're admin
    if (user.role !== Role.ADMIN && user.sub !== id) {
      return this.accountsService.findById(user.sub);
    }
    return this.accountsService.findById(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update account' })
  @AccountApiResponses.Updated('Account updated successfully')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountDto,
    @CurrentUser() user: JwtPayload
  ) {
    // Users can only update their own account unless they're admin
    const accountId = user.role === Role.ADMIN ? id : user.sub;
    return this.accountsService.update(accountId, updateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete account (admin only)' })
  @AccountApiResponses.Deleted('Account deleted successfully')
  async delete(@Param('id') id: string) {
    return this.accountsService.delete(id);
  }
}

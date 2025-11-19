import { CurrentUser, Roles } from '@common';
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { DiscountsService } from './discounts.service';
import {
  CreateDiscountDto,
  DiscountApiResponses,
  DiscountResponseDto,
  UpdateDiscountDto,
  ValidateDiscountApiResponses,
  ValidateDiscountDto,
  ValidateDiscountResponseDto,
} from './dto/discount.dto';

@ApiTags('discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post('validate')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Validate discount code' })
  @ValidateDiscountApiResponses.Found('Discount code validated successfully')
  async validate(@Body() validateDto: ValidateDiscountDto): Promise<ValidateDiscountResponseDto> {
    return this.discountsService.validateCode(validateDto.code);
  }

  @Get('coach')
  @Roles(Role.ADMIN, Role.COACH)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all discounts for the authenticated coach (only coach)' })
  @DiscountApiResponses.FoundMany('Coach discounts retrieved successfully')
  async findByCoach(@CurrentUser('sub') id: string): Promise<DiscountResponseDto[]> {
    return this.discountsService.findByCoach(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.COACH)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new discount code' })
  @DiscountApiResponses.Created('Discount created successfully')
  async create(
    @Body() createDto: CreateDiscountDto,
    @CurrentUser('sub') id: string
  ): Promise<DiscountResponseDto> {
    return this.discountsService.create(createDto, id);
  }

  @Put(':code')
  @Roles(Role.ADMIN, Role.COACH)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an existing discount code' })
  @DiscountApiResponses.Updated('Discount updated successfully')
  async update(
    @Param('code') code: string,
    @Body() updateDto: UpdateDiscountDto,
    @CurrentUser('sub') id: string
  ): Promise<DiscountResponseDto> {
    return this.discountsService.update(code, updateDto, id);
  }

  @Delete(':code')
  @Roles(Role.ADMIN, Role.COACH)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a discount code' })
  @DiscountApiResponses.NoContent('Discount deleted successfully')
  async remove(@Param('code') code: string, @CurrentUser('sub') id: string): Promise<void> {
    return this.discountsService.remove(code, id);
  }
}

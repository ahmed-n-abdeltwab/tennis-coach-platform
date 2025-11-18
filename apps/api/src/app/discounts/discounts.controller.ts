import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common';
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate discount code' })
  @ValidateDiscountApiResponses.Found('Discount code validated successfully')
  async validate(@Body() validateDto: ValidateDiscountDto): Promise<ValidateDiscountResponseDto> {
    return this.discountsService.validateCode(validateDto.code);
  }

  @Get('coach')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all discounts for the authenticated coach' })
  @DiscountApiResponses.FoundMany('Coach discounts retrieved successfully')
  async findByCoach(@CurrentUser('sub') id: string): Promise<DiscountResponseDto[]> {
    return this.discountsService.findByCoach(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new discount code' })
  @DiscountApiResponses.Created('Discount created successfully')
  async create(
    @Body() createDto: CreateDiscountDto,
    @CurrentUser('sub') id: string
  ): Promise<DiscountResponseDto> {
    return this.discountsService.create(createDto, id);
  }

  @Put(':code')
  @ApiBearerAuth()
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a discount code' })
  @DiscountApiResponses.NoContent('Discount deleted successfully')
  async remove(@Param('code') code: string, @CurrentUser('sub') id: string): Promise<void> {
    return this.discountsService.remove(code, id);
  }
}

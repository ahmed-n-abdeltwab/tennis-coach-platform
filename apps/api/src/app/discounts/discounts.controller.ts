import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common';
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
  @ValidateDiscountApiResponses.Created('Validate discount code Successfully')
  async validate(@Body() validateDto: ValidateDiscountDto): Promise<ValidateDiscountResponseDto> {
    return this.discountsService.validateCode(validateDto.code);
  }

  @Get('coach')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coach discounts' })
  @DiscountApiResponses.FoundMany()
  async findByCoach(@CurrentUser('sub') id: string): Promise<DiscountResponseDto[]> {
    return this.discountsService.findByCoach(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create discount (coach only)' })
  @DiscountApiResponses.Created('Discounts successfully Created')
  async create(
    @Body() createDto: CreateDiscountDto,
    @CurrentUser('sub') id: string
  ): Promise<DiscountResponseDto> {
    return this.discountsService.create(createDto, id);
  }

  @Put(':code')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update discount (coach only)' })
  @DiscountApiResponses.Updated('Discounts successfully Updated')
  async update(
    @Param('code') code: string,
    @Body() updateDto: UpdateDiscountDto,
    @CurrentUser('sub') id: string
  ): Promise<DiscountResponseDto> {
    return this.discountsService.update(code, updateDto, id);
  }

  @Delete(':code')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete discount (coach only)' })
  @DiscountApiResponses.Deleted('Discounts successfully Deleted')
  async remove(
    @Param('code') code: string,
    @CurrentUser('sub') id: string
  ): Promise<DiscountResponseDto> {
    return this.discountsService.remove(code, id);
  }
}

import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { DiscountsService } from './discounts.service';
import { CreateDiscountDto, UpdateDiscountDto, ValidateDiscountDto } from './dto/discount.dto';

@ApiTags('discounts')
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validate discount code' })
  async validate(@Body() validateDto: ValidateDiscountDto) {
    return this.discountsService.validateCode(validateDto.code);
  }

  @Get('coach')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get coach discounts' })
  async findByCoach(@Request() req) {
    return this.discountsService.findByCoach(req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create discount (coach only)' })
  async create(@Body() createDto: CreateDiscountDto, @Request() req) {
    return this.discountsService.create(createDto, req.user.id);
  }

  @Put(':code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update discount (coach only)' })
  async update(@Param('code') code: string, @Body() updateDto: UpdateDiscountDto, @Request() req) {
    return this.discountsService.update(code, updateDto, req.user.id);
  }

  @Delete(':code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete discount (coach only)' })
  async remove(@Param('code') code: string, @Request() req) {
    return this.discountsService.remove(code, req.user.id);
  }
}

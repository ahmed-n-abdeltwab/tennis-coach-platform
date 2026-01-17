import { ApiResponses } from '@common';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../iam/authentication/decorators/current-user.decorator';
import { JwtPayload } from '../iam/interfaces/jwt.types';

import { CustomServicesService } from './custom-services.service';
import {
  CreateCustomServiceDto,
  CustomServiceResponseDto,
  GetCustomServicesQuery,
  SendCustomServiceDto,
  SendCustomServiceResponseDto,
  UpdateCustomServiceDto,
} from './dto/custom-service.dto';

@ApiTags('custom-services')
@Controller('custom-services')
export class CustomServicesController {
  constructor(private readonly customServicesService: CustomServicesService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new custom service' })
  @(ApiResponses.for(CustomServiceResponseDto).Created('Custom service created successfully'))
  async create(
    @Body() createDto: CreateCustomServiceDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CustomServiceResponseDto> {
    return this.customServicesService.create(createDto, user.sub, user.role);
  }

  @Get()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all custom services' })
  @(ApiResponses.for(CustomServiceResponseDto).FoundMany('Custom services retrieved successfully'))
  async findAll(
    @Query() query: GetCustomServicesQuery,
    @CurrentUser() user: JwtPayload
  ): Promise<CustomServiceResponseDto[]> {
    return this.customServicesService.findAll(query, user.sub, user.role);
  }

  @Get(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a custom service by ID' })
  @(ApiResponses.for(CustomServiceResponseDto).Found('Custom service retrieved successfully'))
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CustomServiceResponseDto> {
    return this.customServicesService.findOne(id, user.sub, user.role);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a custom service' })
  @(ApiResponses.for(CustomServiceResponseDto).PartiallyUpdated(
    'Custom service updated successfully'
  ))
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomServiceDto,
    @CurrentUser() user: JwtPayload
  ): Promise<CustomServiceResponseDto> {
    return this.customServicesService.update(id, updateDto, user.sub, user.role);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a custom service' })
  @(ApiResponses.for(CustomServiceResponseDto).NoContent('Custom service deleted successfully'))
  async remove(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.customServicesService.remove(id, user.sub, user.role);
  }

  @Post(':id/save-as-template')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Save custom service as template' })
  @(ApiResponses.for(CustomServiceResponseDto).PartiallyUpdated(
    'Custom service saved as template successfully'
  ))
  async saveAsTemplate(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<CustomServiceResponseDto> {
    return this.customServicesService.saveAsTemplate(id, user.sub, user.role);
  }

  @Post(':id/send-to-user')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Send custom service to a user' })
  @(ApiResponses.for(SendCustomServiceResponseDto).Created(
    'Custom service sent to user successfully'
  ))
  async sendToUser(
    @Param('id') id: string,
    @Body() sendDto: SendCustomServiceDto,
    @CurrentUser() user: JwtPayload
  ): Promise<SendCustomServiceResponseDto> {
    return this.customServicesService.sendToUser(id, sendDto, user.sub, user.role);
  }
}

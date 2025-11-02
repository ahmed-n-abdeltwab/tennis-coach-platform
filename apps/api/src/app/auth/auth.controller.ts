
import { JwtPayload } from '@auth-helpers';
import {
  CurrentUser,
  ErrorResponseDto,
  JwtRefreshGuard,
  LocalCoachAuthGuard,
  LocalUserAuthGuard,
  Public,
  Roles,
} from '@common';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminRole } from '@prisma/client';

import { AuthService } from './auth.service';
import { AuthResponseDto, LoginDto , SignupCoachDto, SignupUserDto } from './dto/auth.dto';
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('user/signup')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  async userSignup(@Body() signupDto: SignupUserDto): Promise<AuthResponseDto> {
    return this.authService.signupUser(signupDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalUserAuthGuard)
  @Post('user/login')
  @ApiOperation({ summary: 'User login' })
  @ApiOkResponse({
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async userLogin(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.loginUser(loginDto);
  }

  // Coach endpoints
  @Public()
  @Post('coach/signup')
  @Roles(AdminRole.ADMIN)
  @ApiOperation({ summary: 'Register a new coach account' })
  @ApiCreatedResponse({
    description: 'Coach successfully registered',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  async coachSignup(@Body() signupDto: SignupCoachDto): Promise<AuthResponseDto> {
    return this.authService.signupCoach(signupDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalCoachAuthGuard)
  @Post('coach/login')
  @ApiOperation({ summary: 'Coach login' })
  @ApiOkResponse({
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
    type: ErrorResponseDto,
  })
  async coachLogin(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.loginCoach(loginDto);
  }

  // Shared endpoints
  @Public()
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiOkResponse({
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired refresh token' })
  async refresh(@CurrentUser() user: JwtPayload): Promise<{ accessToken: string }> {
    return this.authService.refreshToken(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout and invalidate refresh tokens' })
  @ApiOkResponse({ description: 'Logout successful' })
  async logout(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    await this.authService.logout(user);
    return { message: 'Logged out successfully' };
  }
}

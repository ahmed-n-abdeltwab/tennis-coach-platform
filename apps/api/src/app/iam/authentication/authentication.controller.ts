import { JwtPayload, Roles } from '@common';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { CurrentUser, JwtRefreshGuard } from '../../../common';

import { AuthenticationService } from './authentication.service';
import { Auth } from './decorators/auth.decorator';
import {
  AuthApiResponses,
  AuthResponseDto,
  LoginDto,
  LogoutResponseDto,
  RefreshApiResponses,
  RefreshResponseDto,
  SignUpDto,
} from './dto';
import { AuthType } from './enums/auth-type.enum';

@Controller('authentication')
export class AuthenticationController {
  constructor(private authenticationService: AuthenticationService) {}

  @Post('signup')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Register a new user account' })
  @AuthApiResponses.Created('User successfully registered')
  async signup(@Body() signupDto: SignUpDto): Promise<AuthResponseDto> {
    return this.authenticationService.signup(signupDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('user/login')
  @Auth(AuthType.None)
  @Roles(Role.USER, Role.PREMIUM_USER)
  @ApiOperation({ summary: 'User login' })
  @AuthApiResponses.Found('User successfully Login')
  async userLogin(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authenticationService.loginUser(loginDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('coach/login')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Coach login' })
  @AuthApiResponses.Found('Coach successfully Login')
  async coachLogin(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authenticationService.loginCoach(loginDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @Auth(AuthType.None)
  @ApiOperation({ summary: 'Universal login endpoint for all account types' })
  @AuthApiResponses.Found('Login successfully')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authenticationService.login(loginDto);
  }

  // Shared endpoints
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @RefreshApiResponses.AuthSuccess('Token refreshed successfully')
  async refresh(@CurrentUser() user: JwtPayload): Promise<RefreshResponseDto> {
    return this.authenticationService.refreshToken(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout and invalidate refresh tokens' })
  @ApiOkResponse({
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  async logout(@CurrentUser() user: JwtPayload): Promise<LogoutResponseDto> {
    await this.authenticationService.logout(user);
    return { message: 'Logged out successfully' };
  }
}

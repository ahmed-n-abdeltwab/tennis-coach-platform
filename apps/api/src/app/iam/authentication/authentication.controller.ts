import { JwtPayload } from '@common';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';

import { CurrentUser } from '@common';

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
import { JwtRefreshGuard } from './guards/jwt-refresh/jwt-refresh.guard';

@Controller('authentication')
export class AuthenticationController {
  constructor(private authenticationService: AuthenticationService) {}

  @Auth(AuthType.None)
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user account' })
  @AuthApiResponses.Created('User successfully registered')
  async signup(@Body() signupDto: SignUpDto): Promise<AuthResponseDto> {
    return this.authenticationService.signup(signupDto);
  }

  @Auth(AuthType.None)
  @Post('login')
  @ApiOperation({ summary: 'Universal login endpoint for all account types' })
  @AuthApiResponses.Found('Login successfully')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authenticationService.login(loginDto);
  }

  // Shared endpoints
  @HttpCode(HttpStatus.OK)
  @Auth(AuthType.None)
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @RefreshApiResponses.AuthSuccess('Token refreshed successfully')
  async refresh(@CurrentUser() user: JwtPayload): Promise<RefreshResponseDto> {
    return this.authenticationService.refreshToken(user);
  }

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

import { ApiResponses } from '@common';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtPayload } from '../interfaces/jwt.types';

import { AuthenticationService } from './authentication.service';
import { Auth } from './decorators/auth.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  AuthResponseDto,
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
  LoginDto,
  LogoutResponseDto,
  RefreshResponseDto,
  ResetPasswordDto,
  ResetPasswordResponseDto,
  SignUpDto,
} from './dto';
import { AuthType } from './enums/auth-type.enum';
import { JwtRefreshGuard } from './guards/jwt-refresh/jwt-refresh.guard';

@ApiTags('authentication')
@Controller('authentication')
export class AuthenticationController {
  constructor(private authenticationService: AuthenticationService) {}

  @Auth(AuthType.None)
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user account' })
  @(ApiResponses.for(AuthResponseDto).Created('User successfully registered'))
  async signup(@Body() signupDto: SignUpDto): Promise<AuthResponseDto> {
    return this.authenticationService.signup(signupDto);
  }

  @Auth(AuthType.None)
  @Post('login')
  @ApiOperation({ summary: 'Universal login endpoint for all account types' })
  @(ApiResponses.for(AuthResponseDto).Found('Login successfully'))
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
  @(ApiResponses.for(RefreshResponseDto).AuthSuccess('Token refreshed successfully'))
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

  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @(ApiResponses.for(ForgotPasswordResponseDto).Found(
    'Password reset email sent if account exists'
  ))
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto
  ): Promise<ForgotPasswordResponseDto> {
    return this.authenticationService.forgotPassword(forgotPasswordDto);
  }

  @Auth(AuthType.None)
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  @(ApiResponses.for(ResetPasswordResponseDto).Found('Password reset successful'))
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto
  ): Promise<ResetPasswordResponseDto> {
    return this.authenticationService.resetPassword(resetPasswordDto);
  }
}

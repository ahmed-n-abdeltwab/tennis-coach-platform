import { JwtPayload } from '@common';
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  CurrentUser,
  ErrorResponseDto,
  JwtRefreshGuard,
  LocalUserAuthGuard,
  Public,
} from '../../../common';
import { AuthenticationService } from './authentication.service';
import { AuthResponseDto, LoginDto, SignUpDto } from './dto';

@Controller('authentication')
export class AuthenticationController {
  constructor(private authenticationService: AuthenticationService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiCreatedResponse({
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data',
    type: ErrorResponseDto,
  })
  async signup(@Body() signupDto: SignUpDto): Promise<AuthResponseDto> {
    return this.authenticationService.signup(signupDto);
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
    return this.authenticationService.loginUser(loginDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('coach/login')
  @ApiOperation({ summary: 'Coach login' })
  @ApiOkResponse({
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async coachLogin(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authenticationService.loginCoach(loginDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Universal login endpoint for all account types' })
  @ApiOkResponse({
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authenticationService.login(loginDto);
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
    return this.authenticationService.refreshToken(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Logout and invalidate refresh tokens' })
  @ApiOkResponse({ description: 'Logout successful' })
  async logout(@CurrentUser() user: JwtPayload): Promise<{ message: string }> {
    await this.authenticationService.logout(user);
    return { message: 'Logged out successfully' };
  }
}

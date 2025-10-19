import { ApiConflictResponse } from '@decorators/api-responses.decorator';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { AuthApiResponses, LoginDto, RegisterDto, UserProfileApiResponses } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @AuthApiResponses.AuthSuccess('User registered successfully')
  @ApiConflictResponse('User already exists')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @AuthApiResponses.AuthSuccess('User logged in successfully')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('coach/register')
  @ApiOperation({ summary: 'Register new coach' })
  @AuthApiResponses.AuthSuccess('Coach registered successfully')
  @ApiConflictResponse('Coach already exists')
  async registerCoach(@Body() registerDto: RegisterDto) {
    return this.authService.registerCoach(registerDto);
  }

  @Public()
  @Post('coach/login')
  @ApiOperation({ summary: 'Login coach' })
  @AuthApiResponses.AuthSuccess('Coach logged in successfully')
  async loginCoach(@Body() loginDto: LoginDto) {
    return this.authService.loginCoach(loginDto);
  }

  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user/coach profile' })
  @UserProfileApiResponses.Found('User profile retrieved successfully')
  async getProfile(@CurrentUser() user: JwtPayload) {
    return user;
  }
}

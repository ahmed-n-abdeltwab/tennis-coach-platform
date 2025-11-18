import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import jwtConfig from '../../../config/jwt.config';
import { REQUEST_USER_KEY } from '../../../iam.constants';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    console.log('[AccessTokenGuard] All headers:', JSON.stringify(request.headers, null, 2));
    console.log('[AccessTokenGuard] Authorization header:', request.headers.authorization);
    console.log('[AccessTokenGuard] Request method:', request.method);
    console.log('[AccessTokenGuard] Request URL:', request.url);
    const token = this.extractTokenFromHeader(request);
    console.log('[AccessTokenGuard] Token extracted:', token ? 'YES' : 'NO');
    if (!token) {
      throw new UnauthorizedException('No token found');
    }
    try {
      const payload = await this.jwtService.verifyAsync(token, this.jwtConfiguration);
      console.log('[AccessTokenGuard] Token verified, payload:', payload);
      request[REQUEST_USER_KEY] = payload;
      console.log('[AccessTokenGuard] User set in request:', request[REQUEST_USER_KEY]);
    } catch (err: any) {
      console.log('[AccessTokenGuard] Token verification failed:', err.message);
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

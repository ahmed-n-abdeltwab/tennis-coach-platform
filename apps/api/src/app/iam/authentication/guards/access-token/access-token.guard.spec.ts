import { JwtService } from '@nestjs/jwt';

import { AccessTokenGuard } from './access-token.guard';

describe('AccessTokenGuard', () => {
  it('should be defined', () => {
    const mockJwtService = {} as JwtService;
    const mockJwtConfig = {
      secret: 'test-secret',
      signOptions: {
        issuer: 'test-issuer',
        audience: 'test-audience',
        expiresIn: 900,
      },
      global: true,
    };

    expect(new AccessTokenGuard(mockJwtService, mockJwtConfig)).toBeDefined();
  });
});

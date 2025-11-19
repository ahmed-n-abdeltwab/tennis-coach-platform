import { JwtService } from '@nestjs/jwt';

import { AccessTokenGuard } from './access-token.guard';

describe('AccessTokenGuard', () => {
  it('should be defined', () => {
    expect(new AccessTokenGuard(JwtService,)).toBeDefined();
  });
});

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { JwtPayload } from './../../interfaces/jwt.types';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    return data ? user?.[data] : user;
  }
);

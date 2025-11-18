import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { REQUEST_USER_KEY } from '../../iam.constants';
import { JwtPayload } from './../../interfaces/jwt.types';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request[REQUEST_USER_KEY];

    return data ? user?.[data] : user;
  }
);

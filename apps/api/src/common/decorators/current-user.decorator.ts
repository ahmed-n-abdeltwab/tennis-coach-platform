import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { JwtPayload } from '../../app/iam/interfaces/jwt.types';

/**
 * Parameter decorator that extracts the authenticated user from the request.
 *
 * @param data - Optional property key to extract a specific field from the user payload
 * @returns The full JwtPayload or a specific property if data is provided
 *
 * @example
 * // Get the full user payload
 * @Get()
 * findAll(@CurrentUser() user: JwtPayload) {
 *   return this.service.findAll(user.sub);
 * }
 *
 * @example
 * // Get a specific property
 * @Get()
 * findAll(@CurrentUser('sub') userId: string) {
 *   return this.service.findAll(userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    return data ? user?.[data] : user;
  }
);

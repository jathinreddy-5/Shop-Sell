import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserPayload } from '@shop-sell/shared';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  }
);

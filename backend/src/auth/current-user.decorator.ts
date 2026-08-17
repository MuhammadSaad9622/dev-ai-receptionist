import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from './jwt.strategy';

// Every controller reads the caller's org off the JWT-resolved user, never
// from a client-supplied orgId — that's what makes cross-tenant leakage
// structurally hard rather than "please remember to filter."
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);

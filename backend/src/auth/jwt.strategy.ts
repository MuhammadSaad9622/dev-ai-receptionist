import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'TECHNICIAN';
  authUserId: string;
  email: string;
}

// Verifies the Supabase Auth JWT (HS256, signed with the project's JWT
// secret) and resolves it to our own User row so downstream guards/handlers
// get org + role, not just the raw Supabase claims.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('SUPABASE_JWT_SECRET'),
    });
  }

  async validate(payload: {
    sub: string;
    email?: string;
  }): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { authUserId: payload.sub },
    });

    if (!user) {
      // A valid Supabase session for someone with no app-side profile yet
      // (e.g. mid-onboarding) is still unauthorized against our resources.
      throw new UnauthorizedException(
        'No organization membership for this account',
      );
    }

    return {
      id: user.id,
      organizationId: user.organizationId,
      role: user.role,
      authUserId: user.authUserId,
      email: user.email,
    };
  }
}

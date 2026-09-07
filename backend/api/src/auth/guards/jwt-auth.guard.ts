import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = process.env.JWT_SECRET || 'fallback-secret-key-siva-rudra-foundation-2026';

    // 1. First priority: Explicit Authorization Header (Bearer token from client)
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7).trim();
      if (bearerToken) {
        try {
          const payload = await this.jwtService.verifyAsync(bearerToken, { secret });
          (request as any).user = payload;
          return true;
        } catch (err) {
          // Token expired or invalid, fallback to cookies below
        }
      }
    }

    // 2. Second priority: access_token cookie
    if (request.cookies && request.cookies.access_token) {
      try {
        const cookiePayload = await this.jwtService.verifyAsync(request.cookies.access_token, { secret });
        (request as any).user = cookiePayload;
        return true;
      } catch (err) {
        // Access token cookie expired, check refresh_token
      }
    }

    // 3. Third priority: refresh_token cookie fallback
    if (request.cookies && request.cookies.refresh_token) {
      try {
        const refreshPayload = await this.jwtService.verifyAsync(request.cookies.refresh_token, { secret });
        (request as any).user = refreshPayload;
        return true;
      } catch (err) {
        // All token sources expired
      }
    }

    throw new UnauthorizedException('Authentication token missing or expired.');
  }
}

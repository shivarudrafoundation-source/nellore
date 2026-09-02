import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = process.env.JWT_SECRET || 'fallback-secret-key-siva-rudra-foundation-2026';

    const token = this.extractToken(request);

    if (token) {
      try {
        const payload = await this.jwtService.verifyAsync(token, { secret });
        (request as any).user = payload;
        return true;
      } catch (error) {
        // Access token might be expired, fallback to refresh token below
      }
    }

    // Seamless Fallback: Check if valid refresh_token exists
    if (request.cookies && request.cookies.refresh_token) {
      try {
        const refreshPayload = await this.jwtService.verifyAsync(request.cookies.refresh_token, { secret });
        (request as any).user = refreshPayload;
        return true;
      } catch (err) {
        // Both tokens expired
      }
    }

    throw new UnauthorizedException('Authentication token missing.');
  }

  private extractToken(request: Request): string | null {
    // 1. Check access_token cookie
    if (request.cookies && request.cookies.access_token) {
      return request.cookies.access_token;
    }
    // 2. Fallback to Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}

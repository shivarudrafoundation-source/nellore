import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token missing.');
    }

    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key-siva-rudra-foundation-2026';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      // Inject user payload into the request object
      (request as any).user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired authentication token.');
    }
  }

  private extractToken(request: Request): string | null {
    // Check cookies
    if (request.cookies && request.cookies.access_token) {
      return request.cookies.access_token;
    }
    // Fallback to Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }
}

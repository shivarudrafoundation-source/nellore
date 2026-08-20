import { Injectable, HttpException, HttpStatus, UnauthorizedException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

interface OtpData {
  hashedOtp: string | null;
  expiresAt: Date | null;
  requestTimestamps: number[];
  failedAttempts: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  // Key format: "identifier:eventId" (identifier can be normalized mobile or lowercase email)
  private otpCache = new Map<string, OtpData>();

  /**
   * Generates, hashes, and stores a 5-minute OTP for an identifier (email or mobile).
   * Enforces a rate limit of 5 requests per hour.
   */
  async generateOtp(identifier: string, eventId: string): Promise<string> {
    const key = `${identifier.toLowerCase().trim()}:${eventId}`;
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    let cached = this.otpCache.get(key);
    if (!cached) {
      cached = { hashedOtp: null, expiresAt: null, requestTimestamps: [], failedAttempts: 0 };
    }

    // Filter out requests older than 1 hour
    cached.requestTimestamps = cached.requestTimestamps.filter((ts) => ts > oneHourAgo);

    if (cached.requestTimestamps.length >= 5) {
      this.logger.warn(`Rate limit exceeded for OTP request on ${this.maskIdentifier(identifier)}`);
      throw new HttpException('Rate limit exceeded. Maximum 5 OTP requests per hour.', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Generate a secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(now + 5 * 60 * 1000); // 5 minutes

    // Add current timestamp to rate-limiting tracker
    cached.requestTimestamps.push(now);
    cached.hashedOtp = hashedOtp;
    cached.expiresAt = expiresAt;
    cached.failedAttempts = 0;

    this.otpCache.set(key, cached);

    this.logger.log(`OTP generated successfully for identifier: ${this.maskIdentifier(identifier)}`);

    return otp;
  }

  /**
   * Verifies the OTP, checks expiry, limits brute force, and prevents reuse.
   */
  async verifyOtp(identifier: string, eventId: string, otp: string): Promise<boolean> {
    const key = `${identifier.toLowerCase().trim()}:${eventId}`;
    const cached = this.otpCache.get(key);

    if (!cached || !cached.hashedOtp || !cached.expiresAt) {
      throw new UnauthorizedException('No active OTP request found.');
    }

    if (new Date() > cached.expiresAt) {
      cached.hashedOtp = null;
      cached.expiresAt = null;
      throw new UnauthorizedException('OTP has expired.');
    }

    if (cached.failedAttempts >= 5) {
      cached.hashedOtp = null;
      cached.expiresAt = null;
      throw new UnauthorizedException('Too many invalid attempts. OTP invalidated.');
    }

    const isValid = await bcrypt.compare(otp.trim(), cached.hashedOtp);
    if (!isValid) {
      cached.failedAttempts += 1;
      throw new UnauthorizedException('Invalid OTP code.');
    }

    // Consume the OTP so it cannot be reused, but preserve rate limit history
    cached.hashedOtp = null;
    cached.expiresAt = null;
    cached.failedAttempts = 0;
    this.otpCache.set(key, cached);

    return true;
  }

  private maskIdentifier(id: string): string {
    if (id.includes('@')) {
      const [user, domain] = id.split('@');
      return `${user.slice(0, 2)}***@${domain}`;
    }
    return `******${id.slice(-4)}`;
  }
}

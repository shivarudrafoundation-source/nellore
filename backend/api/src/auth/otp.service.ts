import { Injectable, HttpException, HttpStatus, UnauthorizedException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

interface OtpData {
  hashedOtp: string | null;
  expiresAt: Date | null;
  requestTimestamps: number[];
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  // Key format: "mobile:eventId"
  private otpCache = new Map<string, OtpData>();

  /**
   * Generates, hashes, and stores a 5-minute OTP for a mobile number.
   * Enforces a rate limit of 5 requests per hour.
   */
  async generateOtp(mobile: string, eventId: string): Promise<string> {
    const key = `${mobile}:${eventId}`;
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    let cached = this.otpCache.get(key);
    if (!cached) {
      cached = { hashedOtp: null, expiresAt: null, requestTimestamps: [] };
    }

    // Filter out requests older than 1 hour
    cached.requestTimestamps = cached.requestTimestamps.filter((ts) => ts > oneHourAgo);

    if (cached.requestTimestamps.length >= 5) {
      this.logger.warn(`Rate limit exceeded for OTP request on ${mobile}`);
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

    this.otpCache.set(key, cached);

    // In a production app SMS gateway is invoked here
    this.logger.log(`OTP generated successfully for mobile ending with ${mobile.slice(-4)}`);

    return otp;
  }

  /**
   * Verifies the OTP, checks expiry, and prevents reuse.
   */
  async verifyOtp(mobile: string, eventId: string, otp: string): Promise<boolean> {
    const key = `${mobile}:${eventId}`;
    const cached = this.otpCache.get(key);

    if (!cached || !cached.hashedOtp || !cached.expiresAt) {
      throw new UnauthorizedException('No active OTP request found.');
    }

    if (new Date() > cached.expiresAt) {
      throw new UnauthorizedException('OTP has expired.');
    }

    const isValid = await bcrypt.compare(otp, cached.hashedOtp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP code.');
    }

    // Consume the OTP so it cannot be reused, but preserve rate limit history
    cached.hashedOtp = null;
    cached.expiresAt = null;
    this.otpCache.set(key, cached);

    return true;
  }
}

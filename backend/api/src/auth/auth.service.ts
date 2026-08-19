import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { generateSecret, verifySync, generateURI } from 'otplib';
import { DatabaseService } from '../database/database.service.js';
import { OtpService } from './otp.service.js';
import { AuditService } from '../audit/audit.service.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generates a pair of Access and Refresh tokens
   */
  async generateTokens(payload: JwtPayload): Promise<{ accessToken: string; refreshToken: string }> {
    const secret = process.env.JWT_SECRET || 'fallback-secret-key-siva-rudra-foundation-2026';
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Refreshes access and refresh tokens using a valid refresh token
   */
  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key-siva-rudra-foundation-2026';
      const payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, { secret });

      const newPayload: JwtPayload = {
        sub: payload.sub,
        role: payload.role,
        email: payload.email,
        mobile: payload.mobile,
        assignedEventId: payload.assignedEventId,
        assignedCategoryId: payload.assignedCategoryId,
        assignedRoundId: payload.assignedRoundId,
      };

      return this.generateTokens(newPayload);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  /**
   * Authenticate Admin User
   */
  async loginAdmin(
    dto: any,
    ipAddress?: string,
  ): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    const admin = await this.db.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Validate TOTP code only if provided
    if (admin.totpSecret && dto.totpCode) {
      const isValid = verifySync({
        token: dto.totpCode,
        secret: admin.totpSecret,
      }).valid;
      if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA TOTP code.');
      }
    }

    const payload: JwtPayload = {
      sub: admin.id,
      role: 'ADMIN',
      email: admin.email,
    };

    const tokens = await this.generateTokens(payload);

    // Audit Log
    await this.auditService.log({
      actorType: 'ADMIN',
      actorId: admin.id,
      action: 'ADMIN_LOGIN',
      entity: 'AdminUser',
      entityId: admin.id,
      ipAddress,
      after: { email: admin.email, timestamp: new Date().toISOString() },
    });

    return {
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'ADMIN',
        totpEnabled: !!admin.totpSecret,
      },
      tokens,
    };
  }

  /**
   * Generate 2FA setup details for Admin User
   */
  async setupTotp(adminId: string): Promise<{ secret: string; otpauthUrl: string }> {
    const admin = await this.db.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin user not found.');
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'Siva Rudra Foundation',
      label: admin.email,
      secret,
    });

    return { secret, otpauthUrl };
  }

  /**
   * Verify and save the TOTP secret for an Admin
   */
  async verifyAndEnableTotp(adminId: string, secret: string, code: string, ipAddress?: string): Promise<{ success: boolean }> {
    const admin = await this.db.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin user not found.');
    }

    const isValid = verifySync({ token: code, secret }).valid;
    if (!isValid) {
      throw new UnauthorizedException('Invalid TOTP verification code.');
    }

    await this.db.adminUser.update({
      where: { id: adminId },
      data: { totpSecret: secret },
    });

    await this.auditService.log({
      actorType: 'ADMIN',
      actorId: admin.id,
      action: 'PASSWORD_RESET', // Treating MFA setup as a credential adjustment action
      entity: 'AdminUser',
      entityId: admin.id,
      ipAddress,
      after: { mfaEnabled: true },
    });

    return { success: true };
  }

  /**
   * Authenticate Judge User
   */
  async loginJudge(
    dto: any,
    ipAddress?: string,
  ): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    const judge = await this.db.judgeAccount.findUnique({
      where: { email: dto.email },
    });

    if (!judge) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, judge.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!judge.isActive) {
      throw new ForbiddenException('Judge account is disabled. Please contact administrator.');
    }

    // Verify assignment parameters actually exist in database
    const [event, category, round] = await Promise.all([
      this.db.event.findUnique({ where: { id: judge.assignedEventId } }),
      this.db.category.findUnique({ where: { id: judge.assignedCategoryId } }),
      this.db.round.findUnique({ where: { id: judge.assignedRoundId } }),
    ]);

    if (!event || !category || !round) {
      throw new UnauthorizedException('Judge assignments are invalid. Contact administrator.');
    }

    const payload: JwtPayload = {
      sub: judge.id,
      role: 'JUDGE',
      email: judge.email,
      assignedEventId: judge.assignedEventId,
      assignedCategoryId: judge.assignedCategoryId,
      assignedRoundId: judge.assignedRoundId,
    };

    const tokens = await this.generateTokens(payload);

    // Audit Log
    await this.auditService.log({
      actorType: 'JUDGE',
      actorId: judge.id,
      action: 'JUDGE_LOGIN',
      entity: 'JudgeAccount',
      entityId: judge.id,
      ipAddress,
      after: { email: judge.email, timestamp: new Date().toISOString() },
    });

    return {
      user: {
        id: judge.id,
        email: judge.email,
        name: judge.name,
        role: 'JUDGE',
        mustResetPassword: judge.mustResetPassword,
        assignments: {
          eventId: judge.assignedEventId,
          categoryId: judge.assignedCategoryId,
          roundId: judge.assignedRoundId,
        },
      },
      tokens,
    };
  }

  /**
   * Reset Judge password to force clear `mustResetPassword = true`
   */
  async resetJudgePassword(dto: any, ipAddress?: string): Promise<{ success: boolean }> {
    const judge = await this.db.judgeAccount.findUnique({
      where: { email: dto.email },
    });

    if (!judge) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(dto.oldPassword, judge.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    const oldJudgeData = { mustResetPassword: judge.mustResetPassword };

    await this.db.judgeAccount.update({
      where: { email: dto.email },
      data: {
        passwordHash: newPasswordHash,
        mustResetPassword: false,
      },
    });

    await this.auditService.log({
      actorType: 'JUDGE',
      actorId: judge.id,
      action: 'PASSWORD_RESET',
      entity: 'JudgeAccount',
      entityId: judge.id,
      ipAddress,
      before: oldJudgeData,
      after: { mustResetPassword: false },
    });

    return { success: true };
  }

  /**
   * Request an OTP for a Contestant (rate-limited, checks contestant ID + mobile existence)
   */
  async requestContestantOtp(dto: any, ipAddress?: string): Promise<{ message: string }> {
    const rawMobile = String(dto.mobile || '').trim();
    const normalizedMobile = rawMobile.replace(/\D/g, '').slice(-10);

    if (!normalizedMobile || normalizedMobile.length !== 10) {
      throw new UnauthorizedException('Please enter a valid 10-digit registered mobile number.');
    }

    const whereClause: any = { mobile: normalizedMobile };
    if (dto.contestantId && typeof dto.contestantId === 'string' && dto.contestantId.trim()) {
      whereClause.id = { equals: dto.contestantId.trim(), mode: 'insensitive' };
    }

    const contestant = await this.db.contestant.findFirst({
      where: whereClause,
      include: {
        registration: true,
      },
    });

    if (!contestant) {
      throw new UnauthorizedException('Contestant ID or registered mobile number not found.');
    }

    await this.otpService.generateOtp(normalizedMobile, contestant.id);

    await this.auditService.log({
      actorType: 'CONTESTANT',
      actorId: contestant.id,
      action: 'OTP_VERIFIED',
      entity: 'Contestant',
      entityId: contestant.id,
      ipAddress,
      after: { mobileMasked: `******${normalizedMobile.slice(-4)}` },
    });

    return {
      message: 'Secure 6-digit OTP has been dispatched to your registered mobile number.',
    };
  }

  /**
   * Verify OTP and log in the Contestant
   */
  async verifyContestantOtp(
    dto: any,
    ipAddress?: string,
  ): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    const rawMobile = String(dto.mobile || '').trim();
    const normalizedMobile = rawMobile.replace(/\D/g, '').slice(-10);

    if (!normalizedMobile || normalizedMobile.length !== 10) {
      throw new UnauthorizedException('Please enter a valid 10-digit registered mobile number.');
    }

    const whereClause: any = { mobile: normalizedMobile };
    if (dto.contestantId && typeof dto.contestantId === 'string' && dto.contestantId.trim()) {
      whereClause.id = { equals: dto.contestantId.trim(), mode: 'insensitive' };
    }

    const contestant = await this.db.contestant.findFirst({
      where: whereClause,
      include: {
        registration: {
          include: { category: true, event: true },
        },
      },
    });

    if (!contestant) {
      throw new UnauthorizedException('Contestant details not found.');
    }

    // 1. Verify single-use OTP
    await this.otpService.verifyOtp(normalizedMobile, contestant.id, dto.otp);

    // 2. Generate JWT tokens
    const payload: JwtPayload = {
      sub: contestant.id,
      role: 'CONTESTANT',
      mobile: contestant.mobile,
      eventId: contestant.eventId,
    };

    const tokens = await this.generateTokens(payload);

    // 3. Audit Log for Contestant Login
    await this.auditService.log({
      actorType: 'CONTESTANT',
      actorId: contestant.id,
      action: 'CONTESTANT_LOGIN' as any,
      entity: 'Contestant',
      entityId: contestant.id,
      ipAddress,
      after: {
        contestantId: contestant.id,
        mobileMasked: `******${normalizedMobile.slice(-4)}`,
        eventId: contestant.eventId,
      },
    });

    return {
      user: {
        id: contestant.id,
        mobile: contestant.mobile,
        eventId: contestant.eventId,
        category: contestant.registration?.category?.name,
        categoryCode: contestant.registration?.category?.code,
        role: 'CONTESTANT',
      },
      tokens,
    };
  }
}

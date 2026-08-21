import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { generateSecret, verifySync, generateURI } from 'otplib';
import { DatabaseService } from '../database/database.service.js';
import { OtpService } from './otp.service.js';
import { AuditService } from '../audit/audit.service.js';
import { MailService } from '../mail/mail.service.js';
import { JwtPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly auditService: AuditService,
    private readonly mailService?: MailService,
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

    const otp = await this.otpService.generateOtp(normalizedMobile, contestant.id);

    const regEmail = (contestant.registration?.baseFields as any)?.email;
    if (regEmail && this.mailService) {
      await this.mailService.sendOtpEmail(regEmail, otp, 'Contestant Portal Authorization');
    }

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
      message: 'Secure 6-digit OTP has been dispatched to your registered contact.',
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

  /**
   * Contestant 3-Factor Login: Email + Contestant ID + Password
   */
  async loginContestant(
    dto: { email?: string; contestantId?: string; password?: string },
    ipAddress?: string,
  ): Promise<{ user: any; contestant?: any; tokens: { accessToken: string; refreshToken: string } }> {
    const rawEmail = String(dto.email || '').trim().toLowerCase();
    const rawContestantId = String(dto.contestantId || '').trim();
    const rawPassword = String(dto.password || '').trim();

    if (!rawEmail || !rawContestantId || !rawPassword) {
      throw new UnauthorizedException('Email, Contestant ID, and Password are all required.');
    }

    // 1. Fetch contestant by authoritative Contestant ID
    const contestant = await this.db.contestant.findFirst({
      where: {
        id: { equals: rawContestantId, mode: 'insensitive' },
      },
      include: {
        registration: {
          include: { category: true, event: true },
        },
      },
    });

    if (!contestant || !contestant.registration) {
      throw new UnauthorizedException('Invalid Contestant ID, email, or password.');
    }

    // 2. Validate Contestant Activation State (must be PAID & linked)
    if (
      contestant.registration.paymentStatus !== 'PAID' ||
      contestant.registration.contestantId !== contestant.id
    ) {
      throw new UnauthorizedException('Contestant account is not activated.');
    }

    const baseFields = (contestant.registration.baseFields as any) || {};

    // 3. Validate Disabled State
    if (baseFields.isDisabled === true || baseFields.isActive === false) {
      throw new UnauthorizedException('Contestant account is disabled.');
    }

    // 4. Validate Email matches registration
    const regEmail = String(baseFields.email || '').trim().toLowerCase();
    if (regEmail !== rawEmail) {
      throw new UnauthorizedException('Invalid Contestant ID, email, or password.');
    }

    // 5. Validate Password
    let passwordHash = baseFields.passwordHash;
    if (!passwordHash && baseFields.userId) {
      const userRecord = await this.db.user.findUnique({ where: { id: baseFields.userId } });
      if (userRecord?.passwordHash) {
        passwordHash = userRecord.passwordHash;
      }
    }
    if (!passwordHash && regEmail) {
      const userRecord = await this.db.user.findUnique({ where: { email: regEmail } });
      if (userRecord?.passwordHash) {
        passwordHash = userRecord.passwordHash;
      }
    }

    if (!passwordHash) {
      // If no password set yet, default password is mobile number or require reset
      if (rawPassword !== contestant.mobile) {
        throw new UnauthorizedException('Invalid Contestant ID, email, or password.');
      }
    } else {
      const isPasswordValid = await bcrypt.compare(rawPassword, passwordHash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid Contestant ID, email, or password.');
      }
    }

    // 6. Generate JWT tokens
    const payload: JwtPayload = {
      sub: contestant.id,
      role: 'CONTESTANT',
      mobile: contestant.mobile,
      eventId: contestant.eventId,
    };

    const tokens = await this.generateTokens(payload);

    // 7. Audit Log
    await this.auditService.log({
      actorType: 'CONTESTANT',
      actorId: contestant.id,
      action: 'CONTESTANT_LOGIN' as any,
      entity: 'Contestant',
      entityId: contestant.id,
      ipAddress,
      after: {
        contestantId: contestant.id,
        emailMasked: rawEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)),
        eventId: contestant.eventId,
      },
    });

    const contestantData = {
      id: contestant.id,
      contestantId: contestant.id,
      email: regEmail,
      mobile: contestant.mobile,
      eventId: contestant.eventId,
      category: contestant.registration?.category?.name,
      categoryCode: contestant.registration?.category?.code,
      role: 'CONTESTANT',
    };

    return {
      user: contestantData,
      contestant: contestantData,
      tokens,
    };
  }

  /**
   * Contestant Forgot Password: Request OTP to registered email
   */
  async requestContestantForgotPasswordOtp(
    dto: { email?: string },
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    const rawEmail = String(dto.email || '').trim().toLowerCase();
    if (!rawEmail || !rawEmail.includes('@')) {
      throw new UnauthorizedException('Please enter a valid registered email address.');
    }

    // Find registration with matching email and paid status
    const registration = await this.db.registration.findFirst({
      where: {
        paymentStatus: 'PAID',
        contestantId: { not: null },
        baseFields: {
          path: ['email'],
          string_contains: rawEmail,
        },
      },
      include: { contestant: true },
    });

    if (!registration || !registration.contestant) {
      throw new UnauthorizedException('No active contestant account found with this email address.');
    }

    // Generate 5-minute single-use OTP
    const otp = await this.otpService.generateOtp(rawEmail, 'contestant-forgot-password');

    if (this.mailService) {
      await this.mailService.sendOtpEmail(rawEmail, otp, 'Contestant Password Reset');
    }

    await this.auditService.log({
      actorType: 'CONTESTANT',
      actorId: registration.contestant.id,
      action: 'CONTESTANT_OTP_REQUESTED',
      entity: 'Contestant',
      entityId: registration.contestant.id,
      ipAddress,
      after: { emailMasked: rawEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)) },
    });

    return {
      success: true,
      message: 'A secure 6-digit OTP has been sent to your registered email address.',
    };
  }

  /**
   * Contestant Forgot Password: Verify OTP and Reset Password
   */
  async resetContestantPasswordWithOtp(
    dto: { email?: string; otp?: string; newPassword?: string; confirmPassword?: string },
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    const rawEmail = String(dto.email || '').trim().toLowerCase();
    const rawOtp = String(dto.otp || '').trim();
    const rawNewPassword = String(dto.newPassword || '').trim();

    if (!rawEmail || !rawOtp || !rawNewPassword) {
      throw new UnauthorizedException('Email, OTP, and New Password are required.');
    }

    if (rawNewPassword.length < 8) {
      throw new UnauthorizedException('New password must be at least 8 characters in length.');
    }

    if (dto.confirmPassword && rawNewPassword !== String(dto.confirmPassword).trim()) {
      throw new UnauthorizedException('New password and confirmation password do not match.');
    }

    // 1. Verify single-use OTP
    await this.otpService.verifyOtp(rawEmail, 'contestant-forgot-password', rawOtp);

    // 2. Find registration
    const registration = await this.db.registration.findFirst({
      where: {
        paymentStatus: 'PAID',
        contestantId: { not: null },
        baseFields: {
          path: ['email'],
          string_contains: rawEmail,
        },
      },
      include: { contestant: true },
    });

    if (!registration || !registration.contestant) {
      throw new UnauthorizedException('Contestant account not found.');
    }

    // 3. Hash new password & update registration baseFields
    const newPasswordHash = await bcrypt.hash(rawNewPassword, 10);
    const existingBase = (registration.baseFields as any) || {};

    await this.db.registration.update({
      where: { id: registration.id },
      data: {
        baseFields: {
          ...existingBase,
          passwordHash: newPasswordHash,
        },
      },
    });

    // 4. Audit Log (Never log password or hash)
    await this.auditService.log({
      actorType: 'CONTESTANT',
      actorId: registration.contestant.id,
      action: 'PASSWORD_RESET',
      entity: 'Contestant',
      entityId: registration.contestant.id,
      ipAddress,
      after: {
        passwordReset: true,
        emailMasked: rawEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)),
      },
    });

    return {
      success: true,
      message: 'Your password has been updated successfully. You may now log in.',
    };
  }

  /**
   * Public User Sign-Up Step 1: Request OTP to Email (Validates Name + Email + Duplicate check)
   */
  async requestUserSignupOtp(
    dto: { name?: string; email?: string },
    ipAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    const rawName = String(dto.name || '').trim();
    const rawEmail = String(dto.email || '').trim().toLowerCase();

    if (dto.name !== undefined && (!rawName || rawName.length < 2)) {
      throw new BadRequestException('Please provide your full name (minimum 2 characters).');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    // Check if account already exists
    const existing = await this.db.user.findUnique({
      where: { email: rawEmail },
    });

    if (existing) {
      throw new ConflictException('This email is already registered. Please Sign In.');
    }

    const otp = await this.otpService.generateOtp(rawEmail, 'user-signup');

    if (this.mailService) {
      await this.mailService.sendOtpEmail(rawEmail, otp, 'Website Account Registration');
    }

    await this.auditService.log({
      actorType: 'USER',
      actorId: rawEmail,
      action: 'OTP_REQUESTED' as any,
      entity: 'User',
      ipAddress,
      after: { emailMasked: rawEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)) },
    });

    return {
      success: true,
      message: 'A secure 6-digit OTP has been sent to your email address.',
    };
  }

  /**
   * Public User Sign-Up Step 2: Verify Email OTP & Issue Cryptographically Signed Signup Token (15m expiry)
   */
  async verifySignupOtp(
    dto: { email?: string; otp?: string; name?: string },
    ipAddress?: string,
  ): Promise<{ success: boolean; signupToken: string; message: string }> {
    const rawEmail = String(dto.email || '').trim().toLowerCase();
    const rawOtp = String(dto.otp || '').trim();
    const rawName = String(dto.name || '').trim();

    if (!rawEmail || !rawOtp) {
      throw new BadRequestException('Email and OTP are required.');
    }

    // 1. Verify single-use OTP
    await this.otpService.verifyOtp(rawEmail, 'user-signup', rawOtp);

    // 2. Generate signed short-lived signup verification token (15 minutes)
    const secret = process.env.JWT_SECRET || 'fallback-secret-key-siva-rudra-foundation-2026';
    const signupToken = await this.jwtService.signAsync(
      {
        email: rawEmail,
        name: rawName || undefined,
        purpose: 'signup-verified',
      },
      {
        secret,
        expiresIn: '15m',
      },
    );

    await this.auditService.log({
      actorType: 'USER',
      actorId: rawEmail,
      action: 'OTP_VERIFIED',
      entity: 'User',
      ipAddress,
      after: { emailMasked: rawEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)) },
    });

    return {
      success: true,
      signupToken,
      message: 'Email verified successfully. Please set your password.',
    };
  }

  /**
   * Public User Sign-Up Step 3: Set Password & Create Permanent User Account in PostgreSQL
   */
  async createPermanentUserAccount(
    dto: {
      signupToken?: string;
      password?: string;
      confirmPassword?: string;
      name?: string;
      mobile?: string;
      location?: string;
    },
    ipAddress?: string,
  ): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    const { signupToken } = dto;
    const rawPassword = String(dto.password || '').trim();
    const rawConfirm = dto.confirmPassword !== undefined ? String(dto.confirmPassword).trim() : rawPassword;

    if (!signupToken) {
      throw new UnauthorizedException('Valid signup verification token is required.');
    }

    if (!rawPassword) {
      throw new BadRequestException('Password is required.');
    }

    if (rawPassword !== rawConfirm) {
      throw new BadRequestException('Passwords do not match. Please re-enter.');
    }

    if (rawPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters in length.');
    }

    // Verify signupToken
    let decoded: any;
    try {
      const secret = process.env.JWT_SECRET || 'fallback-secret-key-siva-rudra-foundation-2026';
      decoded = await this.jwtService.verifyAsync(signupToken, { secret });
    } catch (err: any) {
      throw new UnauthorizedException('Verification token has expired or is invalid. Please request a new OTP.');
    }

    if (decoded.purpose !== 'signup-verified' || !decoded.email) {
      throw new UnauthorizedException('Invalid verification token purpose.');
    }

    const rawEmail = String(decoded.email).trim().toLowerCase();
    const userName = String(dto.name || decoded.name || '').trim();

    // Check if user exists (race/duplicate prevention)
    const existing = await this.db.user.findUnique({
      where: { email: rawEmail },
    });

    if (existing) {
      throw new ConflictException('This email is already registered. Please Sign In.');
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await this.db.user.create({
      data: {
        email: rawEmail,
        passwordHash,
        name: userName || null,
        mobile: dto.mobile ? String(dto.mobile).trim() : null,
        location: dto.location ? String(dto.location).trim() : null,
        role: 'USER',
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      role: 'USER',
      email: user.email,
      mobile: user.mobile || undefined,
    };

    const tokens = await this.generateTokens(payload);

    await this.auditService.log({
      actorType: 'USER',
      actorId: user.id,
      action: 'USER_SIGNUP',
      entity: 'User',
      entityId: user.id,
      ipAddress,
      after: {
        userId: user.id,
        emailMasked: rawEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mobile: user.mobile,
        location: user.location,
        role: 'USER',
      },
      tokens,
    };
  }

  /**
   * Legacy Combined Signup Helper (Backward Compatibility)
   */
  async verifyUserSignupAndCreate(
    dto: {
      email?: string;
      otp?: string;
      password?: string;
      name?: string;
      mobile?: string;
      location?: string;
    },
    ipAddress?: string,
  ): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    const rawEmail = String(dto.email || '').trim().toLowerCase();
    const rawOtp = String(dto.otp || '').trim();
    const rawPassword = String(dto.password || '').trim();

    if (!rawEmail || !rawOtp || !rawPassword) {
      throw new BadRequestException('Email, OTP, and password are required.');
    }

    if (rawPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters in length.');
    }

    // 1. Verify single-use OTP
    await this.otpService.verifyOtp(rawEmail, 'user-signup', rawOtp);

    // 2. Check for duplicate account
    const existing = await this.db.user.findUnique({
      where: { email: rawEmail },
    });

    if (existing) {
      throw new ConflictException('This email is already registered. Please Sign In.');
    }

    // 3. Hash password and create User record
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    const user = await this.db.user.create({
      data: {
        email: rawEmail,
        passwordHash,
        name: dto.name ? String(dto.name).trim() : null,
        mobile: dto.mobile ? String(dto.mobile).trim() : null,
        location: dto.location ? String(dto.location).trim() : null,
        role: 'USER',
      },
    });

    // 4. Generate JWT tokens
    const payload: JwtPayload = {
      sub: user.id,
      role: 'USER',
      email: user.email,
      mobile: user.mobile || undefined,
    };

    const tokens = await this.generateTokens(payload);

    // 5. Audit Log
    await this.auditService.log({
      actorType: 'USER',
      actorId: user.id,
      action: 'USER_SIGNUP',
      entity: 'User',
      entityId: user.id,
      ipAddress,
      after: {
        userId: user.id,
        emailMasked: rawEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mobile: user.mobile,
        location: user.location,
        role: 'USER',
      },
      tokens,
    };
  }

  /**
   * Public User Sign-In: Email + Password
   */
  async loginUser(
    dto: { email?: string; password?: string },
    ipAddress?: string,
  ): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
    const rawEmail = String(dto.email || '').trim().toLowerCase();
    const rawPassword = String(dto.password || '').trim();

    if (!rawEmail || !rawPassword) {
      throw new UnauthorizedException('Email and password are required.');
    }

    const user = await this.db.user.findUnique({
      where: { email: rawEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(rawPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: 'USER',
      email: user.email,
      mobile: user.mobile || undefined,
    };

    const tokens = await this.generateTokens(payload);

    await this.auditService.log({
      actorType: 'USER',
      actorId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress,
      after: {
        userId: user.id,
        emailMasked: rawEmail.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mobile: user.mobile,
        location: user.location,
        role: 'USER',
      },
      tokens,
    };
  }

  /**
   * Get User Profile & My Events
   */
  async getUserProfile(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found.');
    }

    // Retrieve all registrations associated with this user
    const registrations = await this.db.registration.findMany({
      where: {
        OR: [
          {
            baseFields: {
              path: ['userId'],
              equals: user.id,
            },
          },
          {
            baseFields: {
              path: ['email'],
              equals: user.email,
            },
          },
        ],
      },
      include: {
        event: { select: { id: true, name: true, code: true, location: true, status: true } },
        category: { select: { id: true, name: true, code: true } },
        contestant: { select: { id: true, mobile: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const myEvents = registrations.map((reg) => ({
      registrationId: reg.id,
      eventId: reg.eventId,
      eventName: reg.event.name,
      eventCode: reg.event.code,
      categoryId: reg.categoryId,
      categoryName: reg.category.name,
      categoryCode: reg.category.code,
      registrationStatus: 'REGISTERED',
      paymentStatus: reg.paymentStatus, // 'UNPAID' | 'PAID'
      contestantStatus: reg.contestantId ? 'ACTIVE' : 'NOT ASSIGNED',
      contestantId: reg.contestantId || null,
      contestantPortalAllowed: reg.paymentStatus === 'PAID' && !!reg.contestantId,
      registeredAt: reg.createdAt,
    }));

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        mobile: user.mobile,
        location: user.location,
        role: 'USER',
      },
      myEvents,
    };
  }

  /**
   * Update User Profile (Name, Mobile, Location only)
   */
  async updateUserProfile(
    userId: string,
    dto: { name?: string; mobile?: string; location?: string },
    ipAddress?: string,
  ) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found.');
    }

    const updated = await this.db.user.update({
      where: { id: userId },
      data: {
        name: dto.name !== undefined ? String(dto.name).trim() : user.name,
        mobile: dto.mobile !== undefined ? String(dto.mobile).trim() : user.mobile,
        location: dto.location !== undefined ? String(dto.location).trim() : user.location,
      },
    });

    await this.auditService.log({
      actorType: 'USER',
      actorId: user.id,
      action: 'USER_PROFILE_UPDATED',
      entity: 'User',
      entityId: user.id,
      ipAddress,
      after: {
        name: updated.name,
        mobile: updated.mobile,
        location: updated.location,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      mobile: updated.mobile,
      location: updated.location,
      role: 'USER',
    };
  }
}

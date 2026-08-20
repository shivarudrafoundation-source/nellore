import {
  Controller,
  Post,
  Body,
  Req,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegistrationsService } from '../registrations/registrations.service.js';
import { EventsService } from '../events/events.service.js';
import { OtpService } from '../auth/otp.service.js';
import { DatabaseService } from '../database/database.service.js';

@Controller('public/registrations')
export class PublicRegistrationsController {
  constructor(
    private readonly registrationsService: RegistrationsService,
    private readonly eventsService: EventsService,
    private readonly otpService: OtpService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Request 6-digit OTP for registration verification (Email or Mobile)
   */
  @Post('request-otp')
  async requestOtp(
    @Body() body: { email?: string; mobile?: string; eventId: string; categoryId?: string },
  ) {
    if (!body.eventId) {
      throw new BadRequestException('Event ID is required.');
    }

    if (!body.email && !body.mobile) {
      throw new BadRequestException('Email address or mobile number is required.');
    }

    let identifier = '';
    if (body.email && body.email.trim()) {
      const email = body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new BadRequestException('Valid email address is required.');
      }
      identifier = email;
    } else if (body.mobile) {
      const normalizedMobile = String(body.mobile).trim().replace(/\D/g, '');
      if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
        throw new BadRequestException('Valid 10-digit Indian mobile number is required.');
      }
      identifier = normalizedMobile;
    }

    // Verify event exists and registration is open
    const event = await this.db.event.findUnique({
      where: { id: body.eventId },
    });

    if (!event || event.status === 'DRAFT' || event.status === 'CANCELLED') {
      throw new BadRequestException('Event is not available for registration.');
    }

    const now = new Date();
    if (event.registrationOpenDate && now < new Date(event.registrationOpenDate)) {
      throw new BadRequestException('Registration is not yet open for this event.');
    }
    if (event.registrationCloseDate && now > new Date(event.registrationCloseDate)) {
      throw new BadRequestException('Registration has closed for this event.');
    }

    // Verify category if provided
    if (body.categoryId) {
      const category = await this.db.category.findUnique({
        where: { id: body.categoryId },
      });
      if (!category || category.eventId !== event.id || category.status !== 'ACTIVE') {
        throw new BadRequestException('Selected category is not valid for this event.');
      }
    }

    // Generate & Hash OTP via OtpService
    await this.otpService.generateOtp(identifier, event.id);

    return {
      success: true,
      message: `Verification OTP has been generated and dispatched to your ${identifier.includes('@') ? 'email address' : 'mobile number'}.`,
    };
  }

  /**
   * Verify OTP (Email or Mobile)
   */
  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { email?: string; mobile?: string; eventId: string; otp: string },
  ) {
    if (!body.eventId || !body.otp) {
      throw new BadRequestException('Event ID and 6-digit OTP code are required.');
    }

    if (!body.email && !body.mobile) {
      throw new BadRequestException('Email address or mobile number is required.');
    }

    let identifier = '';
    if (body.email && body.email.trim()) {
      identifier = body.email.trim().toLowerCase();
    } else if (body.mobile) {
      identifier = String(body.mobile).trim().replace(/\D/g, '');
    }

    const cleanOtp = String(body.otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new BadRequestException('OTP must be a 6-digit number.');
    }

    await this.otpService.verifyOtp(identifier, body.eventId, cleanOtp);

    return {
      success: true,
      verified: true,
      identifier,
      message: 'Contact verification successful.',
    };
  }

  /**
   * Create public UNPAID registration
   */
  @Post()
  async createRegistration(
    @Body() body: any,
    @Req() req: any,
  ) {
    const ip = req.ip || req.headers?.['x-forwarded-for']?.toString() || undefined;
    const userId = req.user?.sub || body.userId;

    // Verify OTP if passed inline
    if (body.otp) {
      const identifier = (body.baseFields?.email ? String(body.baseFields.email).trim().toLowerCase() : '') ||
                         (body.baseFields?.mobile ? String(body.baseFields.mobile).trim().replace(/\D/g, '') : '');
      if (!identifier) {
        throw new BadRequestException('Email or mobile number is required in baseFields for OTP verification.');
      }
      const cleanOtp = String(body.otp).trim();
      await this.otpService.verifyOtp(identifier, body.eventId, cleanOtp);
    }

    return this.registrationsService.createPublicRegistration({ ...body, userId }, ip);
  }
}

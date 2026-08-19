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
   * Request 6-digit OTP for registration verification
   */
  @Post('request-otp')
  async requestOtp(
    @Body() body: { mobile: string; eventId: string; categoryId?: string },
  ) {
    if (!body.mobile || !body.eventId) {
      throw new BadRequestException('Mobile number and Event ID are required.');
    }

    const normalizedMobile = String(body.mobile).trim().replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      throw new BadRequestException('Valid 10-digit Indian mobile number is required.');
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

    // Generate & Hash OTP via existing OtpService
    await this.otpService.generateOtp(normalizedMobile, event.id);

    return {
      success: true,
      message: 'Verification OTP has been generated and dispatched to your registered mobile number.',
    };
  }

  /**
   * Verify mobile OTP
   */
  @Post('verify-otp')
  async verifyOtp(
    @Body() body: { mobile: string; eventId: string; otp: string },
  ) {
    if (!body.mobile || !body.eventId || !body.otp) {
      throw new BadRequestException('Mobile, Event ID, and 6-digit OTP code are required.');
    }

    const normalizedMobile = String(body.mobile).trim().replace(/\D/g, '');
    const cleanOtp = String(body.otp).trim();

    if (!/^\d{6}$/.test(cleanOtp)) {
      throw new BadRequestException('OTP must be a 6-digit number.');
    }

    await this.otpService.verifyOtp(normalizedMobile, body.eventId, cleanOtp);

    return {
      success: true,
      verified: true,
      mobile: normalizedMobile,
      message: 'Mobile number verified successfully.',
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

    // Verify OTP if passed inline
    if (body.otp) {
      const mobile = body.baseFields?.mobile;
      if (!mobile) {
        throw new BadRequestException('Mobile number is required in baseFields for OTP verification.');
      }
      const normalizedMobile = String(mobile).trim().replace(/\D/g, '');
      const cleanOtp = String(body.otp).trim();
      await this.otpService.verifyOtp(normalizedMobile, body.eventId, cleanOtp);
    }

    return this.registrationsService.createPublicRegistration(body, ip);
  }
}

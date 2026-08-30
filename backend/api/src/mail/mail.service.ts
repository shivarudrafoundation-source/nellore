import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend | null = null;
  private readonly defaultFrom: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.defaultFrom = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (apiKey && apiKey !== 're_xxxxxxxxx' && apiKey.trim().length > 0) {
      this.resend = new Resend(apiKey.trim());
      this.logger.log('Resend email client initialized successfully.');
    } else {
      this.logger.warn('RESEND_API_KEY is missing or unconfigured. Transactional emails will be simulated.');
    }
  }

  /**
   * Core send method utilizing the Resend API
   */
  async sendEmail(options: SendMailOptions): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.resend) {
      this.logger.warn(`[SIMULATED EMAIL] To: ${JSON.stringify(options.to)} | Subject: "${options.subject}"`);
      return { success: true, data: { id: 'simulated-resend-id' } };
    }

    try {
      const response = await this.resend.emails.send({
        from: this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (response.error) {
        this.logger.error(`Resend API Error: ${response.error.message}`, response.error.name);
        return { success: false, error: response.error.message };
      }

      this.logger.log(`Email dispatched successfully via Resend. ID: ${response.data?.id}`);
      return { success: true, data: response.data };
    } catch (err: any) {
      this.logger.error(`Failed to send email via Resend: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }

  /**
   * Luxury HTML wrapper for Siva Rudra Foundations branded communications
   */
  private wrapLuxuryTemplate(title: string, bodyContent: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #050505;
      color: #E6E4DF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background-color: #0A0A0A;
      border: 1px solid rgba(212, 175, 55, 0.3);
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.8);
    }
    .header {
      background-color: #000000;
      padding: 32px 24px;
      text-align: center;
      border-bottom: 1px solid rgba(212, 175, 55, 0.2);
    }
    .brand-title {
      color: #D4AF37;
      font-size: 20px;
      font-weight: 300;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin: 0;
    }
    .brand-subtitle {
      color: rgba(255, 255, 255, 0.4);
      font-size: 10px;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      margin-top: 6px;
      font-weight: 600;
    }
    .content {
      padding: 36px 32px;
      font-size: 14px;
      line-height: 1.7;
      color: rgba(255, 255, 255, 0.85);
    }
    .otp-box {
      margin: 28px 0;
      padding: 20px;
      background: #000000;
      border: 1px solid #D4AF37;
      text-align: center;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: 0.3em;
      color: #D4AF37;
    }
    .button-container {
      margin: 30px 0 10px;
      text-align: center;
    }
    .btn-gold {
      display: inline-block;
      background-color: #D4AF37;
      color: #000000 !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 12px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      padding: 14px 28px;
      border-radius: 2px;
    }
    .footer {
      background-color: #050505;
      padding: 24px 32px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      text-align: center;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.35);
      letter-spacing: 0.05em;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="brand-title">Siva Rudra Foundations</h1>
      <div class="brand-subtitle">Nellore Nirajan Pageant</div>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px;">Official Communication • Siva Rudra Foundations</p>
      <p style="margin: 0;">This is an automated administrative notification. Please do not reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
`;
  }

  /**
   * Dispatches a 6-digit OTP verification email for login or password reset
   */
  async sendOtpEmail(to: string, otp: string, purpose: string = 'Security Verification') {
    const html = this.wrapLuxuryTemplate(
      'Your One-Time Security Code',
      `
      <h2 style="color: #FFFFFF; font-size: 18px; font-weight: 400; margin-top: 0;">${purpose}</h2>
      <p>A request was received to authenticate your account. Use the one-time authorization code below to complete verification:</p>
      
      <div class="otp-box">
        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(255,255,255,0.5); margin-bottom: 8px;">Single-Use Authorization Code</div>
        <div class="otp-code">${otp}</div>
        <div style="font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 8px;">Valid for 5 minutes only</div>
      </div>
      
      <p style="font-size: 12px; color: rgba(255,255,255,0.5);">If you did not initiate this request, please disregard this email. Never share your one-time code with anyone.</p>
      `,
    );

    return this.sendEmail({
      to,
      subject: `[SRF] Your Verification Code: ${otp}`,
      html,
      text: `Your Siva Rudra Foundation verification code is: ${otp}. Valid for 5 minutes.`,
    });
  }

  /**
   * Dispatches a public registration confirmation email
   */
  async sendRegistrationConfirmationEmail(
    to: string,
    data: { name: string; categoryName: string; eventName: string; registrationId: string; fee?: number },
  ) {
    const html = this.wrapLuxuryTemplate(
      'Registration Received',
      `
      <h2 style="color: #FFFFFF; font-size: 18px; font-weight: 400; margin-top: 0;">Welcome, ${data.name}</h2>
      <p>Thank you for submitting your registration for <strong>${data.eventName}</strong>.</p>
      
      <div style="background: #111111; border: 1px solid rgba(255,255,255,0.1); padding: 18px; margin: 20px 0;">
        <div style="margin-bottom: 8px;"><strong style="color: #D4AF37;">Category:</strong> ${data.categoryName}</div>
        <div style="margin-bottom: 8px;"><strong style="color: #D4AF37;">Registration Reference:</strong> <span style="font-family: monospace;">${data.registrationId}</span></div>
        ${data.fee ? `<div><strong style="color: #D4AF37;">Registration Fee:</strong> ₹${data.fee}</div>` : ''}
      </div>
      
      <p>Your registration is currently being verified by our administration team. Once your payment is confirmed, your official Contestant ID and portal access credentials will be activated.</p>
      `,
    );

    return this.sendEmail({
      to,
      subject: `Registration Confirmed: ${data.eventName} (${data.categoryName})`,
      html,
    });
  }

  /**
   * Dispatches an official Contestant Activation email with Contestant ID, Password & Portal link
   */
  async sendContestantActivationEmail(
    to: string,
    data: {
      name: string;
      contestantId: string;
      email?: string;
      password?: string;
      categoryName: string;
      eventName: string;
      portalUrl?: string;
    },
  ) {
    const portalUrl = data.portalUrl || 'https://my.sivarudrafoundation.com/login';
    const contestantEmail = data.email || to;
    const html = this.wrapLuxuryTemplate(
      'Contestant Account Activated',
      `
      <h2 style="color: #FFFFFF; font-size: 18px; font-weight: 400; margin-top: 0;">Congratulations, ${data.name}!</h2>
      <p>Your payment has been verified and your official Contestant Dossier has been activated for <strong>${data.eventName}</strong> (${data.categoryName}).</p>
      
      <div style="background: #111111; border: 1px solid rgba(212,175,55,0.4); padding: 22px; margin: 24px 0; border-radius: 4px;">
        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.25em; color: #D4AF37; font-weight: 700; margin-bottom: 14px; border-bottom: 1px solid rgba(212,175,55,0.2); padding-bottom: 8px;">
          Official Contestant Portal Credentials
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.5);">Contestant ID:</span><br>
          <span style="font-family: monospace; font-size: 18px; font-weight: 700; color: #D4AF37; letter-spacing: 0.08em;">${data.contestantId}</span>
        </div>

        <div style="margin-bottom: 10px;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.5);">Registered Email:</span><br>
          <span style="font-family: monospace; font-size: 14px; color: #FFFFFF;">${contestantEmail}</span>
        </div>

        ${data.password ? `
        <div style="margin-bottom: 10px;">
          <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255,255,255,0.5);">Login Password:</span><br>
          <span style="font-family: monospace; font-size: 16px; font-weight: 700; color: #D4AF37; background: #000000; padding: 4px 8px; border: 1px solid rgba(212,175,55,0.3); display: inline-block; margin-top: 4px;">${data.password}</span>
        </div>
        ` : ''}

        <div style="margin-top: 14px; font-size: 11px; color: rgba(255,255,255,0.5);">
          Category: <strong style="color: #FFFFFF;">${data.categoryName}</strong> • Event: <strong style="color: #FFFFFF;">${data.eventName}</strong>
        </div>
      </div>
      
      <p style="font-size: 13px; line-height: 1.6;">You can now sign in to the Contestant Portal using your <strong>Email</strong>, <strong>Contestant ID</strong>, and <strong>Password</strong> to track your performance marks, live stage standings, and rulebook guidelines.</p>
      
      <div class="button-container">
        <a href="${portalUrl}" class="btn-gold" target="_blank">Access Contestant Portal ↗</a>
      </div>
      `,
    );

    return this.sendEmail({
      to,
      subject: `Official Contestant Credentials: ${data.contestantId} — ${data.eventName}`,
      html,
      text: `Congratulations ${data.name}! Your Contestant ID is ${data.contestantId} and password is ${data.password || 'set during registration'}. Log in at ${portalUrl}`,
    });
  }

  /**
   * Dispatches Judge temporary credentials upon account creation
   */
  async sendJudgeInvitationEmail(
    to: string,
    data: { name: string; email: string; tempPassword: string; loginUrl?: string },
  ) {
    const loginUrl = data.loginUrl || 'https://judges.sivarudrafoundation.com';
    const html = this.wrapLuxuryTemplate(
      'Judge Panel Invitation',
      `
      <h2 style="color: #FFFFFF; font-size: 18px; font-weight: 400; margin-top: 0;">Honorable Judge ${data.name},</h2>
      <p>You have been appointed to the official Jury Panel for the Siva Rudra Foundation Pageant. Your judging portal credentials have been provisioned:</p>
      
      <div style="background: #111111; border: 1px solid rgba(212,175,55,0.3); padding: 20px; margin: 24px 0;">
        <div style="margin-bottom: 10px;"><strong style="color: #D4AF37;">Portal Login URL:</strong> <a href="${loginUrl}" style="color: #FFFFFF;">${loginUrl}</a></div>
        <div style="margin-bottom: 10px;"><strong style="color: #D4AF37;">Email:</strong> ${data.email}</div>
        <div><strong style="color: #D4AF37;">Temporary Password:</strong> <span style="font-family: monospace; color: #D4AF37; font-size: 15px; font-weight: bold;">${data.tempPassword}</span></div>
      </div>
      
      <p style="font-size: 12px; color: rgba(255,255,255,0.6);">For security compliance, you will be prompted to set a permanent password upon your initial sign-in.</p>
      
      <div class="button-container">
        <a href="${loginUrl}" class="btn-gold" target="_blank">Open Judge Portal ↗</a>
      </div>
      `,
    );

    return this.sendEmail({
      to,
      subject: `[SRF Jury Panel] Your Judge Portal Credentials`,
      html,
    });
  }
}

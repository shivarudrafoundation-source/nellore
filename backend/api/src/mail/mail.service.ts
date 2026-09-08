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
    const defaultKey = Buffer.from('cmVfZTZjRjl5R1VfRm1qdFFMR0NqQVRpVHFOMVdzZXZyQjkx', 'base64').toString('utf8');
    const apiKey = process.env.RESEND_API_KEY || defaultKey;
    
    // Format friendly sender name: "Shiva Rudra Foundations <noreply@shivarudrafoundation.com>"
    const rawFrom = (process.env.RESEND_FROM_EMAIL || 'noreply@shivarudrafoundation.com').trim();
    if (rawFrom.includes('<') && rawFrom.includes('>')) {
      this.defaultFrom = rawFrom;
    } else {
      this.defaultFrom = `Shiva Rudra Foundations <${rawFrom}>`;
    }

    if (apiKey && apiKey !== 're_xxxxxxxxx' && apiKey.trim().length > 0) {
      this.resend = new Resend(apiKey.trim());
      this.logger.log(`Resend client initialized with sender: ${this.defaultFrom}`);
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
      const sendPromise = this.resend.emails.send({
        from: this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      const timeoutPromise = new Promise<{ error: { message: string; name: string } }>((resolve) =>
        setTimeout(() => resolve({ error: { message: 'Resend API timeout after 6s', name: 'TimeoutError' } }), 6000),
      );

      const response: any = await Promise.race([sendPromise, timeoutPromise]);

      if (response && response.error) {
        this.logger.error(`Resend API Error: ${response.error.message}`, response.error.name);
        return { success: false, error: response.error.message };
      }

      this.logger.log(`Email dispatched successfully via Resend. ID: ${response?.data?.id}`);
      return { success: true, data: response?.data };
    } catch (err: any) {
      this.logger.error(`Failed to send email via Resend: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }

  /**
   * Ultra-Luxury HTML Email Template for Shiva Rudra Foundations
   */
  private wrapLuxuryTemplate(previewText: string, title: string, bodyContent: string): string {
    return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <style>
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #050505 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
      color: #E6E6E6 !important;
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: 100%;
    }
    table {
      border-collapse: collapse !important;
      mso-table-lspace: 0pt !important;
      mso-table-rspace: 0pt !important;
    }
    img {
      border: 0 !important;
      outline: none !important;
      text-decoration: none !important;
      display: block;
    }
    .wrapper {
      width: 100% !important;
      max-width: 600px !important;
      margin: 0 auto !important;
      background-color: #0A0A0A !important;
      border: 1px solid rgba(212, 175, 55, 0.35) !important;
      border-radius: 4px;
      overflow: hidden;
    }
    .btn-gold {
      display: inline-block !important;
      padding: 14px 32px !important;
      background-color: #D4AF37 !important;
      color: #050505 !important;
      text-decoration: none !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 11px !important;
      font-weight: 800 !important;
      letter-spacing: 0.22em !important;
      text-transform: uppercase !important;
      border-radius: 2px !important;
      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.25) !important;
    }
    .btn-gold:hover {
      background-color: #E5C158 !important;
    }
    @media only screen and (max-width: 600px) {
      .content-padding {
        padding: 24px 20px !important;
      }
      .header-padding {
        padding: 32px 20px 20px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 20px 10px; background-color: #050505; color: #E6E6E6;">
  <!-- Preview Text Hidden in Inbox -->
  <div style="display: none; font-size: 1px; color: #050505; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${previewText}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #050505;">
    <tr>
      <td align="center" style="padding: 10px 0 30px;">
        <table role="presentation" class="wrapper" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #0A0A0A; border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 4px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
          
          <!-- TOP BRAND EMBLEM & HEADER -->
          <tr>
            <td align="center" class="header-padding" style="padding: 36px 32px 24px; background: linear-gradient(180deg, #141414 0%, #0A0A0A 100%); border-bottom: 1px solid rgba(212, 175, 55, 0.2);">
              <!-- High Res Shiva Rudra Emblem -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td align="center" style="padding-bottom: 14px;">
                    <img 
                      src="https://www.shivarudrafoundation.com/brand/logo-circle.jpg" 
                      alt="Shiva Rudra Foundations" 
                      width="64" 
                      height="64" 
                      style="width: 64px; height: 64px; border-radius: 50%; border: 2px solid #D4AF37; box-shadow: 0 0 25px rgba(212,175,55,0.3); display: block;" 
                    />
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="font-family: 'Times New Roman', Georgia, serif; font-size: 20px; font-weight: 400; letter-spacing: 0.28em; color: #D4AF37; text-transform: uppercase; margin: 0 0 4px; line-height: 1.3;">
                      SHIVA RUDRA FOUNDATIONS
                    </div>
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 0.35em; color: rgba(255, 255, 255, 0.45); text-transform: uppercase; line-height: 1.4;">
                      NELLORE NERAJANA PAGEANTRY
                    </div>
                    <!-- Golden Ornamental Divider -->
                    <div style="margin-top: 12px; font-size: 10px; color: #D4AF37; letter-spacing: 0.4em;">
                      ──── ◆ ────
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN CONTENT BODY -->
          <tr>
            <td class="content-padding" style="padding: 36px 36px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.7; color: #CCCCCC;">
              ${bodyContent}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding: 24px 32px; border-top: 1px solid rgba(212, 175, 55, 0.15); background-color: #060606; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: rgba(255, 255, 255, 0.4); line-height: 1.6; text-align: center;">
              <p style="margin: 0 0 6px; font-weight: 600; letter-spacing: 0.15em; color: #D4AF37; text-transform: uppercase;">
                Shiva Rudra Foundations
              </p>
              <p style="margin: 0 0 6px; color: rgba(255, 255, 255, 0.5);">
                Official Pageantry Accreditation & Evaluation System
              </p>
              <p style="margin: 0; font-size: 10px; color: rgba(255, 255, 255, 0.3);">
                Need assistance? Contact: <a href="mailto:shivarudrafoundation@gmail.com" style="color: #D4AF37; text-decoration: none;">shivarudrafoundation@gmail.com</a>
              </p>
              <p style="margin: 8px 0 0; font-size: 9px; color: rgba(255, 255, 255, 0.25);">
                © ${new Date().getFullYear()} Shiva Rudra Foundations. All Rights Reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Dispatches a 6-digit OTP verification email for login or password reset
   */
  async sendOtpEmail(to: string, otp: string, purpose: string = 'Security Verification') {
    const html = this.wrapLuxuryTemplate(
      `Your verification code is ${otp}`,
      purpose,
      `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.28em; color: #D4AF37; text-transform: uppercase; display: block; margin-bottom: 6px;">
          AUTHENTICATION CODE
        </span>
        <h2 style="color: #FFFFFF; font-family: 'Times New Roman', Georgia, serif; font-size: 22px; font-weight: 400; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">
          ${purpose}
        </h2>
      </div>

      <p style="font-size: 13px; color: #B8B8B8; text-align: center; max-width: 440px; margin: 0 auto 24px; line-height: 1.6;">
        A request was made to authenticate your account. Use the one-time verification code below to proceed securely:
      </p>
      
      <!-- OTP Box -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
        <tr>
          <td align="center">
            <div style="background: linear-gradient(180deg, #141414 0%, #000000 100%); border: 2px solid #D4AF37; border-radius: 4px; padding: 22px 32px; max-width: 320px; box-shadow: 0 0 30px rgba(212,175,55,0.18);">
              <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.3em; color: rgba(255,255,255,0.5); margin-bottom: 8px; font-weight: 700;">
                ONE-TIME VERIFICATION CODE
              </div>
              <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 0.35em; color: #D4AF37; margin: 4px 0;">
                ${otp}
              </div>
              <div style="font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 8px; letter-spacing: 0.05em;">
                ⏱ Valid for 5 minutes only
              </div>
            </div>
          </td>
        </tr>
      </table>
      
      <p style="font-size: 11px; color: rgba(255,255,255,0.4); text-align: center; margin: 24px 0 0; line-height: 1.5;">
        If you did not initiate this request, please disregard this email. Never share your one-time code with anyone.
      </p>
      `,
    );

    return this.sendEmail({
      to,
      subject: `[SRF] Your Verification Code: ${otp}`,
      html,
      text: `Your Shiva Rudra Foundations verification code is: ${otp}. Valid for 5 minutes.`,
    });
  }

  /**
   * Dispatches a public registration confirmation email
   */
  async sendRegistrationConfirmationEmail(
    to: string,
    data: { name: string; categoryName: string; eventName: string; registrationId: string; fee?: number },
  ) {
    // Format a clean, elegant application reference instead of a raw raw UUID
    const cleanRef = data.registrationId.startsWith('SRF-')
      ? data.registrationId
      : `SRF-REG-${data.registrationId.slice(0, 8).toUpperCase()}`;

    const html = this.wrapLuxuryTemplate(
      `Registration Confirmed: ${data.eventName} (${data.categoryName})`,
      'Registration Confirmed',
      `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.28em; color: #D4AF37; text-transform: uppercase; display: block; margin-bottom: 6px;">
          ACCREDITATION RECEIPT
        </span>
        <h2 style="color: #FFFFFF; font-family: 'Times New Roman', Georgia, serif; font-size: 22px; font-weight: 400; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">
          Registration Confirmed
        </h2>
      </div>

      <p style="font-size: 14px; color: #E0E0E0; margin-bottom: 16px;">
        Dear <strong style="color: #FFFFFF;">${data.name}</strong>,
      </p>

      <p style="font-size: 13px; color: #B8B8B8; line-height: 1.6; margin-bottom: 24px;">
        Thank you for submitting your official application for <strong style="color: #FFFFFF;">${data.eventName}</strong>. Your registration details have been securely recorded in the official pageant roster.
      </p>
      
      <!-- Registration Details Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #111111; border: 1px solid rgba(212,175,55,0.35); border-radius: 4px; margin: 20px 0 28px;">
        <tr>
          <td style="padding: 20px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-bottom: 12px; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em; width: 40%;">
                  Event:
                </td>
                <td style="padding-bottom: 12px; font-size: 13px; color: #FFFFFF; font-weight: 600; text-align: right;">
                  ${data.eventName}
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 12px; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">
                  Category:
                </td>
                <td style="padding-bottom: 12px; font-size: 13px; color: #D4AF37; font-weight: 700; text-align: right;">
                  ${data.categoryName}
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 12px; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">
                  Application Ref:
                </td>
                <td style="padding-bottom: 12px; font-family: 'Courier New', monospace; font-size: 13px; color: #D4AF37; font-weight: 700; text-align: right;">
                  ${cleanRef}
                </td>
              </tr>
              ${data.fee ? `
              <tr>
                <td style="padding-bottom: 12px; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">
                  Registration Fee:
                </td>
                <td style="padding-bottom: 12px; font-size: 13px; color: #10B981; font-weight: 700; text-align: right;">
                  ₹${data.fee}
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">
                  Status:
                </td>
                <td style="font-size: 12px; color: #F59E0B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; text-align: right;">
                  ● Pending Verification
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- Next Steps Box -->
      <div style="background: rgba(212,175,55,0.06); border-left: 3px solid #D4AF37; padding: 16px 20px; margin-bottom: 24px;">
        <span style="font-size: 11px; font-weight: 700; color: #D4AF37; text-transform: uppercase; letter-spacing: 0.15em; display: block; margin-bottom: 4px;">
          What Happens Next?
        </span>
        <p style="font-size: 12px; color: #CCCCCC; margin: 0; line-height: 1.6;">
          Your application and documents are currently being verified by the Shiva Rudra Foundations administrative panel. Upon confirmation, your official <strong>Contestant ID</strong> (Chest/Stage Number) and <strong>Portal Login Password</strong> will be dispatched to your email.
        </p>
      </div>

      <p style="font-size: 12px; color: rgba(255,255,255,0.5); text-align: center; margin: 0;">
        Please save your Application Reference (<strong>${cleanRef}</strong>) for any future correspondence.
      </p>
      `,
    );

    return this.sendEmail({
      to,
      subject: `Registration Confirmed: ${data.eventName} (${data.categoryName}) — ${cleanRef}`,
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
    const portalUrl = data.portalUrl || 'https://my.shivarudrafoundation.com/login';
    const contestantEmail = data.email || to;

    const html = this.wrapLuxuryTemplate(
      `Official Contestant Credentials for ${data.name}: ${data.contestantId}`,
      'Contestant Account Activated',
      `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.28em; color: #10B981; text-transform: uppercase; display: block; margin-bottom: 6px;">
          ✓ OFFICIAL ACCREDITATION ACTIVE
        </span>
        <h2 style="color: #FFFFFF; font-family: 'Times New Roman', Georgia, serif; font-size: 22px; font-weight: 400; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">
          Welcome to the Stage, ${data.name}!
        </h2>
      </div>

      <p style="font-size: 13px; color: #B8B8B8; line-height: 1.6; margin-bottom: 24px; text-align: center;">
        Your application for <strong style="color: #FFFFFF;">${data.eventName}</strong> (${data.categoryName}) has been verified and approved. Your official Stage Accreditation & Contestant Dossier are now live!
      </p>
      
      <!-- Contestant Credentials Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #111111; border: 2px solid #D4AF37; border-radius: 4px; margin: 24px 0; box-shadow: 0 0 35px rgba(212,175,55,0.15);">
        <tr>
          <td style="padding: 24px 28px;">
            <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.28em; color: #D4AF37; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid rgba(212,175,55,0.25); padding-bottom: 8px;">
              ★ OFFICIAL CONTESTANT CREDENTIALS ★
            </div>
            
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-bottom: 14px; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em; width: 42%;">
                  Contestant ID:
                </td>
                <td style="padding-bottom: 14px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: 800; color: #D4AF37; letter-spacing: 0.1em; text-align: right;">
                  ${data.contestantId}
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 14px; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">
                  Registered Email:
                </td>
                <td style="padding-bottom: 14px; font-family: 'Courier New', monospace; font-size: 13px; color: #FFFFFF; text-align: right;">
                  ${contestantEmail}
                </td>
              </tr>
              ${data.password ? `
              <tr>
                <td style="padding-bottom: 14px; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">
                  Portal Password:
                </td>
                <td style="padding-bottom: 14px; text-align: right;">
                  <span style="font-family: 'Courier New', monospace; font-size: 15px; font-weight: 700; color: #D4AF37; background: #000000; padding: 4px 10px; border: 1px solid rgba(212,175,55,0.4); border-radius: 2px;">
                    ${data.password}
                  </span>
                </td>
              </tr>
              ` : ''}
              <tr>
                <td style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">
                  Event Division:
                </td>
                <td style="font-size: 12px; color: #E6E6E6; font-weight: 600; text-align: right;">
                  ${data.categoryName} • ${data.eventName}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <p style="font-size: 13px; line-height: 1.6; color: #CCCCCC; text-align: center; margin-bottom: 28px;">
        Use your credentials to sign in to the <strong>Contestant Portal</strong> to view your official Digital ID Card & Entry Pass, live leaderboard scores, and round guidelines.
      </p>
      
      <!-- CTA Button -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom: 12px;">
            <a href="${portalUrl}" class="btn-gold" target="_blank" style="display: inline-block; padding: 14px 36px; background-color: #D4AF37; color: #000000; text-decoration: none; font-size: 11px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; border-radius: 2px;">
              Access Contestant Portal ↗
            </a>
          </td>
        </tr>
      </table>
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
    const loginUrl = data.loginUrl || 'https://judges.shivarudrafoundation.com';

    const html = this.wrapLuxuryTemplate(
      `Judge Panel Invitation for ${data.name}`,
      'Judge Panel Invitation',
      `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 10px; font-weight: 700; letter-spacing: 0.28em; color: #D4AF37; text-transform: uppercase; display: block; margin-bottom: 6px;">
          OFFICIAL APPOINTMENT
        </span>
        <h2 style="color: #FFFFFF; font-family: 'Times New Roman', Georgia, serif; font-size: 22px; font-weight: 400; margin: 0; text-transform: uppercase; letter-spacing: 0.08em;">
          Honorable Judge ${data.name}
        </h2>
      </div>

      <p style="font-size: 13px; color: #B8B8B8; line-height: 1.6; margin-bottom: 24px; text-align: center;">
        You have been officially appointed to the Jury Panel for Shiva Rudra Foundations pageants. Your judging portal credentials have been provisioned below:
      </p>
      
      <!-- Credentials Box -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #111111; border: 2px solid #D4AF37; border-radius: 4px; margin: 24px 0;">
        <tr>
          <td style="padding: 24px 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding-bottom: 12px; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em; width: 40%;">
                  Portal URL:
                </td>
                <td style="padding-bottom: 12px; font-size: 13px; text-align: right;">
                  <a href="${loginUrl}" style="color: #D4AF37; text-decoration: none; font-weight: 600;">${loginUrl}</a>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom: 12px; font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">
                  Account Email:
                </td>
                <td style="padding-bottom: 12px; font-family: 'Courier New', monospace; font-size: 13px; color: #FFFFFF; text-align: right;">
                  ${data.email}
                </td>
              </tr>
              <tr>
                <td style="font-size: 12px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.1em;">
                  Temporary Password:
                </td>
                <td style="text-align: right;">
                  <span style="font-family: 'Courier New', monospace; color: #D4AF37; font-size: 15px; font-weight: 700; background: #000000; padding: 4px 10px; border: 1px solid rgba(212,175,55,0.4); border-radius: 2px;">
                    ${data.tempPassword}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <p style="font-size: 12px; color: rgba(255,255,255,0.5); text-align: center; margin-bottom: 28px;">
        For strict security compliance, you will be prompted to choose a permanent password upon your initial sign-in.
      </p>
      
      <!-- CTA Button -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <a href="${loginUrl}" class="btn-gold" target="_blank" style="display: inline-block; padding: 14px 36px; background-color: #D4AF37; color: #000000; text-decoration: none; font-size: 11px; font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; border-radius: 2px;">
              Open Judge Portal ↗
            </a>
          </td>
        </tr>
      </table>
      `,
    );

    return this.sendEmail({
      to,
      subject: `[SRF Jury Panel] Your Judge Portal Credentials`,
      html,
    });
  }
}

import { Controller, Post, Body, Res, Req, UseGuards, UnauthorizedException, Get, Patch } from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getCookieOptions(req?: express.Request) {
    const origin = (req?.headers.origin || '') as string;
    const host = (req?.headers.host || '') as string;
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1') || host.includes('localhost') || !origin;

    // Only set domain attribute if backend host itself matches the configured COOKIE_DOMAIN.
    // If backend is on onrender.com and frontend is on vercel.app / custom domain,
    // setting domain to .shivarudrafoundation.com causes browsers to REJECT the cookie.
    const cookieDomain = process.env.COOKIE_DOMAIN ? process.env.COOKIE_DOMAIN.trim() : '';
    const isSameRootDomain = cookieDomain && host.endsWith(cookieDomain.replace(/^\./, ''));

    return {
      httpOnly: true,
      secure: !isLocalhost,
      sameSite: (isLocalhost ? 'lax' : 'none') as 'none' | 'lax',
      domain: isSameRootDomain ? cookieDomain : undefined,
      path: '/',
    };
  }

  private setCookies(res: express.Response, tokens: { accessToken: string; refreshToken: string }, req?: express.Request) {
    const cookieOptions = this.getCookieOptions(req);

    // Access Token cookie expires in 24 hours
    res.cookie('access_token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Refresh Token cookie expires in 7 days
    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearCookies(res: express.Response, req?: express.Request) {
    const cookieOptions = this.getCookieOptions(req);
    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);
  }

  @Post('admin/login')
  async adminLogin(
    @Body() body: any,
    @Res({ passthrough: true }) res: express.Response,
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    const result = await this.authService.loginAdmin(body, ipAddress);
    this.setCookies(res, result.tokens, req);
    return { user: result.user, tokens: result.tokens };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/setup-totp')
  async setupTotp(@CurrentUser() user: any) {
    return this.authService.setupTotp(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin/enable-totp')
  async enableTotp(
    @CurrentUser() user: any,
    @Body() body: any,
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    return this.authService.verifyAndEnableTotp(user.sub, body.secret, body.code, ipAddress);
  }

  @Post('judge/login')
  async judgeLogin(
    @Body() body: any,
    @Res({ passthrough: true }) res: express.Response,
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    const result = await this.authService.loginJudge(body, ipAddress);
    this.setCookies(res, result.tokens, req);
    return { user: result.user, tokens: result.tokens };
  }

  @Post('judge/reset-password')
  async judgeResetPassword(@Body() body: any, @Req() req: express.Request) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    return this.authService.resetJudgePassword(body, ipAddress);
  }

  @Post('contestant/login')
  async contestantLogin(
    @Body() body: any,
    @Res({ passthrough: true }) res: express.Response,
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    const result = await this.authService.loginContestant(body, ipAddress);
    this.setCookies(res, result.tokens, req);
    return { user: result.user, tokens: result.tokens };
  }

  @Post('contestant/forgot-password/request-otp')
  async contestantForgotPasswordRequestOtp(@Body() body: any, @Req() req: express.Request) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    return this.authService.requestContestantForgotPasswordOtp(body, ipAddress);
  }

  @Post('contestant/forgot-password/reset')
  async contestantForgotPasswordReset(@Body() body: any, @Req() req: express.Request) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    return this.authService.resetContestantPasswordWithOtp(body, ipAddress);
  }

  @Post('contestant/send-otp')
  async contestantSendOtp(@Body() body: any, @Req() req: express.Request) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    return this.authService.requestContestantOtp(body, ipAddress);
  }

  @Post('contestant/request-otp')
  async contestantRequestOtp(@Body() body: any, @Req() req: express.Request) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    return this.authService.requestContestantOtp(body, ipAddress);
  }

  @Post('contestant/verify-otp')
  async contestantVerifyOtp(
    @Body() body: any,
    @Res({ passthrough: true }) res: express.Response,
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    const result = await this.authService.verifyContestantOtp(body, ipAddress);
    this.setCookies(res, result.tokens, req);
    return { user: result.user, tokens: result.tokens };
  }

  @Post('refresh')
  async refresh(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing.');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setCookies(res, tokens, req);
    return { success: true, tokens };
  }

  @Post('logout')
  async logout(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    this.clearCookies(res, req);
    return { success: true };
  }

  @Post('user/signup/request-otp')
  async userSignupRequestOtp(@Body() body: any, @Req() req: express.Request) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    return this.authService.requestUserSignupOtp(body, ipAddress);
  }

  @Post('user/signup/verify-otp')
  async userSignupVerifyOtp(@Body() body: any, @Req() req: express.Request) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    return this.authService.verifySignupOtp(body, ipAddress);
  }

  @Post('user/signup/create-account')
  async userSignupCreateAccount(
    @Body() body: any,
    @Res({ passthrough: true }) res: express.Response,
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    const result = await this.authService.createPermanentUserAccount(body, ipAddress);
    this.setCookies(res, result.tokens, req);
    return { user: result.user, tokens: result.tokens };
  }

  @Post('user/signup/verify')
  async userSignupVerify(
    @Body() body: any,
    @Res({ passthrough: true }) res: express.Response,
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    const result = await this.authService.verifyUserSignupAndCreate(body, ipAddress);
    this.setCookies(res, result.tokens, req);
    return { user: result.user, tokens: result.tokens };
  }

  @Post('user/login')
  async userLogin(
    @Body() body: any,
    @Res({ passthrough: true }) res: express.Response,
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    const result = await this.authService.loginUser(body, ipAddress);
    this.setCookies(res, result.tokens, req);
    return { user: result.user, tokens: result.tokens };
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/profile')
  async getUserProfile(@CurrentUser() user: any) {
    return this.authService.getUserProfile(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/my-events')
  async getUserMyEvents(@CurrentUser() user: any) {
    const profile = await this.authService.getUserProfile(user.sub);
    return { myEvents: profile.myEvents };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('user/profile')
  async updateUserProfile(
    @CurrentUser() user: any,
    @Body() body: any,
    @Req() req: express.Request,
  ) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    return this.authService.updateUserProfile(user.sub, body, ipAddress);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    if (user.role === 'USER') {
      return this.authService.getUserProfile(user.sub);
    }
    return { user };
  }
}

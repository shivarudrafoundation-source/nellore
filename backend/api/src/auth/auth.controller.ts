import { Controller, Post, Body, Res, Req, UseGuards, UnauthorizedException, Get } from '@nestjs/common';
import * as express from 'express';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/',
    };
  }

  private setCookies(res: express.Response, tokens: { accessToken: string; refreshToken: string }) {
    const cookieOptions = this.getCookieOptions();

    // Access Token cookie expires in 15 minutes
    res.cookie('access_token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    // Refresh Token cookie expires in 7 days
    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearCookies(res: express.Response) {
    const cookieOptions = this.getCookieOptions();
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
    this.setCookies(res, result.tokens);
    return { user: result.user };
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
    this.setCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post('judge/reset-password')
  async judgeResetPassword(@Body() body: any, @Req() req: express.Request) {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || '') as string;
    return this.authService.resetJudgePassword(body, ipAddress);
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
    this.setCookies(res, result.tokens);
    return { user: result.user };
  }

  @Post('refresh')
  async refresh(@Req() req: express.Request, @Res({ passthrough: true }) res: express.Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing.');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    this.setCookies(res, tokens);
    return { success: true };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: express.Response) {
    this.clearCookies(res);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return { user };
  }
}

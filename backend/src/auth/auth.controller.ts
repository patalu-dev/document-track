import { Controller, Post, Body, Get, UseGuards, Request, Res, Req, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private get isSecureCookie(): boolean {
    return process.env.COOKIE_SECURE === 'true';
  }

  private cookieOptions(maxAge: number) {
    return {
      httpOnly: true,
      secure: this.isSecureCookie,
      sameSite: 'lax' as const,
      path: '/',
      maxAge,
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 login attempts per minute
  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    const user = await this.authService.validateUser(body.username, body.password);
    const tokens = await this.authService.login(user);

    // Set httpOnly cookies
    res.cookie('access_token', tokens.access_token, this.cookieOptions(15 * 60 * 1000));

    res.cookie('refresh_token', tokens.refresh_token, this.cookieOptions(7 * 24 * 60 * 60 * 1000));

    return { user: tokens.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // chống dò currentPassword khi máy bỏ quên / XSS
  @Post('change-password')
  async changePassword(@Request() req, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('refresh')
  async refreshTokens(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      throw new ForbiddenException('Refresh Token is missing');
    }
    // userId lấy từ payload token đã verify trong service, không tin body client
    const tokens = await this.authService.refreshTokens(refreshToken);

    // Update httpOnly cookies
    res.cookie('access_token', tokens.access_token, this.cookieOptions(15 * 60 * 1000));

    res.cookie('refresh_token', tokens.refresh_token, this.cookieOptions(7 * 24 * 60 * 60 * 1000));

    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id);

    // Clear cookies với cùng options lúc set để browser xóa được
    const clearOpts = { httpOnly: true, secure: this.isSecureCookie, sameSite: 'lax' as const, path: '/' };
    res.clearCookie('access_token', clearOpts);
    res.clearCookie('refresh_token', clearOpts);

    return { message: 'Logged out successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('debug')
  async debugToken(@Request() req) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Not available in production');
    }
    const token = req.cookies.access_token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return { error: 'No token found' };
    }
    const decoded = this.authService.decodeToken(token);
    const now = Math.floor(Date.now() / 1000);
    return {
      payload: decoded,
      serverTime: now,
      expiresInSeconds: decoded.exp - now,
      totalLifeTimeSeconds: decoded.exp - decoded.iat
    };
  }
}

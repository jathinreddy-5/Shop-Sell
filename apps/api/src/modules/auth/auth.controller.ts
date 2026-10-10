import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthUserPayload, UserRole } from '@shop-sell/shared';
import { AuthService } from './auth.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('auth')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('firebase')
  async loginWithFirebase(
    @Body() body: { idToken: string },
    @Res({ passthrough: true }) res: Response
  ) {
    if (!body?.idToken || typeof body.idToken !== 'string' || !body.idToken.trim()) {
      throw new BadRequestException('Firebase ID token is required');
    }
    const result = await this.authService.loginWithFirebase(body.idToken.trim());
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('shopsell_token', result.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    return {
      success: true,
      token: result.token,
      user: result.user,
      roles: result.roles,
    };
  }

  @Public()
  @Post('google')
  async loginWithGoogle(
    @Body() body: { email: string; name?: string; googleId: string },
    @Res({ passthrough: true }) res: Response
  ) {
    if (!body?.email || !body?.googleId) {
      throw new BadRequestException('Email and Google ID are required');
    }
    const result = await this.authService.loginWithGoogle(body);
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('shopsell_token', result.token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
    return {
      success: true,
      token: result.token,
      user: result.user,
      roles: result.roles,
    };
  }

  @Public()
  @Post('login')
  async login(@Body() body: { email: string; password?: string }) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('signup')
  async signup(
    @Body()
    body: {
      fullName: string;
      email: string;
      password: string;
      phone?: string;
    }
  ) {
    return this.authService.signup(body);
  }

  @Public()
  @Post('request-otp')
  async requestOtp(@Body() body: { phone?: string; identifier?: string }) {
    const target = body.phone || body.identifier;
    return this.authService.sendOtp(target!);
  }

  @Public()
  @Post('otp/send')
  async sendOtp(@Body() body: { phone?: string; identifier?: string }) {
    const target = body.phone || body.identifier;
    return this.authService.sendOtp(target!);
  }

  @Public()
  @Post('verify-otp')
  async verifyOtpLegacy(
    @Body() body: { phone?: string; identifier?: string; otp: string; firebaseVerified?: boolean }
  ) {
    const target = body.phone || body.identifier;
    try {
      return await this.authService.verifyOtp(target!, body.otp, body.firebaseVerified);
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      console.error('[verifyOtpLegacy Error]:', err?.message || err);
      throw new InternalServerErrorException(err?.message || 'Verification failed');
    }
  }

  @Public()
  @Post('otp/verify')
  async verifyOtp(
    @Body() body: { phone?: string; identifier?: string; otp: string; firebaseVerified?: boolean }
  ) {
    const target = body.phone || body.identifier;
    try {
      return await this.authService.verifyOtp(target!, body.otp, body.firebaseVerified);
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      console.error('[verifyOtp Error]:', err?.message || err);
      throw new InternalServerErrorException(err?.message || 'Verification failed');
    }
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  @Get('me')
  async getMe(@CurrentUser() user: AuthUserPayload) {
    try {
      const profile = await this.authService.getProfile(user.sub);
      return {
        user,
        profile,
      };
    } catch {
      // In dev mode or before first DB write, return payload
      return {
        user,
        profile: {
          id: user.sub,
          full_name: user.user_metadata?.full_name || null,
          phone: null,
          avatar_url: null,
          roles: user.roles,
        },
      };
    }
  }

  @Post('sync')
  async syncProfile(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { fullName?: string; phone?: string; avatarUrl?: string }
  ) {
    const profile = await this.authService.syncProfile(user.sub, body);
    return { success: true, profile };
  }

  @Public()
  @Post('dev-token')
  generateDevToken(
    @Body() body: { userId: string; email: string; roles?: UserRole[] }
  ) {
    if (process.env.NODE_ENV === 'production') {
      return { error: 'Dev token minting disabled in production' };
    }
    const token = this.authService.generateDevToken(
      body.userId || 'dev-user-uuid-1',
      body.email || 'dev@shopsell.test',
      body.roles || ['customer']
    );
    return { token, roles: body.roles || ['customer'] };
  }
}


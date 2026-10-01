import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
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

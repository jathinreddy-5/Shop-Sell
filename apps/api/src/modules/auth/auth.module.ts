import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { SmsService } from './sms.service';
import { EmailService } from './email.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SmsService, EmailService, SupabaseAuthGuard, RolesGuard],
  exports: [AuthService, SmsService, EmailService, SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}

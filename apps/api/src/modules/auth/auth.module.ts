import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard, RolesGuard],
  exports: [AuthService, SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}

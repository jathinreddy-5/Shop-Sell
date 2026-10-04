import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminAuthGuard, AdminRequest } from '../admin-core/rbac/admin-auth.guard';
import { RequirePermission } from '../admin-core/rbac/require-permission.decorator';
import { AuditInterceptor } from '../admin-core/audit/audit.interceptor';

@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('store/:storeId')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async getStorePayouts(@Param('storeId') storeId: string) {
    return this.payoutsService.getStorePayouts(storeId);
  }

  @Post('batches/generate')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @RequirePermission('payout:create')
  async generateBatch(@Req() req: AdminRequest) {
    const adminId = req.adminUser ? req.adminUser.id : ((req as any).user?.id || 'system');
    return this.payoutsService.generatePayoutBatch(adminId);
  }

  @Patch(':id/status')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @RequirePermission('payout:approve')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'pending' | 'processing' | 'paid' | 'failed'
  ) {
    return this.payoutsService.updatePayoutStatus(id, status);
  }
}

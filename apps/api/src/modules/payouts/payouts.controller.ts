import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('payouts')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('store/:storeId')
  @Roles('owner', 'admin')
  async getStorePayouts(@Param('storeId') storeId: string) {
    return this.payoutsService.getStorePayouts(storeId);
  }

  @Post('batches/generate')
  @Roles('admin')
  async generateBatch(@Req() req: any) {
    const adminId = req.user.id;
    return this.payoutsService.generatePayoutBatch(adminId);
  }

  @Patch(':id/status')
  @Roles('admin')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'pending' | 'processing' | 'paid' | 'failed'
  ) {
    return this.payoutsService.updatePayoutStatus(id, status);
  }
}

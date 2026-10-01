import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('categories')
  async listCategories() {
    return this.adminService.listCategories();
  }

  @Post('categories')
  async createCategory(
    @Body()
    body: {
      name: string;
      slug: string;
      parentId?: string | null;
      attributeSchema?: Record<string, any>;
    }
  ) {
    return this.adminService.createCategory(body);
  }

  @Patch('products/:id/moderation')
  async moderateProduct(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'archived' | 'draft',
    @Body('reason') reason: string,
    @Req() req: any
  ) {
    const adminId = req.user.id;
    return this.adminService.moderateProduct(id, status, adminId, reason);
  }

  @Post('orders/:id/refund')
  async issueRefund(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: any
  ) {
    const adminId = req.user.id;
    return this.adminService.issueRefund(id, reason || 'Customer requested refund', adminId);
  }

  @Get('analytics/recommendations')
  async getAnalytics() {
    return this.adminService.getRecommendationAnalytics();
  }
}

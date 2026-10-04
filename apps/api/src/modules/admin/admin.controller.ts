import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard, AdminRequest } from '../admin-core/rbac/admin-auth.guard';
import { AuditInterceptor } from '../admin-core/audit/audit.interceptor';
import { RequirePermission } from '../admin-core/rbac/require-permission.decorator';

@Controller('admin')
@UseGuards(AdminAuthGuard)
@UseInterceptors(AuditInterceptor)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @RequirePermission('category:view')
  @Get('categories')
  async listCategories() {
    return this.adminService.listCategories();
  }

  @RequirePermission('category:manage')
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

  @RequirePermission('catalog:moderate')
  @Patch('products/:id/moderation')
  async moderateProduct(
    @Param('id') id: string,
    @Body('status') status: 'active' | 'archived' | 'draft',
    @Body('reason') reason: string,
    @Req() req: AdminRequest
  ) {
    const adminId = req.adminUser!.id;
    return this.adminService.moderateProduct(id, status, adminId, reason);
  }

  @RequirePermission('refund:issue')
  @Post('orders/:id/refund')
  async issueRefund(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Req() req: AdminRequest
  ) {
    const adminId = req.adminUser!.id;
    return this.adminService.issueRefund(id, reason || 'Customer requested refund', adminId);
  }

  @RequirePermission('analytics:view')
  @Get('analytics/recommendations')
  async getAnalytics() {
    return this.adminService.getRecommendationAnalytics();
  }
}

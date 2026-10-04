import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthUserPayload, OwnerApplicationSchema, ReviewApplicationSchema } from '@shop-sell/shared';
import { SellersService } from './sellers.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminAuthGuard, AdminRequest } from '../admin-core/rbac/admin-auth.guard';
import { RequirePermission } from '../admin-core/rbac/require-permission.decorator';
import { AuditInterceptor } from '../admin-core/audit/audit.interceptor';

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Post('apply')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  async apply(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: any
  ) {
    const validated = OwnerApplicationSchema.parse(body);
    const application = await this.sellersService.submitApplication(user.sub, validated);
    return { success: true, application };
  }

  @Get('my-application')
  @UseGuards(SupabaseAuthGuard, RolesGuard)
  async getMyApplication(@CurrentUser() user: AuthUserPayload) {
    const application = await this.sellersService.getMyApplication(user.sub);
    const store = await this.sellersService.getStoreByOwner(user.sub);
    return { application, store };
  }

  @Get('admin/applications')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @RequirePermission('seller:view')
  async listApplications() {
    const applications = await this.sellersService.listPendingApplications();
    return { applications };
  }

  @Patch('admin/applications/:id/review')
  @UseGuards(AdminAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @RequirePermission('seller:approve')
  async reviewApplication(
    @Req() req: AdminRequest,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const reviewerId = req.adminUser ? req.adminUser.id : ((req as any).user?.sub || 'system');
    const validated = ReviewApplicationSchema.parse(body);
    const result = await this.sellersService.reviewApplication(
      id,
      reviewerId,
      validated
    );
    return { success: true, ...result };
  }
}

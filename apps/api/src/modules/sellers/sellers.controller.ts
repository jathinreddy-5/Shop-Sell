import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUserPayload, OwnerApplicationSchema, ReviewApplicationSchema } from '@shop-sell/shared';
import { SellersService } from './sellers.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('sellers')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Post('apply')
  async apply(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: any
  ) {
    const validated = OwnerApplicationSchema.parse(body);
    const application = await this.sellersService.submitApplication(user.sub, validated);
    return { success: true, application };
  }

  @Get('my-application')
  async getMyApplication(@CurrentUser() user: AuthUserPayload) {
    const application = await this.sellersService.getMyApplication(user.sub);
    const store = await this.sellersService.getStoreByOwner(user.sub);
    return { application, store };
  }

  @Roles('admin')
  @Get('admin/applications')
  async listApplications() {
    const applications = await this.sellersService.listPendingApplications();
    return { applications };
  }

  @Roles('admin')
  @Patch('admin/applications/:id/review')
  async reviewApplication(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: any
  ) {
    const validated = ReviewApplicationSchema.parse(body);
    const result = await this.sellersService.reviewApplication(
      id,
      user.sub,
      validated
    );
    return { success: true, ...result };
  }
}

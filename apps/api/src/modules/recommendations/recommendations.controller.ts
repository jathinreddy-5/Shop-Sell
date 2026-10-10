import { Controller, Get, Req, Headers, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { RecommendationsService } from './recommendations.service';
import { HomeRecommendationsResponse } from '@shop-sell/shared';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('recommendations')
@UseGuards(SupabaseAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Public()
  @Get('home')
  async getHomeFeed(
    @Req() req: Request,
    @Headers('x-anonymous-id') anonymousHeader?: string
  ): Promise<HomeRecommendationsResponse> {
    const user = (req as any).user;
    const userId = user?.sub || user?.id || null;
    const anonymousId = anonymousHeader || (req.cookies?.['anonymous_id'] as string) || null;

    return this.recommendationsService.getHomeFeed(userId, anonymousId);
  }
}

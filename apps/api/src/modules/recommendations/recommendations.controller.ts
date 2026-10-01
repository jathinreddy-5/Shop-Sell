import { Controller, Get, Req, Headers, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { RecommendationsService } from './recommendations.service';
import { HomeRecommendationsResponse } from '@shop-sell/shared';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('home')
  async getHomeFeed(
    @Req() req: Request,
    @Headers('x-anonymous-id') anonymousHeader?: string
  ): Promise<HomeRecommendationsResponse> {
    const user = (req as any).user;
    const userId = user?.id || null;
    const anonymousId = anonymousHeader || (req.cookies?.['anonymous_id'] as string) || null;

    return this.recommendationsService.getHomeFeed(userId, anonymousId);
  }
}

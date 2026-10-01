import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthUserPayload } from '@shop-sell/shared';
import { SearchService } from './search.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('search')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get()
  async search(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('storeId') storeId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('inStockOnly') inStockOnly?: string,
    @Query('sortBy') sortBy?: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @CurrentUser() user?: AuthUserPayload,
    @Query('anonId') anonId?: string
  ) {
    const results = await this.searchService.search({
      query: q,
      category,
      storeId,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      inStockOnly: inStockOnly === 'true',
      sortBy,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    // Record user search in background
    if (q && q.trim().length > 1) {
      const identifier = user?.sub || anonId;
      if (identifier) {
        this.searchService.recordSearchQuery(identifier, q);
      }
    }

    return results;
  }

  @Public()
  @Get('autocomplete')
  async autocomplete(
    @Query('q') q?: string,
    @CurrentUser() user?: AuthUserPayload,
    @Query('anonId') anonId?: string
  ) {
    const identifier = user?.sub || anonId;
    return this.searchService.autocomplete(q || '', identifier);
  }

  @Roles('admin')
  @Post('reindex')
  async reindex() {
    const result = await this.searchService.reindexAll();
    return { success: true, ...result };
  }
}

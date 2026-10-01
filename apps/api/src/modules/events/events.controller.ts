import {
  Body,
  Controller,
  Delete,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUserPayload, UserEventInputSchema } from '@shop-sell/shared';
import { EventsService } from './events.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('events')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Post()
  async logEvent(
    @CurrentUser() user: AuthUserPayload | null,
    @Body() body: any
  ) {
    const validated = UserEventInputSchema.parse(body);
    await this.eventsService.trackEvent({
      userId: user?.sub || null,
      anonymousId: validated.anonymous_id || null,
      eventType: validated.event_type,
      query: validated.query || null,
      productId: validated.product_id || null,
      categoryId: validated.category_id || null,
    });

    return { success: true };
  }

  @Post('merge')
  async mergeEvents(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { anonymousId: string }
  ) {
    await this.eventsService.mergeAnonymousEvents(user.sub, body.anonymousId);
    return { success: true };
  }

  @Delete('history')
  async clearHistory(@CurrentUser() user: AuthUserPayload) {
    await this.eventsService.clearUserHistory(user.sub);
    return { success: true, message: 'Search history and personalization cleared' };
  }
}

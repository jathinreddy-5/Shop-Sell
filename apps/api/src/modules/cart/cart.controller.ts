import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthUserPayload } from '@shop-sell/shared';
import { CartService } from './cart.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('cart')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Public()
  @Get()
  async getCart(
    @CurrentUser() user?: AuthUserPayload,
    @Query('anonId') anonId?: string
  ) {
    const cart = await this.cartService.getOrCreateCart(user?.sub, anonId);
    const details = await this.cartService.getCartDetails(cart.id);
    return details;
  }

  @Public()
  @Post('items')
  async addItem(
    @CurrentUser() user: AuthUserPayload | null,
    @Body()
    body: {
      productId: string;
      qty: number;
      variantId?: string;
      anonId?: string;
    }
  ) {
    const cart = await this.cartService.getOrCreateCart(user?.sub, body.anonId);
    const item = await this.cartService.addItem(
      cart.id,
      body.productId,
      body.qty || 1,
      body.variantId
    );
    return { success: true, item };
  }

  @Public()
  @Patch('items/:itemId')
  async updateItemQty(
    @CurrentUser() user: AuthUserPayload | null,
    @Param('itemId') itemId: string,
    @Body() body: { qty: number; anonId?: string }
  ) {
    const cart = await this.cartService.getOrCreateCart(user?.sub, body.anonId);
    const result = await this.cartService.updateItemQty(cart.id, itemId, body.qty);
    return { success: true, result };
  }

  @Public()
  @Delete('items/:itemId')
  async removeItem(
    @CurrentUser() user: AuthUserPayload | null,
    @Param('itemId') itemId: string,
    @Query('anonId') anonId?: string
  ) {
    const cart = await this.cartService.getOrCreateCart(user?.sub, anonId);
    await this.cartService.removeItem(cart.id, itemId);
    return { success: true };
  }

  @Post('merge')
  async mergeCart(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { anonId: string }
  ) {
    const result = await this.cartService.mergeAnonymousCart(user.sub, body.anonId);
    return { success: true, ...result };
  }
}

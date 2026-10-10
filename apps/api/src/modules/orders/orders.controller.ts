import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUserPayload, CheckoutInputSchema } from '@shop-sell/shared';
import { OrdersService } from './orders.service';
import { ProductsService } from '../products/products.service';
import { CartService } from '../cart/cart.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('orders')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly cartService: CartService,
    private readonly productsService: ProductsService
  ) {}

  @Post()
  async checkout(
    @CurrentUser() user: AuthUserPayload,
    @Body()
    body: {
      shipping_address: any;
      idempotency_key: string;
      items?: Array<{ productId: string; variantId?: string; qty: number }>;
      razorpay_order_id?: string;
      payment_method?: string;
      upi_id?: string;
      utr_number?: string;
    }
  ) {
    CheckoutInputSchema.parse({
      shipping_address: body.shipping_address,
      idempotency_key: body.idempotency_key,
      payment_method: body.payment_method,
      upi_id: body.upi_id,
      utr_number: body.utr_number,
    });

    if (body.utr_number) {
      const cleanUtr = body.utr_number.trim();
      if (!/^\d{12}$/.test(cleanUtr)) {
        throw new BadRequestException('UTR number must be exactly 12 digits');
      }
    }

    let orderItems = body.items;

    // If items not directly supplied, fetch from user's cart
    if (!orderItems || orderItems.length === 0) {
      const cart = await this.cartService.getOrCreateCart(user.sub);
      const cartDetails = await this.cartService.getCartDetails(cart.id);
      orderItems = cartDetails.items.map((i: any) => ({
        productId: i.product_id,
        variantId: i.variant_id,
        qty: i.qty,
      }));
    }

    const result = await this.ordersService.placeOrder(
      user.sub,
      body.shipping_address,
      orderItems,
      body.idempotency_key,
      body.razorpay_order_id,
      body.payment_method || 'upi',
      body.upi_id,
      body.utr_number?.trim()
    );

    return { success: true, ...result };
  }

  @Get()
  async getMyOrders(@CurrentUser() user: AuthUserPayload) {
    const orders = await this.ordersService.getUserOrders(user.sub);
    return { orders };
  }

  @Get(':id')
  async getOrder(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    const order = await this.ordersService.getOrderById(id, user.sub);
    return { order };
  }

  @Roles('owner', 'admin')
  @Get('seller/manage')
  async getSellerOrders(@CurrentUser() user: AuthUserPayload) {
    let storeId: string | null = null;
    if (!user.roles.includes('admin')) {
      storeId = await this.productsService.getStoreIdForOwner(user.sub);
    } else {
      try {
        storeId = await this.productsService.getStoreIdForOwner(user.sub);
      } catch {
        storeId = null;
      }
    }
    const items = await this.ordersService.getSellerOrders(storeId);
    return { items };
  }

  @Roles('owner', 'admin')
  @Patch(':id/verify-utr')
  async verifyUtr(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') orderId: string,
    @Body() body: { decision: 'accept' | 'reject'; notes?: string }
  ) {
    if (!body || !['accept', 'reject'].includes(body.decision)) {
      throw new BadRequestException('Decision must be "accept" or "reject"');
    }

    let storeId: string | null = null;
    if (!user.roles.includes('admin')) {
      storeId = await this.productsService.getStoreIdForOwner(user.sub);
    }

    const result = await this.ordersService.verifyUtrPayment(
      orderId,
      body.decision,
      user.sub,
      storeId,
      body.notes
    );

    return result;
  }
}

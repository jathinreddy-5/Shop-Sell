import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUserPayload, RazorpayVerifyPaymentSchema } from '@shop-sell/shared';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Controller('payments')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  async createRazorpayOrder(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: { amount: number; receiptId: string }
  ) {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    const result = await this.paymentsService.createRazorpayOrder(
      body.amount,
      body.receiptId || `rcpt_${Date.now()}`
    );
    return { success: true, ...result };
  }

  @Post('verify')
  async verifyPayment(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: any
  ) {
    const validated = RazorpayVerifyPaymentSchema.parse(body);
    const isValid = this.paymentsService.verifyPaymentSignature(
      validated.razorpay_order_id,
      validated.razorpay_payment_id,
      validated.razorpay_signature
    );

    if (!isValid) {
      throw new BadRequestException('Invalid Razorpay payment signature');
    }

    const order = await this.paymentsService.markOrderPaid(
      validated.order_id,
      validated.razorpay_order_id,
      validated.razorpay_payment_id
    );

    return { success: true, verified: true, order };
  }

  @Public()
  @Post('razorpay-webhook')
  async handleWebhook(
    @Body() rawBody: any,
    @Headers('x-razorpay-signature') signature?: string
  ) {
    const bodyStr = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
    return this.paymentsService.handleWebhook(bodyStr, signature || '');
  }
}

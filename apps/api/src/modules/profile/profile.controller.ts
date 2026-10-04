import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Ip,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ProfileService } from './profile.service';
import {
  Step1OnboardingSchema,
  Step2OnboardingSchema,
  SendPhoneOtpSchema,
  VerifyPhoneOtpSchema,
  SendEmailVerificationSchema,
  PincodeWaitlistSchema,
  AddressInputSchema,
} from './dto/profile-onboarding.dto';

@Controller()
@UseGuards(SupabaseAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // 1. Current User Profile
  @Get('profile/me')
  async getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.sub);
  }

  // 2. Normalized Interest Categories (Public)
  @Public()
  @Get('profile/interests')
  async getInterests() {
    return this.profileService.getInterestCategories();
  }

  // 3. Onboarding: Step 1
  @Patch('profile/onboarding/step1')
  async updateStep1(@Req() req: any, @Body() body: any) {
    const parseRes = Step1OnboardingSchema.safeParse(body);
    if (!parseRes.success) {
      const err = parseRes.error.issues[0]?.message || 'Invalid step 1 onboarding payload';
      throw new BadRequestException(err);
    }
    return this.profileService.updateStep1(req.user.sub, parseRes.data);
  }

  // 4. Onboarding: Step 2
  @Patch('profile/onboarding/step2')
  async updateStep2(
    @Req() req: any,
    @Body() body: any,
    @Ip() clientIp: string,
    @Headers('user-agent') userAgent: string
  ) {
    const parseRes = Step2OnboardingSchema.safeParse(body);
    if (!parseRes.success) {
      const err = parseRes.error.issues[0]?.message || 'Invalid step 2 onboarding payload';
      throw new BadRequestException(err);
    }
    return this.profileService.updateStep2(req.user.sub, parseRes.data, clientIp, userAgent);
  }

  // 5. Onboarding: Skip
  @Post('profile/onboarding/skip')
  async skipOnboarding(@Req() req: any) {
    return this.profileService.skipOnboarding(req.user.sub);
  }

  // 6. Phone Verification
  @Post('profile/phone/otp/send')
  async sendPhoneOtp(@Req() req: any, @Body() body: any) {
    const parseRes = SendPhoneOtpSchema.safeParse(body);
    if (!parseRes.success) {
      throw new BadRequestException(parseRes.error.issues[0]?.message || 'Invalid phone number format');
    }
    return this.profileService.sendPhoneOtp(req.user.sub, parseRes.data.phone);
  }

  @Post('profile/phone/otp/verify')
  async verifyPhoneOtp(@Req() req: any, @Body() body: any) {
    const parseRes = VerifyPhoneOtpSchema.safeParse(body);
    if (!parseRes.success) {
      throw new BadRequestException(parseRes.error.issues[0]?.message || 'Invalid phone OTP verification payload');
    }
    return this.profileService.verifyPhoneOtp(req.user.sub, parseRes.data.phone, parseRes.data.otp);
  }

  // 7. Email Verification
  @Post('profile/email/verification/send')
  async sendEmailVerification(@Req() req: any, @Body() body: any) {
    const parseRes = SendEmailVerificationSchema.safeParse(body);
    if (!parseRes.success) {
      throw new BadRequestException(parseRes.error.issues[0]?.message || 'Invalid email address format');
    }
    return this.profileService.sendEmailVerification(req.user.sub, parseRes.data.email);
  }

  // 8. Pincode Serviceability & Waitlist (Public)
  @Public()
  @Get('pincode/:pincode/serviceability')
  async checkServiceability(@Param('pincode') pincode: string) {
    return this.profileService.checkServiceability(pincode);
  }

  @Public()
  @Post('pincode/waitlist')
  async joinWaitlist(@Req() req: any, @Body() body: any) {
    const parseRes = PincodeWaitlistSchema.safeParse(body);
    if (!parseRes.success) {
      throw new BadRequestException(parseRes.error.issues[0]?.message || 'Invalid waitlist request');
    }
    const userId = req.user?.sub || null;
    return this.profileService.joinWaitlist(parseRes.data.pincode, userId, parseRes.data.email || undefined);
  }

  // 9. Data Rights: Export & Erasure (GDPR / DPDP Act)
  @Get('profile/export')
  async exportMyData(@Req() req: any) {
    return this.profileService.exportMyData(req.user.sub);
  }

  @Delete('profile')
  async deleteMyAccount(@Req() req: any) {
    return this.profileService.deleteMyAccount(req.user.sub);
  }

  // 10. Multi-Address CRUD
  @Get('addresses')
  async listAddresses(@Req() req: any) {
    return this.profileService.listAddresses(req.user.sub);
  }

  @Post('addresses')
  async createAddress(@Req() req: any, @Body() body: any) {
    const parseRes = AddressInputSchema.safeParse(body);
    if (!parseRes.success) {
      throw new BadRequestException(parseRes.error.issues[0]?.message || 'Invalid address payload');
    }
    return this.profileService.createAddress(req.user.sub, parseRes.data);
  }

  @Patch('addresses/:id')
  async updateAddress(
    @Req() req: any,
    @Param('id') addressId: string,
    @Body() body: any
  ) {
    const parseRes = AddressInputSchema.partial().safeParse(body);
    if (!parseRes.success) {
      throw new BadRequestException(parseRes.error.issues[0]?.message || 'Invalid address update payload');
    }
    return this.profileService.updateAddress(req.user.sub, addressId, parseRes.data);
  }

  @Delete('addresses/:id')
  async deleteAddress(@Req() req: any, @Param('id') addressId: string) {
    return this.profileService.deleteAddress(req.user.sub, addressId);
  }

  @Patch('addresses/:id/default')
  async setDefaultAddress(
    @Req() req: any,
    @Param('id') addressId: string,
    @Body('type') type: 'shipping' | 'billing'
  ) {
    if (type && type !== 'shipping' && type !== 'billing') {
      throw new BadRequestException('Address type must be shipping or billing');
    }
    return this.profileService.setDefaultAddress(req.user.sub, addressId, type || 'shipping');
  }
}

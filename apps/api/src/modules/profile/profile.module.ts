import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { SMS_PROVIDER_TOKEN, MockSmsProvider } from './sms-provider.interface';

@Module({
  imports: [DatabaseModule],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    {
      provide: SMS_PROVIDER_TOKEN,
      useClass: MockSmsProvider,
    },
  ],
  exports: [ProfileService],
})
export class ProfileModule {}

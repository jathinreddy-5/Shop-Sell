import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { SellersModule } from './modules/sellers/sellers.module';
import { ProductsModule } from './modules/products/products.module';
import { SearchModule } from './modules/search/search.module';
import { CartModule } from './modules/cart/cart.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { EventsModule } from './modules/events/events.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { PayoutsModule } from './modules/payouts/payouts.module';
import { AdminModule } from './modules/admin/admin.module';
import { AdminCoreModule } from './modules/admin-core/admin-core.module';
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    SellersModule,
    ProductsModule,
    SearchModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    EventsModule,
    RecommendationsModule,
    PayoutsModule,
    AdminCoreModule,
    AdminModule,
    ProfileModule,
  ],
})
export class AppModule {}

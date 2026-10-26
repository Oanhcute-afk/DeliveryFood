import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { MenuModule } from './menu/menu.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { GatewayModule } from './gateway/gateway.module';
import { DriverModule } from './driver/driver.module';
import { LocationModule } from './location/location.module';
import { ReviewsModule } from './reviews/reviews.module';
import { CacheModule } from './cache/cache.module';
import { LegalModule } from './legal/legal.module';
import { MonitorModule } from './monitor/monitor.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule,
    DbModule,
    AuthModule,
    RestaurantsModule,
    MenuModule,
    OrdersModule,
    PaymentsModule,
    GatewayModule,
    DriverModule,
    LocationModule,
    ReviewsModule,
    LegalModule,
    MonitorModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

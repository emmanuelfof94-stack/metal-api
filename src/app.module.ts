import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { ProjectsModule } from './projects/projects.module';
import { PricingModule } from './pricing/pricing.module';
import { QuotesModule } from './quotes/quotes.module';
import { PaymentsModule } from './payments/payments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CustomersModule,
    ProjectsModule,
    PricingModule,
    QuotesModule,
    PaymentsModule,
    DashboardModule,
    UsersModule,
  ],
})
export class AppModule {}

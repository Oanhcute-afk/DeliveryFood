import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull, ne } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { UserRole } from '@food-delivery/types';
import { OrdersGateway } from '../gateway/orders.gateway';

@Injectable()
export class DriverService {
  constructor(
    @Inject('DB') private db: NeonHttpDatabase<typeof schema>,
    private ordersGateway: OrdersGateway,
  ) {}

  private async assignPendingOrdersToDriver(driverId: string) {
    const unassignedReadyOrders = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.status, 'READY'),
          isNull(schema.orders.driverId),
        ),
      );

    for (const order of unassignedReadyOrders) {
      const [updatedOrder] = await this.db
        .update(schema.orders)
        .set({ driverId, updatedAt: new Date() })
        .where(
          and(
            eq(schema.orders.id, order.id),
            isNull(schema.orders.driverId),
          ),
        )
        .returning();

      if (updatedOrder) {
        this.ordersGateway.emitDriverAssigned(driverId, updatedOrder);
      }
    }
  }

  async toggleOnline(driverId: string) {
    const [driver] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, driverId));

    if (!driver) throw new NotFoundException('Driver not found');

    const [updated] = await this.db
      .update(schema.users)
      .set({ isOnline: !driver.isOnline })
      .where(eq(schema.users.id, driverId))
      .returning();

    if (updated.isOnline) {
      await this.assignPendingOrdersToDriver(driverId);
    }

    return { isOnline: updated.isOnline };
  }

  async getStatus(driverId: string) {
    const [driver] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, driverId));

    if (!driver) throw new NotFoundException('Driver not found');

    if (driver.isOnline) {
      await this.assignPendingOrdersToDriver(driverId);
    }

    return { isOnline: driver.isOnline };
  }

  async assignDriver(orderId: string, excludeDriverId?: string) {
    const conditions = [
      eq(schema.users.role, UserRole.DRIVER),
      eq(schema.users.isOnline, true),
    ];

    if (excludeDriverId) {
      conditions.push(ne(schema.users.id, excludeDriverId));
    }

    const [driver] = await this.db
      .select()
      .from(schema.users)
      .where(and(...conditions));

    if (!driver) {
      console.log('No online drivers available for order:', orderId);
      return null; // order stays READY, no driverId
    }

    const [updatedOrder] = await this.db
      .update(schema.orders)
      .set({ driverId: driver.id, updatedAt: new Date() })
      .where(eq(schema.orders.id, orderId))
      .returning();

    // push to driver:<driverId> room — driver app shows incoming order modal
    this.ordersGateway.emitDriverAssigned(driver.id, updatedOrder);

    return updatedOrder;
  }

  async declineOrder(orderId: string, driverId: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));

    if (!order) throw new NotFoundException('Order not found');
    if (order.driverId !== driverId) {
      throw new NotFoundException('Order not found');
    }

    // clear assignment
    await this.db
      .update(schema.orders)
      .set({ driverId: null, updatedAt: new Date() })
      .where(eq(schema.orders.id, orderId));

    // try to find another online driver
    await this.assignDriver(orderId, driverId);

    return { message: 'Order declined' };
  }
}

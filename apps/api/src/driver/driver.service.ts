import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, ne } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { UserRole } from '@food-delivery/types';
import { OrdersGateway } from '../gateway/orders.gateway';

@Injectable()
export class DriverService {
  // Lưu danh sách tài xế đã từ chối từng đơn READY trong phiên làm việc
  private declinedByOrder = new Map<string, Set<string>>();

  constructor(
    @Inject('DB') private db: NeonHttpDatabase<typeof schema>,
    private ordersGateway: OrdersGateway,
  ) {}

  hasDriverDeclined(orderId: string, driverId: string): boolean {
    return this.declinedByOrder.get(orderId)?.has(driverId) ?? false;
  }

  clearOrderDeclines(orderId: string): void {
    this.declinedByOrder.delete(orderId);
  }

  clearDriverDeclines(driverId: string): void {
    for (const [orderId, drivers] of this.declinedByOrder.entries()) {
      drivers.delete(driverId);
      if (drivers.size === 0) {
        this.declinedByOrder.delete(orderId);
      }
    }
  }

  private async assignPendingOrdersToDriver(driverId: string) {
    const readyOrders = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.status, 'READY'));

    for (const order of readyOrders) {
      if (this.hasDriverDeclined(order.id, driverId)) {
        continue;
      }

      let orderToEmit = order;

      if (!order.driverId) {
        const [updatedOrder] = await this.db
          .update(schema.orders)
          .set({ driverId, updatedAt: new Date() })
          .where(eq(schema.orders.id, order.id))
          .returning();

        if (updatedOrder) {
          orderToEmit = updatedOrder;
        }
      }

      this.ordersGateway.emitDriverAssigned(driverId, orderToEmit);
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
      this.clearDriverDeclines(driverId);
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

    const onlineDrivers = await this.db
      .select()
      .from(schema.users)
      .where(and(...conditions))
      .orderBy(desc(schema.users.createdAt));

    const eligibleDrivers = onlineDrivers.filter(
      (d) => !this.hasDriverDeclined(orderId, d.id),
    );

    if (eligibleDrivers.length === 0) {
      console.log('No online drivers available for order:', orderId);
      await this.db
        .update(schema.orders)
        .set({ driverId: null, updatedAt: new Date() })
        .where(eq(schema.orders.id, orderId));
      return null; // order stays READY, no driverId
    }

    const primaryDriver = eligibleDrivers[0];

    const [updatedOrder] = await this.db
      .update(schema.orders)
      .set({ driverId: primaryDriver.id, updatedAt: new Date() })
      .where(eq(schema.orders.id, orderId))
      .returning();

    if (updatedOrder) {
      // Gửi thông báo đến tất cả tài xế đang trực tuyến chưa từ chối đơn này
      for (const driver of eligibleDrivers) {
        this.ordersGateway.emitDriverAssigned(driver.id, updatedOrder);
      }
    }

    return updatedOrder;
  }

  async declineOrder(orderId: string, driverId: string) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));

    if (!order) throw new NotFoundException('Order not found');

    let declinedSet = this.declinedByOrder.get(orderId);
    if (!declinedSet) {
      declinedSet = new Set<string>();
      this.declinedByOrder.set(orderId, declinedSet);
    }
    declinedSet.add(driverId);

    if (order.status === 'READY' && order.driverId === driverId) {
      // clear assignment
      await this.db
        .update(schema.orders)
        .set({ driverId: null, updatedAt: new Date() })
        .where(eq(schema.orders.id, orderId));

      // try to find another online driver
      await this.assignDriver(orderId, driverId);
    }

    return { message: 'Order declined' };
  }
}

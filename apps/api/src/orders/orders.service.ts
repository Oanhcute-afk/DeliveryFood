import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { asc, desc, eq, inArray, or, SQL } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { OrderStatus, UserRole } from '@food-delivery/types';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersGateway } from '../gateway/orders.gateway';
import { DriverService } from '../driver/driver.service';
import { VouchersService } from '../vouchers/vouchers.service';

@Injectable()
export class OrdersService {
  constructor(
    @Inject('DB') private db: NeonHttpDatabase<typeof schema>,
    private ordersGateway: OrdersGateway,
    private driverService: DriverService,
    private vouchersService: VouchersService,
  ) {}

  async create(customerId: string, dto: CreateOrderDto) {
    const menuItemIds = dto.items.map((i) => i.menuItemId);

    // fetch all menu items in one query
    const menuItems = await this.db
      .select()
      .from(schema.menuItems)
      .where(inArray(schema.menuItems.id, menuItemIds));

    // verify all menu item IDs were actually found in the DB
    if (menuItems.length !== dto.items.length) {
      throw new BadRequestException('One or more menu items not found');
    }

    // verify all items belong to the specified restaurant
    const allBelongToRestaurant = menuItems.every(
      (item) => item.restaurantId === dto.restaurantId,
    );

    if (!allBelongToRestaurant) {
      throw new BadRequestException(
        'All items must belong to the same restaurant',
      );
    }

    // calculate total server-side — never trust the client's price
    const total = dto.items.reduce((sum, orderItem) => {
      const menuItem = menuItems.find((m) => m.id === orderItem.menuItemId);
      if (!menuItem) return sum;
      return sum + parseFloat(menuItem.price) * parseInt(orderItem.quantity);
    }, 0);

    // apply voucher — re-validated server-side, discount never comes from the client
    const applied = dto.voucherId
      ? await this.vouchersService.applyToOrder(
          customerId,
          dto.voucherId,
          total,
        )
      : null;
    const discount = applied?.discount ?? 0;

    const isCash = dto.paymentMethod === 'CASH';
    const status: OrderStatus = isCash ? 'CONFIRMED' : 'PENDING';

    // insert the order
    const [order] = await this.db
      .insert(schema.orders)
      .values({
        customerId,
        restaurantId: dto.restaurantId,
        deliveryAddress: dto.deliveryAddress,
        subtotalAmount: total.toFixed(2),
        discountAmount: discount.toFixed(2),
        totalAmount: (total - discount).toFixed(2),
        voucherId: applied?.voucher.id ?? null,
        voucherCode: applied?.voucher.code ?? null,
        paymentMethod: isCash ? 'CASH' : 'STRIPE',
        isPaid: false,
        note: dto.note?.trim() || null,
        status,
      })
      .returning();

    // insert all order items
    await this.db.insert(schema.orderItems).values(
      dto.items.map((item) => {
        const menuItem = menuItems.find((m) => m.id === item.menuItemId)!;
        return {
          orderId: order.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: menuItem.price, // snapshot the price at time of order
        };
      }),
    );

    if (isCash) {
      this.ordersGateway.emitOrderUpdate(order);
    }

    const [enriched] = await this.enrichOrders([order]);
    return enriched;
  }

  async findByCustomer(customerId: string) {
    return this.findOrdersWithDetails(eq(schema.orders.customerId, customerId));
  }

  async findByDriver(driverId: string) {
    // Hiển thị các đơn đã gán cho tài xế này CÙNG VỚI mọi đơn READY đang chờ tài xế nhận
    const orders = await this.findOrdersWithDetails(
      or(
        eq(schema.orders.driverId, driverId),
        eq(schema.orders.status, 'READY'),
      )!,
    );

    return orders.filter(
      (o) =>
        o.status !== 'READY' ||
        !this.driverService.hasDriverDeclined(o.id, driverId),
    );
  }

  // routes to customer or driver query based on JWT role
  async findMyOrders(userId: string, role: string) {
    if (role === UserRole.DRIVER) {
      return this.findByDriver(userId);
    }
    return this.findByCustomer(userId);
  }

  async findById(id: string, user: { sub: string; role: string }) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id));

    if (!order) throw new NotFoundException('Order not found');

    // check access by role — each role can only view orders they're involved in
    const canView =
      (user.role === UserRole.CUSTOMER && order.customerId === user.sub) ||
      (user.role === UserRole.RESTAURANT_OWNER &&
        (await this.isOwnerOfRestaurant(user.sub, order.restaurantId))) ||
      (user.role === UserRole.DRIVER &&
        (order.driverId === user.sub || order.status === 'READY'));

    if (!canView) throw new NotFoundException('Order not found');

    const [enriched] = await this.enrichOrders([order]);
    return enriched;
  }

  async findByRestaurant(ownerId: string) {
    const [restaurant] = await this.db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.ownerId, ownerId));

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    return this.findOrdersWithDetails(
      eq(schema.orders.restaurantId, restaurant.id),
    );
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    user: { sub: string; role: string },
    cancelReason?: string,
  ) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));

    if (!order) throw new NotFoundException('Order not found');

    this.validateTransition(order.status, newStatus, user.role);

    if (user.role === UserRole.CUSTOMER) {
      if (order.customerId !== user.sub) {
        throw new ForbiddenException('Đơn hàng này không thuộc về bạn');
      }
      if (!cancelReason?.trim()) {
        throw new BadRequestException('Vui lòng chọn lý do hủy đơn hàng');
      }
    }

    if (user.role === UserRole.RESTAURANT_OWNER) {
      const [restaurant] = await this.db
        .select()
        .from(schema.restaurants)
        .where(eq(schema.restaurants.ownerId, user.sub));

      if (!restaurant || restaurant.id !== order.restaurantId) {
        throw new ForbiddenException(
          'This order does not belong to your restaurant',
        );
      }
    }

    if (user.role === UserRole.DRIVER) {
      // Với đơn đang ở trạng thái READY chuyển sang PICKED_UP, cho phép bất kỳ tài xế nào nhận đơn
      if (order.status !== 'READY' && order.driverId !== user.sub) {
        throw new ForbiddenException('This order is not assigned to you');
      }
    }

    const updateValues: Partial<typeof schema.orders.$inferInsert> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === 'CANCELLED' && cancelReason?.trim()) {
      updateValues.cancelReason = cancelReason.trim();
    }

    if (user.role === UserRole.DRIVER && newStatus === 'PICKED_UP') {
      updateValues.driverId = user.sub;
      this.driverService.clearOrderDeclines(orderId);
    }

    if (user.role === UserRole.DRIVER && newStatus === 'DELIVERED') {
      updateValues.driverDeliveredAt = new Date();
      if (order.paymentMethod === 'CASH') {
        updateValues.isPaid = true;
        updateValues.cashReceivedAt = new Date();
      }
    }

    const [updated] = await this.db
      .update(schema.orders)
      .set(updateValues)
      .where(eq(schema.orders.id, orderId))
      .returning();

    this.ordersGateway.emitOrderUpdate(updated);

    if (newStatus === 'READY') {
      await this.driverService.assignDriver(orderId);
    }

    const [enriched] = await this.enrichOrders([updated]);
    return enriched;
  }

  async confirmReceived(orderId: string, user: { sub: string; role: string }) {
    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, orderId));

    if (!order) throw new NotFoundException('Order not found');

    if (order.customerId !== user.sub) {
      throw new ForbiddenException('Đơn hàng này không thuộc về bạn');
    }

    const [updated] = await this.db
      .update(schema.orders)
      .set({
        status: 'DELIVERED',
        customerConfirmedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.orders.id, orderId))
      .returning();

    this.ordersGateway.emitOrderUpdate(updated);

    const [enriched] = await this.enrichOrders([updated]);
    return enriched;
  }

  async getMessages(orderId: string, user: { sub: string; role: string }) {
    // Check permission to view order
    await this.findById(orderId, user);

    const messages = await this.db
      .select()
      .from(schema.orderMessages)
      .where(eq(schema.orderMessages.orderId, orderId))
      .orderBy(asc(schema.orderMessages.createdAt));

    return messages;
  }

  async addMessage(
    orderId: string,
    user: { sub: string; role: string },
    content: string,
  ) {
    if (!content?.trim()) {
      throw new BadRequestException('Nội dung tin nhắn không được để trống');
    }

    // Check permission to view order
    await this.findById(orderId, user);

    // Get sender info
    const [sender] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, user.sub));

    let senderName = sender
      ? `${sender.firstName} ${sender.lastName}`.trim()
      : 'Người dùng';

    if (user.role === UserRole.RESTAURANT_OWNER) {
      const [order] = await this.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, orderId));
      if (order) {
        const [restaurant] = await this.db
          .select({ name: schema.restaurants.name })
          .from(schema.restaurants)
          .where(eq(schema.restaurants.id, order.restaurantId));
        if (restaurant?.name) {
          senderName = `${restaurant.name} (Quán)`;
        }
      }
    } else if (user.role === UserRole.DRIVER && (!senderName || senderName === 'Người dùng')) {
      senderName = 'Tài xế';
    } else if (user.role === UserRole.CUSTOMER && (!senderName || senderName === 'Người dùng')) {
      senderName = 'Khách hàng';
    }

    const [message] = await this.db
      .insert(schema.orderMessages)
      .values({
        orderId,
        senderId: user.sub,
        senderName,
        senderRole: user.role,
        content: content.trim(),
      })
      .returning();

    this.ordersGateway.emitOrderChat(orderId, message);

    return message;
  }

  private validateTransition(
    currentStatus: string,
    newStatus: string,
    role: string,
  ) {
    const customerTransitions: Record<string, string[]> = {
      PENDING: ['CANCELLED'],
    };

    const ownerTransitions: Record<string, string[]> = {
      CONFIRMED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
    };

    const driverTransitions: Record<string, string[]> = {
      READY: ['PICKED_UP'],
      PICKED_UP: ['DELIVERED'],
    };

    const allowed =
      role === UserRole.CUSTOMER
        ? (customerTransitions[currentStatus] ?? [])
        : role === UserRole.RESTAURANT_OWNER
          ? (ownerTransitions[currentStatus] ?? [])
          : role === UserRole.DRIVER
            ? (driverTransitions[currentStatus] ?? [])
            : [];

    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async isOwnerOfRestaurant(ownerId: string, restaurantId: string) {
    const [restaurant] = await this.db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.ownerId, ownerId));

    return restaurant?.id === restaurantId;
  }

  private async enrichOrders(orderRows: (typeof schema.orders.$inferSelect)[]) {
    if (orderRows.length === 0) return [];

    const now = Date.now();
    for (const order of orderRows) {
      // Tự động hoàn thành sau 24h kể từ khi shipper xác nhận giao hàng nếu khách chưa bấm
      if (order.driverDeliveredAt && !order.customerConfirmedAt) {
        const deliveredTime = new Date(order.driverDeliveredAt).getTime();
        if (now - deliveredTime >= 24 * 60 * 60 * 1000) {
          order.customerConfirmedAt = new Date(
            deliveredTime + 24 * 60 * 60 * 1000,
          );
          void this.db
            .update(schema.orders)
            .set({
              customerConfirmedAt: order.customerConfirmedAt,
              updatedAt: new Date(),
            })
            .where(eq(schema.orders.id, order.id));
        }
      }
    }

    const orderIds = orderRows.map((o) => o.id);
    const restaurantIds = [...new Set(orderRows.map((o) => o.restaurantId))];

    const customerIds = [
      ...new Set(orderRows.map((o) => o.customerId).filter(Boolean)),
    ];
    const driverIds = [
      ...new Set(
        orderRows.map((o) => o.driverId).filter(Boolean) as string[],
      ),
    ];

    const [restaurants, items] = await Promise.all([
      this.db
        .select({
          id: schema.restaurants.id,
          name: schema.restaurants.name,
          address: schema.restaurants.address,
          imageUrl: schema.restaurants.imageUrl,
          cuisineType: schema.restaurants.cuisineType,
          ownerId: schema.restaurants.ownerId,
        })
        .from(schema.restaurants)
        .where(inArray(schema.restaurants.id, restaurantIds)),

      this.db
        .select({
          id: schema.orderItems.id,
          orderId: schema.orderItems.orderId,
          menuItemId: schema.orderItems.menuItemId,
          quantity: schema.orderItems.quantity,
          unitPrice: schema.orderItems.unitPrice,
          menuItem: {
            id: schema.menuItems.id,
            name: schema.menuItems.name,
            imageUrl: schema.menuItems.imageUrl,
            price: schema.menuItems.price,
          },
        })
        .from(schema.orderItems)
        .leftJoin(
          schema.menuItems,
          eq(schema.orderItems.menuItemId, schema.menuItems.id),
        )
        .where(inArray(schema.orderItems.orderId, orderIds)),
    ]);

    const ownerIds = restaurants.map((r) => r.ownerId).filter(Boolean);
    const userIds = [...new Set([...customerIds, ...driverIds, ...ownerIds])];

    const userList =
      userIds.length > 0
        ? await this.db
            .select({
              id: schema.users.id,
              firstName: schema.users.firstName,
              lastName: schema.users.lastName,
              phone: schema.users.phone,
              avatarUrl: schema.users.avatarUrl,
            })
            .from(schema.users)
            .where(inArray(schema.users.id, userIds))
        : [];

    const userMap = Object.fromEntries(userList.map((u) => [u.id, u]));

    const restaurantMap = Object.fromEntries(
      restaurants.map((r) => [
        r.id,
        {
          ...r,
          phone: userMap[r.ownerId]?.phone ?? null,
        },
      ]),
    );

    return orderRows.map((order) => ({
      ...order,
      restaurant: restaurantMap[order.restaurantId],
      items: items.filter((i) => i.orderId === order.id),
      customer: userMap[order.customerId] ?? null,
      driver: order.driverId ? userMap[order.driverId] ?? null : null,
    }));
  }

  // shared fetch: filter orders, sort newest first, enrich with relations
  private async findOrdersWithDetails(where: SQL) {
    const orderRows = await this.db
      .select()
      .from(schema.orders)
      .where(where)
      .orderBy(desc(schema.orders.createdAt));

    return this.enrichOrders(orderRows);
  }
}

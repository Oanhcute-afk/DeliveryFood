import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { SignupRole } from '@food-delivery/types';
import * as schema from '../db/schema';
import { BlockedUsersService } from '../auth/blocked-users.service';
import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../cache/cache-keys';

const LIST_LIMIT = 200;

// Ghi rõ "bảng"."cột" trong subquery: khi select 1 bảng, drizzle bỏ tên bảng
// nên "id" trong subquery sẽ bị hiểu nhầm là cột của bảng con
const col = (table: string, column: string) =>
  sql.raw(`"${table}"."${column}"`);
const PAID = sql.raw(
  `('CONFIRMED','PREPARING','READY','PICKED_UP','DELIVERED')`,
);

@Injectable()
export class AdminService {
  constructor(
    @Inject('DB') private db: NeonHttpDatabase<typeof schema>,
    private blockedUsers: BlockedUsersService,
    private cacheService: CacheService,
  ) {}

  listUsers(role: SignupRole, search?: string) {
    const { users } = schema;
    const filters: SQL[] = [eq(users.role, role)];
    const term = search?.trim();
    if (term) {
      filters.push(
        or(
          ilike(users.firstName, `%${term}%`),
          ilike(users.lastName, `%${term}%`),
          ilike(users.email, `%${term}%`),
        )!,
      );
    }

    return this.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        isOnline: users.isOnline,
        isBlocked: users.isBlocked,
        hasGoogle: sql<boolean>`${users.googleId} is not null`,
        createdAt: users.createdAt,
        // Khách hàng
        orderCount:
          sql<number>`(select count(*) from "orders" where ${col('orders', 'customer_id')} = ${col('users', 'id')})`.mapWith(
            Number,
          ),
        totalSpent:
          sql<number>`(select coalesce(sum(${col('orders', 'total_amount')}), 0) from "orders" where ${col('orders', 'customer_id')} = ${col('users', 'id')} and ${col('orders', 'status')} in ${PAID})`.mapWith(
            Number,
          ),
        // Tài xế
        deliveredCount:
          sql<number>`(select count(*) from "orders" where ${col('orders', 'driver_id')} = ${col('users', 'id')} and ${col('orders', 'status')} = 'DELIVERED')`.mapWith(
            Number,
          ),
        activeDeliveries:
          sql<number>`(select count(*) from "orders" where ${col('orders', 'driver_id')} = ${col('users', 'id')} and ${col('orders', 'status')} = 'PICKED_UP')`.mapWith(
            Number,
          ),
        // Chủ nhà hàng
        restaurantCount:
          sql<number>`(select count(*) from "restaurants" where ${col('restaurants', 'owner_id')} = ${col('users', 'id')})`.mapWith(
            Number,
          ),
      })
      .from(users)
      .where(and(...filters))
      .orderBy(desc(users.createdAt))
      .limit(LIST_LIMIT);
  }

  async setUserBlocked(userId: string, blocked: boolean) {
    const [user] = await this.db
      .select({ id: schema.users.id, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, userId));

    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') {
      throw new ForbiddenException('Admin accounts cannot be locked');
    }

    const [updated] = await this.db
      .update(schema.users)
      .set({
        isBlocked: blocked,
        // Tài xế bị khoá thì không nhận đơn mới
        ...(blocked ? { isOnline: false } : {}),
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning({
        id: schema.users.id,
        isBlocked: schema.users.isBlocked,
        isOnline: schema.users.isOnline,
      });

    this.blockedUsers.setBlocked(userId, blocked);
    return updated;
  }

  listRestaurants(search?: string) {
    const { restaurants, users } = schema;
    const term = search?.trim();

    return this.db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        address: restaurants.address,
        cuisineType: restaurants.cuisineType,
        imageUrl: restaurants.imageUrl,
        isOpen: restaurants.isOpen,
        rating: restaurants.rating,
        createdAt: restaurants.createdAt,
        owner: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          isBlocked: users.isBlocked,
        },
        orderCount:
          sql<number>`(select count(*) from "orders" where ${col('orders', 'restaurant_id')} = ${col('restaurants', 'id')})`.mapWith(
            Number,
          ),
        revenue:
          sql<number>`(select coalesce(sum(${col('orders', 'total_amount')}), 0) from "orders" where ${col('orders', 'restaurant_id')} = ${col('restaurants', 'id')} and ${col('orders', 'status')} in ${PAID})`.mapWith(
            Number,
          ),
      })
      .from(restaurants)
      .innerJoin(users, eq(users.id, restaurants.ownerId))
      .where(
        term
          ? or(
              ilike(restaurants.name, `%${term}%`),
              ilike(restaurants.address, `%${term}%`),
              ilike(users.email, `%${term}%`),
            )
          : undefined,
      )
      .orderBy(desc(restaurants.createdAt))
      .limit(LIST_LIMIT);
  }

  async setRestaurantOpen(id: string, isOpen: boolean) {
    const [updated] = await this.db
      .update(schema.restaurants)
      .set({ isOpen, updatedAt: new Date() })
      .where(eq(schema.restaurants.id, id))
      .returning({
        id: schema.restaurants.id,
        isOpen: schema.restaurants.isOpen,
      });

    if (!updated) throw new NotFoundException('Restaurant not found');

    await this.cacheService.del(
      CacheKeys.RESTAURANTS_ALL,
      CacheKeys.RESTAURANT_BY_ID(id),
    );
    return updated;
  }
}

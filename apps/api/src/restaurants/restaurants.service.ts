import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, ilike, or } from 'drizzle-orm';
import { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { CacheService } from '../cache/cache.service';
import { CacheKeys } from '../cache/cache-keys';

@Injectable()
export class RestaurantsService {
  private readonly logger = new Logger(RestaurantsService.name);

  constructor(
    @Inject('DB') private db: NeonHttpDatabase<typeof schema>,
    private cacheService: CacheService,
  ) {}

  async create(ownerId: string, dto: CreateRestaurantDto) {
    const [existing] = await this.db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.ownerId, ownerId));

    if (existing) {
      throw new ForbiddenException('You already have a restaurant');
    }

    const [restaurant] = await this.db
      .insert(schema.restaurants)
      .values({
        ownerId,
        name: dto.name,
        description: dto.description,
        address: dto.address,
        cuisineType: dto.cuisineType,
        imageUrl: dto.imageUrl,
      })
      .returning();

    await this.cacheService.del(CacheKeys.RESTAURANTS_ALL);

    return restaurant;
  }

  async findMine(ownerId: string) {
    const [restaurant] = await this.db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.ownerId, ownerId));

    return restaurant ?? null;
  }

  async findById(id: string) {
    const [restaurant] = await this.db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.id, id));

    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async findAll(search?: string) {
    // if search is provided, filter by name OR cuisine type (case-insensitive)
    // only return open restaurants to customers
    if (search) {
      return this.db
        .select()
        .from(schema.restaurants)
        .where(
          and(
            eq(schema.restaurants.isOpen, true),
            or(
              ilike(schema.restaurants.name, `%${search}%`),
              ilike(schema.restaurants.cuisineType, `%${search}%`),
            ),
          ),
        );
    }

    const cached = await this.cacheService.get<
      (typeof schema.restaurants.$inferSelect)[]
    >(CacheKeys.RESTAURANTS_ALL);

    if (cached) {
      this.logger.log('Returning restaurants from cache');
      return cached;
    }

    this.logger.log('Cache miss — fetching restaurants from DB');

    const restaurants = this.db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.isOpen, true));

    await this.cacheService.set(CacheKeys.RESTAURANTS_ALL, restaurants, 300);

    return restaurants;
  }

  async update(id: string, ownerId: string, dto: UpdateRestaurantDto) {
    const [restaurant] = await this.db
      .select()
      .from(schema.restaurants)
      .where(eq(schema.restaurants.id, id));

    if (!restaurant) throw new NotFoundException('Restaurant not found');

    if (restaurant.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this restaurant');
    }

    const [updated] = await this.db
      .update(schema.restaurants)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(schema.restaurants.id, id))
      .returning();

    await this.cacheService.del(
      CacheKeys.RESTAURANTS_ALL,
      CacheKeys.RESTAURANT_BY_ID(id),
    );

    this.logger.log(`Cache invalidated for restaurant ${id}`);

    return updated;
  }
}

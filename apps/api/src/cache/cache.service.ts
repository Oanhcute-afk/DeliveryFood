import { Injectable, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class CacheService {
  private readonly redis: Redis;
  private readonly logger = new Logger(CacheService.name);

  constructor() {
    this.redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get<string>(key);

      if (data == null) {
        return null;
      }

      const parsed: unknown =
        typeof data === 'string' ? JSON.parse(data) : data;

      return parsed as T;
    } catch (error) {
      this.logger.error(
        `Cache GET error for key "${key}"`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds = 300,
  ): Promise<void> {
    let serialized: string | undefined;

    // Tách lỗi serialize khỏi lỗi Redis.
    // Không thể JSON hóa schema Drizzle hoặc dữ liệu có tham chiếu vòng.
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      this.logger.warn(
        `Cache SET skipped for key "${key}": value is not JSON-serializable. ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    if (serialized === undefined) {
      this.logger.warn(
        `Cache SET skipped for key "${key}": JSON.stringify returned undefined`,
      );
      return;
    }

    try {
      await this.redis.set(key, serialized, {
        ex: ttlSeconds,
      });
    } catch (error) {
      this.logger.error(
        `Cache SET error for key "${key}"`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      await this.redis.del(...keys);
    } catch (error) {
      this.logger.error(
        `Cache DEL error for keys "${keys.join(', ')}"`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
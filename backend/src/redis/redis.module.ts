import { Global, Inject, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Injectable()
class RedisLifecycle implements OnModuleDestroy {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    if (this.redis.status === 'end') return;
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
          maxRetriesPerRequest: 2,
          retryStrategy: (attempt) => Math.min(attempt * 1000, 5000),
        }),
    },
    RedisLifecycle,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}

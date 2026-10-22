import { Module, Global } from '@nestjs/common';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

@Global()
@Module({
  providers: [
    {
      provide: 'DB',
      useFactory: () => {
        const sql = neon(process.env.DATABASE_URL!);
        return drizzle(sql, { schema });
      },
    },
  ],
  exports: ['DB'],
})
export class DbModule {}

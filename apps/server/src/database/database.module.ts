import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        const common = {
          type: 'postgres' as const,
          autoLoadEntities: true,
          // off in production unless DB_SYNC=true bootstraps a fresh schema
          synchronize: config.get('NODE_ENV') !== 'production' || config.get('DB_SYNC') === 'true',
        };
        if (url) return { ...common, url };
        return {
          ...common,
          host: config.get<string>('PGHOST', 'localhost'),
          port: Number(config.get('PGPORT', 5432)),
          username: config.get<string>('PGUSER', 'watchbear'),
          password: config.get<string>('PGPASSWORD', 'watchbear'),
          database: config.get<string>('PGDATABASE', 'watchbear'),
        };
      },
    }),
  ],
})
export class DatabaseModule {}

import { Module } from '@nestjs/common';
import { AppConfigModule } from 'config/config.module';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [BotModule, AppConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';

// @Module({
//   imports: [
//     TypeOrmModule.forRoot({
//       type: 'postgres',
//       host: 'DB_HOST',
//       port: 5432,
//       username: 'DB_USER',
//       password: 'DB_PASSWORD',
//       database: 'DB_NAME',

//       entities: [__dirname + '/**/*.entity{.ts,.js}'],
//       migrations: [__dirname + '/migrations/*{.ts,.js}'],

//       synchronize: false, // ВАЖНО
//       migrationsRun: false,
//     }),
//   ],
// })
// export class AppModule {}

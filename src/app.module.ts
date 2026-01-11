import { Module } from '@nestjs/common';
import { BotModule } from 'bot/bot.module';
import { AppConfigModule } from 'config/config.module';

@Module({
  imports: [BotModule, AppConfigModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

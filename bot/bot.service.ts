import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { WELCOME_MESSAGE, COMMANDS_LIST } from './bot.constants';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf<any>;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) throw new Error('BOT_TOKEN не задан в .env');

    this.bot = new Telegraf(token);

    // Команда /start

this.bot.start(async (ctx) => {
  // Отправляем картинку
  await ctx.replyWithPhoto('blob:https://web.telegram.org/a00fca3d-35c5-4943-826d-a313182fa627');

  // Отправляем текст
  await ctx.reply(WELCOME_MESSAGE);
  await ctx.reply('Доступные команды:\n' + COMMANDS_LIST.join('\n'));
});

    // Заглушка для всех сообщений
    this.bot.on('message', (ctx) => {
      ctx.reply('Команда заглушка. Пока что бот реагирует только на /start.');
    });

    // Запуск бота
    this.bot.launch().then(() => console.log('Telegram Bot запущен 🚀'));
  }
}
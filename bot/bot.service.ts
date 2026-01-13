import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { USER_STATE } from './bot-state';
import { BOOKINGS, SERVICES, TIME_SLOTS } from './bot.constants';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf<any>;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const token = this.configService.get<string>('BOT_TOKEN');
    if (!token) throw new Error('BOT_TOKEN не задан');

    this.bot = new Telegraf(token);

    /* ===== START ===== */
    this.bot.start(async (ctx) => {
      USER_STATE.set(ctx.from.id, { step: 'idle' });

      await ctx.reply(
        'Привет! Я бот для записи на услуги.',
        Markup.keyboard([['📅 Записаться'], ['📋 Мои записи']]).resize()
      );
    });

    /* ===== ЗАПИСАТЬСЯ ===== */
    this.bot.hears('📅 Записаться', async (ctx) => {
      USER_STATE.set(ctx.from.id, { step: 'service' });

      await ctx.reply(
        'Выберите услугу:',
        Markup.inlineKeyboard([
          ...SERVICES.map((s) => [Markup.button.callback(s.name, `service_${s.id}`)]),
          [Markup.button.callback('❌ Отменить', 'cancel')],
        ])
      );
    });

    /* ===== ВЫБОР УСЛУГИ ===== */
    this.bot.action(/service_(\d+)/, async (ctx) => {
      const serviceId = Number(ctx.match[1]);
      const service = SERVICES.find((s) => s.id === serviceId);
      if (!service) return;

      USER_STATE.set(ctx.from.id, { step: 'date', serviceId });

      await ctx.editMessageText(
        `Вы выбрали услугу: ${service.name}\n\nВыберите дату:`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('Сегодня', 'date_today'),
            Markup.button.callback('Завтра', 'date_tomorrow'),
          ],
          [Markup.button.callback('⬅ Назад', 'back_to_service')],
          [Markup.button.callback('❌ Отменить', 'cancel')],
        ])
      );
    });

    /* ===== НАЗАД К УСЛУГАМ ===== */
    this.bot.action('back_to_service', async (ctx) => {
      USER_STATE.set(ctx.from.id, { step: 'service' });

      await ctx.editMessageText(
        'Выберите услугу:',
        Markup.inlineKeyboard([
          ...SERVICES.map((s) => [Markup.button.callback(s.name, `service_${s.id}`)]),
          [Markup.button.callback('❌ Отменить', 'cancel')],
        ])
      );
    });

    /* ===== ВЫБОР ДАТЫ ===== */
    this.bot.action(/date_(today|tomorrow)/, async (ctx) => {
      const state = USER_STATE.get(ctx.from.id);
      if (!state || !state.serviceId) return;

      const service = SERVICES.find((s) => s.id === state.serviceId);
      if (!service) return;

      const date = ctx.match[1] === 'today' ? new Date() : new Date(Date.now() + 86400000);
      const dateStr = date.toISOString().slice(0, 10);

      USER_STATE.set(ctx.from.id, { ...state, step: 'time', date: dateStr });

      await ctx.editMessageText(
        `Вы выбрали услугу: ${service.name}\nВыбрана дата: ${dateStr}\n\nТеперь выберите время:`,
        Markup.inlineKeyboard([
          TIME_SLOTS.map((t) => Markup.button.callback(t, `time_${t}`)),
          [Markup.button.callback('⬅ Назад', 'back_to_date')],
          [Markup.button.callback('❌ Отменить', 'cancel')],
        ])
      );
    });

    /* ===== НАЗАД К ДАТЕ ===== */
    this.bot.action('back_to_date', async (ctx) => {
      const state = USER_STATE.get(ctx.from.id);
      if (!state || !state.serviceId) return;

      const service = SERVICES.find((s) => s.id === state.serviceId);
      if (!service) return;

      USER_STATE.set(ctx.from.id, { step: 'date', serviceId: state.serviceId });

      await ctx.editMessageText(
        `Вы выбрали услугу: ${service.name}\n\nВыберите дату:`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback('Сегодня', 'date_today'),
            Markup.button.callback('Завтра', 'date_tomorrow'),
          ],
          [Markup.button.callback('⬅ Назад', 'back_to_service')],
          [Markup.button.callback('❌ Отменить', 'cancel')],
        ])
      );
    });

    /* ===== ВЫБОР ВРЕМЕНИ ===== */
    this.bot.action(/time_(\d{2}:\d{2})/, async (ctx) => {
      const time = ctx.match[1];
      const userId = ctx.from.id;
      const state = USER_STATE.get(userId);

      if (!state || !state.serviceId || !state.date) return;

      const service = SERVICES.find((s) => s.id === state.serviceId);
      if (!service) return;

      USER_STATE.set(userId, { ...state, step: 'confirm', time });

      await ctx.editMessageText(
        `Вы выбрали услугу: ${service.name}\nВыбрана дата: ${state.date}\nВыбрано время: ${time}\n\nПодтвердите запись:`,
        Markup.inlineKeyboard([
          [Markup.button.callback('✅ Подтвердить', 'confirm')],
          [Markup.button.callback('⬅ Назад', 'back_to_time')],
          [Markup.button.callback('❌ Отменить', 'cancel')],
        ])
      );
    });

    /* ===== НАЗАД К ВРЕМЕНИ ===== */
    this.bot.action('back_to_time', async (ctx) => {
      const state = USER_STATE.get(ctx.from.id);
      if (!state || !state.serviceId || !state.date) return;

      const service = SERVICES.find((s) => s.id === state.serviceId);
      if (!service) return;

      USER_STATE.set(ctx.from.id, { step: 'time', serviceId: state.serviceId, date: state.date });

      await ctx.editMessageText(
        `Вы выбрали услугу: ${service.name}\nВыбрана дата: ${state.date}\n\nТеперь выберите время:`,
        Markup.inlineKeyboard([
          TIME_SLOTS.map((t) => Markup.button.callback(t, `time_${t}`)),
          [Markup.button.callback('⬅ Назад', 'back_to_date')],
          [Markup.button.callback('❌ Отменить', 'cancel')],
        ])
      );
    });

    /* ===== ПОДТВЕРЖДЕНИЕ ===== */
    this.bot.action('confirm', async (ctx) => {
      const userId = ctx.from.id;
      const state = USER_STATE.get(userId);

      if (!state || !state.serviceId || !state.date || !state.time) {
        USER_STATE.set(userId, { step: 'idle' });
        await ctx.reply('Сессия устарела. Напишите /start');
        return;
      }

      const service = SERVICES.find((s) => s.id === state.serviceId);
      if (!service) return;

      BOOKINGS.push({
        id: BOOKINGS.length + 1,
        userId,
        serviceId: state.serviceId,
        date: state.date,
        time: state.time,
        status: 'active',
      });

      USER_STATE.set(userId, { step: 'idle' });

      await ctx.editMessageText(
        `✅ Вы успешно записаны!\n\n` +
        `Услуга: ${service.name}\n` +
        `Дата: ${state.date}\n` +
        `Время: ${state.time}\n\n` +
        `Если что-то изменится или потребуется дополнительная информация, мы обязательно с вами свяжемся. ` +
        `Спасибо, что выбрали нас!`
      );
    });

    /* ===== ОТМЕНА ===== */
    this.bot.action('cancel', async (ctx) => {
      USER_STATE.set(ctx.from.id, { step: 'idle' });
      await ctx.reply('Запись отменена.');
    });

    /* ===== МОИ ЗАПИСИ ===== */
    this.bot.hears('📋 Мои записи', async (ctx) => {
      const userBookings = BOOKINGS.filter(
        (b) => b.userId === ctx.from.id && b.status === 'active'
      );

      if (!userBookings.length) {
        await ctx.reply('У вас нет активных записей.');
        return;
      }

      const text = userBookings
        .map((b) => {
          const service = SERVICES.find((s) => s.id === b.serviceId);
          return `• ${service?.name} — ${b.date} ${b.time}`;
        })
        .join('\n');

      await ctx.reply(`Ваши записи:\n\n${text}`);
    });

    /* ===== LAUNCH ===== */
    this.bot.launch();
    console.log('Telegram Bot запущен 🚀');
  }
}
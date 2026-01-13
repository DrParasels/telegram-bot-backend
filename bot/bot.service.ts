import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import { SERVICES, BOOKINGS } from './bot.constants';
import { USER_STATE } from './bot-state';

@Injectable()
export class BotService implements OnModuleInit {
    private bot: Telegraf<any>;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const token = this.configService.get<string>('BOT_TOKEN');
        if (!token) throw new Error('BOT_TOKEN не задан');

        this.bot = new Telegraf(token);

        this.bot.start(async (ctx) => {
            USER_STATE.set(ctx.from.id, { step: 'idle' });

            await ctx.reply(
                'Привет! Я бот для записи на услуги.',
                Markup.keyboard([['📅 Записаться'], ['📋 Мои записи']]).resize()
            );
        });

        // Записаться
        this.bot.hears('📅 Записаться', async (ctx) => {
            USER_STATE.set(ctx.from.id, { step: 'service' });

            await ctx.reply(
                'Выберите услугу:',
                Markup.inlineKeyboard(
                    SERVICES.map((s) =>
                        Markup.button.callback(s.name, `service_${s.id}`)
                    )
                )
            );
        });

        // Выбор услуги
        this.bot.action(/service_(\d+)/, async (ctx) => {
            const serviceId = Number(ctx.match[1]);
            USER_STATE.set(ctx.from.id, { step: 'date', serviceId });

            await ctx.editMessageText(
                'Выберите дату:',
                Markup.inlineKeyboard([
                    Markup.button.callback('Сегодня', `date_today`),
                    Markup.button.callback('Завтра', `date_tomorrow`),
                ])
            );
        });

        // Выбор даты
        this.bot.action(/date_(today|tomorrow)/, async (ctx) => {
            const date =
                ctx.match[1] === 'today'
                    ? new Date()
                    : new Date(Date.now() + 86400000);

            const dateStr = date.toISOString().slice(0, 10);

            const state = USER_STATE.get(ctx.from.id);
            USER_STATE.set(ctx.from.id, { ...state, step: 'time', date: dateStr });

            await ctx.editMessageText(
                'Выберите время:',
                Markup.inlineKeyboard([
                    Markup.button.callback('10:00', 'time_10:00'),
                    Markup.button.callback('12:00', 'time_12:00'),
                    Markup.button.callback('14:00', 'time_14:00'),
                ])
            );
        });

        // Выбор времени
        this.bot.action(/time_(\d{2}:\d{2})/, async (ctx) => {
            const time = ctx.match[1];
            const userId = ctx.from.id;

            const state = USER_STATE.get(userId);

            if (!state || !state.serviceId || !state.date) {
                USER_STATE.set(userId, { step: 'idle' });
                await ctx.reply('Что-то пошло не так. Начнём сначала. Напишите /start');
                return;
            }

            const service = SERVICES.find((s) => s.id === state.serviceId);

            if (!service) {
                USER_STATE.set(userId, { step: 'idle' });
                await ctx.reply('Услуга не найдена. Начнём сначала. Напишите /start');
                return;
            }

            USER_STATE.set(userId, {
                ...state,
                step: 'confirm',
                time,
            });

            await ctx.editMessageText(
                `Подтвердите запись:\n\nУслуга: ${service.name}\nДата: ${state.date}\nВремя: ${time}`,
                Markup.inlineKeyboard([
                    Markup.button.callback('✅ Подтвердить', 'confirm'),
                    Markup.button.callback('❌ Отменить', 'cancel'),
                ])
            );
        });

        // Подтверждение
        this.bot.action('confirm', async (ctx) => {
            const userId = ctx.from.id;
            const state = USER_STATE.get(userId);

            if (
                !state ||
                state.step !== 'confirm' ||
                state.serviceId == null ||
                !state.date ||
                !state.time
            ) {
                USER_STATE.set(userId, { step: 'idle' });
                await ctx.reply('Сессия устарела. Начнём сначала. Напишите /start');
                return;
            }

            BOOKINGS.push({
                id: BOOKINGS.length + 1,
                userId,
                serviceId: state.serviceId,
                date: state.date,
                time: state.time,
                status: 'active',
            });

            USER_STATE.set(userId, { step: 'idle' });

            await ctx.editMessageText('✅ Вы успешно записаны!');
        });

        // Отмена
        this.bot.action('cancel', async (ctx) => {
            USER_STATE.set(ctx.from.id, { step: 'idle' });
            await ctx.editMessageText('Запись отменена.');
        });

        this.bot.launch();
        console.log('Telegram Bot запущен 🚀');
    }
}
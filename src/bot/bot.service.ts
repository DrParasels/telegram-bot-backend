import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import {
    BOOKINGS,
    formatDate,
    SERVICES,
    TIME_SLOTS,
    USER_STATE,
    isSlotBusy,
    isAdmin,
    BotState,
} from './bot.constants';

@Injectable()
export class BotService implements OnModuleInit {
    private bot: Telegraf<any>;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        const token = this.configService.get<string>('BOT_TOKEN');
        if (!token) throw new Error('BOT_TOKEN не задан');

        this.bot = new Telegraf(token);

        // ===== HELPERS =====
        const replyWithKeyboard = (ctx: any, text: string, buttons: string[][]) =>
            ctx.reply(text, Markup.keyboard(buttons).resize());

        const sendInline = (ctx: any, text: string, buttons: any[][]) =>
            ctx.reply(text, Markup.inlineKeyboard(buttons));

        const editInline = (ctx: any, text: string, buttons: any[][]) =>
            ctx.editMessageText(text, Markup.inlineKeyboard(buttons));

        const cancelBooking = async (booking: any, ctx: any, comment?: string) => {
            booking.status = 'cancelled';
            booking.adminComment = comment || 'Отменено администратором';

            await ctx.telegram.sendMessage(
                booking.userId,
                `❌ Ваша запись #${booking.id} была отменена администратором.\nКомментарий: ${booking.adminComment}`
            );

            // редактируем сообщение админа, если был callback
            if (ctx.callbackQuery) {
                await editInline(
                    ctx,
                    `❌ Запись #${booking.id} отменена.\nКомментарий: ${booking.adminComment}`,
                    []
                );
            }
        };

        // ===== START =====
        this.bot.start(async (ctx) => {
            USER_STATE.set(ctx.from.id, { step: 'idle' });

            const buttons: string[][] = [['📅 Записаться'], ['📋 Мои записи']];
            if (isAdmin(ctx.from.id)) buttons.push(['📋 Все записи', '📅 Записи на сегодня']);

            await replyWithKeyboard(ctx, 'Привет! Я бот для записи на услуги.', buttons);
        });

        // ===== ЗАПИСАТЬСЯ =====
        this.bot.hears('📅 Записаться', async (ctx) => {
            USER_STATE.set(ctx.from.id, { step: 'service' });

            await sendInline(
                ctx,
                'Выберите услугу:',
                [
                    ...SERVICES.map((s) => [Markup.button.callback(s.name, `service_${s.id}`)]),
                    [Markup.button.callback('❌ Отменить', 'cancel')],
                ]
            );
        });

        // ===== ВЫБОР УСЛУГИ =====
        this.bot.action(/service_(\d+)/, async (ctx) => {
            const serviceId = Number(ctx.match[1]);
            const service = SERVICES.find((s) => s.id === serviceId);
            if (!service) return;

            USER_STATE.set(ctx.from.id, { step: 'date', serviceId });

            await editInline(ctx, `Вы выбрали услугу: ${service.name}\n\nВыберите дату:`, [
                [
                    Markup.button.callback('Сегодня', 'date_today'),
                    Markup.button.callback('Завтра', 'date_tomorrow'),
                ],
                [Markup.button.callback('⬅ Назад', 'back_to_service')],
                [Markup.button.callback('❌ Отменить', 'cancel')],
            ]);
        });

        // ===== ВЫБОР ДАТЫ =====
        this.bot.action(/date_(today|tomorrow)/, async (ctx) => {
            const state = USER_STATE.get(ctx.from.id);
            if (!state?.serviceId) return;

            const service = SERVICES.find((s) => s.id === state.serviceId);
            if (!service) return;

            const date = ctx.match[1] === 'today' ? new Date() : new Date(Date.now() + 86400000);
            const dateStr = formatDate(date);

            USER_STATE.set(ctx.from.id, { ...state, step: 'time', date: dateStr });

            const serviceId = state.serviceId!; // гарантируем number для TypeScript
            const timeButtons = TIME_SLOTS.filter((t) => !isSlotBusy(serviceId, dateStr, t))
                .map((t) => Markup.button.callback(t, `time_${t}`));

            await editInline(ctx, `Вы выбрали услугу: ${service.name}\nДата: ${dateStr}\n\nВыберите время:`, [
                timeButtons.length ? timeButtons : [Markup.button.callback('⛔ Нет свободного времени', 'noop')],
                [Markup.button.callback('⬅ Назад', 'back_to_date')],
                [Markup.button.callback('❌ Отменить', 'cancel')],
            ]);
        });

        // ===== ВЫБОР ВРЕМЕНИ =====
        this.bot.action(/time_(\d{2}:\d{2})/, async (ctx) => {
            const time = ctx.match[1];
            const userId = ctx.from.id;
            const state = USER_STATE.get(userId);
            if (!state?.serviceId || !state.date) return;

            if (isSlotBusy(state.serviceId, state.date, time)) {
                await ctx.answerCbQuery('Это время только что заняли. Выберите другое.', { show_alert: true });
                return;
            }

            USER_STATE.set(userId, { ...state, step: 'confirm', time });
            const service = SERVICES.find((s) => s.id === state.serviceId);

            await editInline(ctx, `Вы выбрали услугу: ${service?.name}\nДата: ${state.date}\nВремя: ${time}\n\nПодтвердите запись:`, [
                [Markup.button.callback('✅ Подтвердить', 'confirm')],
                [Markup.button.callback('⬅ Назад', 'back_to_date')],
                [Markup.button.callback('❌ Отменить', 'cancel')],
            ]);
        });

        // ===== ПОДТВЕРЖДЕНИЕ =====
        this.bot.action('confirm', async (ctx) => {
            const userId = ctx.from.id;
            const state = USER_STATE.get(userId);
            if (!state?.serviceId || !state.date || !state.time) {
                USER_STATE.set(userId, { step: 'idle' });
                return ctx.reply('Сессия устарела. Напишите /start');
            }

            if (isSlotBusy(state.serviceId, state.date, state.time)) {
                USER_STATE.set(userId, { step: 'idle' });
                return ctx.reply('Это время уже занято. Попробуйте другое.');
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
            const service = SERVICES.find((s) => s.id === state.serviceId);

            await editInline(ctx, `✅ Вы успешно записаны!\n\nУслуга: ${service?.name}\nДата: ${state.date}\nВремя: ${state.time}`, []);
        });

        // ===== МОИ ЗАПИСИ =====
        this.bot.hears('📋 Мои записи', async (ctx) => {
            const userBookings = BOOKINGS.filter((b) => b.userId === ctx.from.id && b.status === 'active');
            if (!userBookings.length) return ctx.reply('У вас нет активных записей.');

            for (const booking of userBookings) {
                const service = SERVICES.find((s) => s.id === booking.serviceId);
                if (!service) continue;
                await sendInline(ctx, `📌 ${service.name}\n📅 ${booking.date}\n⏰ ${booking.time}`, [
                    [Markup.button.callback('❌ Отменить запись', `cancel_booking_${booking.id}`)],
                ]);
            }
        });

        // ===== ADMIN =====
        this.bot.hears('📋 Все записи', async (ctx) => {
            if (!isAdmin(ctx.from.id)) return;
            if (!BOOKINGS.length) return ctx.reply('Нет записей.');

            for (const booking of BOOKINGS) {
                const service = SERVICES.find((s) => s.id === booking.serviceId);
                if (!service) continue;
                await sendInline(ctx,
                    `🧾 Запись #${booking.id}\nПользователь: ${booking.userId}\nУслуга: ${service.name}\nДата: ${booking.date}\nВремя: ${booking.time}\nСтатус: ${booking.status}`,
                    [
                        [Markup.button.callback(`❌ Отменить (дефолт)`, `admin_cancel_${booking.id}`),
                        Markup.button.callback(`✏️ Отменить с комментарием`, `admin_cancel_comment_${booking.id}`)]
                    ]
                );
            }
        });

        this.bot.hears('📅 Записи на сегодня', async (ctx) => {
            if (!isAdmin(ctx.from.id)) return;
            const todayStr = formatDate(new Date());
            const todayBookings = BOOKINGS.filter((b) => b.date === todayStr);
            if (!todayBookings.length) return ctx.reply('Сегодня нет записей.');

            for (const booking of todayBookings) {
                const service = SERVICES.find((s) => s.id === booking.serviceId);
                if (!service) continue;
                await sendInline(ctx,
                    `🧾 Запись #${booking.id}\nПользователь: ${booking.userId}\nУслуга: ${service.name}\nДата: ${booking.date}\nВремя: ${booking.time}\nСтатус: ${booking.status}`,
                    [
                        [Markup.button.callback(`❌ Отменить (дефолт)`, `admin_cancel_${booking.id}`),
                        Markup.button.callback(`✏️ Отменить с комментарием`, `admin_cancel_comment_${booking.id}`)]
                    ]
                );
            }
        });

        // ===== ADMIN CANCEL =====
        this.bot.action(/admin_cancel_(\d+)/, async (ctx) => {
            const bookingId = Number(ctx.match[1]);
            const booking = BOOKINGS.find((b) => b.id === bookingId);
            if (!booking) return ctx.answerCbQuery('Запись не найдена', { show_alert: true });
            await cancelBooking(booking, ctx);
            await ctx.answerCbQuery('Запись отменена и клиент уведомлён', { show_alert: true });
        });

        // ===== ADMIN CANCEL WITH COMMENT =====
        this.bot.action(/admin_cancel_comment_(\d+)/, async (ctx) => {
            const bookingId = Number(ctx.match[1]);
            const booking = BOOKINGS.find((b) => b.id === bookingId);
            if (!booking) return ctx.answerCbQuery('Запись не найдена', { show_alert: true });

            USER_STATE.set(ctx.from.id, { step: 'admin_comment', bookingId });
            await ctx.reply(`Введите комментарий для отмены записи #${booking.id}:`);
        });

        this.bot.on('text', async (ctx) => {
            const state = USER_STATE.get(ctx.from.id);
            if (!state?.bookingId || state.step !== 'admin_comment') return;

            const booking = BOOKINGS.find((b) => b.id === state.bookingId);
            if (!booking) {
                USER_STATE.set(ctx.from.id, { step: 'idle' });
                return ctx.reply('Запись не найдена.');
            }

            await cancelBooking(booking, ctx, ctx.message.text);
            USER_STATE.set(ctx.from.id, { step: 'idle' });
        });

        // ===== CANCEL / NOOP =====
        this.bot.action('cancel', async (ctx) => {
            USER_STATE.set(ctx.from.id, { step: 'idle' });
            await ctx.reply('Действие отменено.');
        });

        this.bot.action('noop', async (ctx) => await ctx.answerCbQuery());

        this.bot.launch();
        console.log('Telegram Bot запущен 🚀');
    }
}
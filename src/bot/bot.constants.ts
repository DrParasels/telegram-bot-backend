import { Markup } from 'telegraf';

export interface Service {
  id: number;
  name: string;
  durationMinutes: number;
}

export interface Booking {
  id: number;
  userId: number;
  serviceId: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: 'active' | 'cancelled';
  adminComment?: string;
}

export const SERVICES: Service[] = [
  { id: 1, name: 'Услуга №1', durationMinutes: 60 },
  { id: 2, name: 'Услуга №2', durationMinutes: 90 },
  { id: 3, name: 'Услуга №3', durationMinutes: 30 },
  { id: 4, name: 'Услуга №4', durationMinutes: 40 },
  { id: 5, name: 'Услуга №5', durationMinutes: 70 },
  { id: 6, name: 'Услуга №6', durationMinutes: 120 },
];

export const TIME_SLOTS = ['10:00', '12:00', '14:00'];

export const BOOKINGS: Booking[] = [];

export function formatDate(date: Date): string {
  const day = date.getDate();
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
  ];
  const month = months[date.getMonth()];
  return `${day} ${month}`;
}

export type Step = 'idle' | 'service' | 'date' | 'time' | 'confirm' | 'admin_comment';

export interface BotState {
  step: Step;
  serviceId?: number;
  date?: string;
  time?: string;
  bookingId?: number;
}

export const USER_STATE = new Map<number, BotState>();

export const ADMINS: number[] = [282701442]; // сюда добавляем свой ID

export function isAdmin(userId: number): boolean {
  return ADMINS.includes(userId);
}

// проверка занятости слота
export function isSlotBusy(serviceId: number, date: string, time: string): boolean {
  return BOOKINGS.some(
    (b) => b.serviceId === serviceId && b.date === date && b.time === time && b.status === 'active'
  );
}
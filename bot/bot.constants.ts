export const WELCOME_MESSAGE = 'Привееееееет! Я твой пищевой бот 🍗';
export const COMMANDS_LIST = [
  '/start - главное меню',
  '/menuday - Список еды за день (заглушка)',
  '/add_fatsecret - Добавить профиль fatsecret  (заглушка)',
];

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
}

export const SERVICES: Service[] = [
  { id: 1, name: 'Массаж 60 минут', durationMinutes: 60 },
  { id: 2, name: 'Массаж 90 минут', durationMinutes: 90 },
];

export const BOOKINGS: Booking[] = [];
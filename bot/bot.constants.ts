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
  { id: 1, name: 'Услуга №1', durationMinutes: 60 },
  { id: 2, name: 'Услуга №2', durationMinutes: 90 },
  { id: 3, name: 'Услуга №3', durationMinutes: 30 },
  { id: 4, name: 'Услуга №4', durationMinutes: 40 },
  { id: 5, name: 'Услуга №5', durationMinutes: 70 },
  { id: 6, name: 'Услуга №6', durationMinutes: 120 },
];

export const TIME_SLOTS = ['10:00', '12:00', '14:00']; 

export const BOOKINGS: Booking[] = [];
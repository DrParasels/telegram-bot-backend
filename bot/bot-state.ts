export interface BotState {
  step: 'idle' | 'service' | 'date' | 'time' | 'confirm';
  serviceId?: number;
  date?: string;
  time?: string;
}

export const USER_STATE = new Map<number, BotState>();
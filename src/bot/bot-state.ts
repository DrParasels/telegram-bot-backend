export type Step = 'idle' | 'service' | 'date' | 'time' | 'confirm';

export interface BotState {
  step: Step;
  serviceId?: number;
  date?: string;
  time?: string;
}

export const USER_STATE = new Map<number, BotState>();
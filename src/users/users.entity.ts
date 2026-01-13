import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { BookingEntity } from '../bookings/booking.entity';

@Entity('users')
export class UserEntity {
  // Telegram ID, НЕ serial
  @PrimaryColumn({ type: 'bigint' })
  id: number;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  first_name?: string;

  @Column({ nullable: true })
  last_name?: string;

  @Column({ default: false })
  is_admin: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => BookingEntity, (booking) => booking.user)
  bookings: BookingEntity[];
}
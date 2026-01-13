import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { BookingEntity } from '../bookings/booking.entity';

@Entity('services')
export class ServiceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  duration: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @OneToMany(() => BookingEntity, (booking) => booking.service)
  bookings: BookingEntity[];
}
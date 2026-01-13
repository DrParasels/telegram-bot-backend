import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/users.entity';
import { ServiceEntity } from '../services/services.entity';

@Entity('bookings')
export class BookingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  user_id: number;

  @Column()
  service_id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  time: string;

  @Column({ default: 'active' })
  status: 'active' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  admin_comment?: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @ManyToOne(() => UserEntity, (user) => user.bookings)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => ServiceEntity, (service) => service.bookings)
  @JoinColumn({ name: 'service_id' })
  service: ServiceEntity;
}
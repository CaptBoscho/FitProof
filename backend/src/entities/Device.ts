import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from './User';
import { ObjectType, Field, ID } from 'type-graphql';

@ObjectType()
@Entity('devices')
@Index(['userId', 'deviceId'], { unique: true })
export class Device {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => ID)
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Field(() => ID)
  @Column({ name: 'device_id', type: 'varchar', length: 255 })
  deviceId!: string;

  @Field()
  @Column({ name: 'device_name', type: 'varchar', length: 255 })
  deviceName!: string;

  @Field()
  @Column({ name: 'device_type', type: 'varchar', length: 50 })
  deviceType!: string; // 'ios', 'android', 'web', etc.

  @Field()
  @Column({ name: 'os_version', type: 'varchar', length: 50 })
  osVersion!: string;

  @Field()
  @Column({ type: 'varchar', length: 100 })
  model!: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer?: string;

  @Field({ nullable: true })
  @Column({ name: 'app_version', type: 'varchar', length: 50, nullable: true })
  appVersion?: string;

  @Field()
  @Column({ name: 'is_tablet', type: 'boolean', default: false })
  isTablet!: boolean;

  @Field()
  @Column({ name: 'last_active_at', type: 'timestamp' })
  lastActiveAt!: Date;

  @Field()
  @CreateDateColumn({ name: 'registered_at' })
  registeredAt!: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;
}

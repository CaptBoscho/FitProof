import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
@Entity('users')
export class TestUser {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  email: string;

  @Field()
  @Column({ unique: true })
  username: string;

  @Column()
  passwordHash: string;

  @Field(() => Int)
  @Column({ default: 0 })
  totalPoints: number;

  @Field(() => Int)
  @Column({ default: 0 })
  currentStreak: number;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'datetime', nullable: true })
  lastWorkoutDate: Date;

  @Field()
  @Column({ default: true })
  isActive: boolean;

  @Field(() => Date)
  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;
}
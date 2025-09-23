import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
@Entity('exercises')
export class TestExercise {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field(() => Int)
  @Column()
  pointsPerRep: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  @Column('simple-json', { nullable: true })
  validationRules?: string[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  iconColor?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  instructionText?: string;

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
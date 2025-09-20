import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType()
@Entity('exercises')
export class Exercise {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Field(() => Int)
  @Column({ type: 'int', name: 'points_per_rep' })
  pointsPerRep: number;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  @Column('simple-array', { name: 'validation_rules', nullable: true })
  validationRules?: string[];

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  category?: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 7, nullable: true, name: 'icon_color' })
  iconColor?: string;

  @Field({ nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true, name: 'instruction_text' })
  instructionText?: string;

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @Field()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
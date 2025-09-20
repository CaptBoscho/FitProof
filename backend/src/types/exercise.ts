import { Field, ObjectType, InputType, Int, ID } from 'type-graphql';
import { BaseEntity } from './common';

@ObjectType()
export class Exercise extends BaseEntity {
  @Field()
  name!: string;

  @Field(() => Int)
  pointsPerRep!: number;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  validationRules?: string[];
}

@InputType()
export class CreateExerciseInput {
  @Field()
  name!: string;

  @Field(() => Int)
  pointsPerRep!: number;

  @Field({ nullable: true })
  description?: string;
}

@InputType()
export class UpdateExerciseInput {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  name?: string;

  @Field(() => Int, { nullable: true })
  pointsPerRep?: number;

  @Field({ nullable: true })
  description?: string;
}

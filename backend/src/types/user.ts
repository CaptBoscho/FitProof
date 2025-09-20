import { Field, ObjectType, InputType, Int, ID } from 'type-graphql';
import { BaseEntity } from './common';

@ObjectType()
export class User extends BaseEntity {
  @Field()
  email!: string;

  @Field()
  username!: string;

  @Field(() => Int, { defaultValue: 0 })
  totalPoints!: number;

  @Field(() => Int, { defaultValue: 0 })
  currentStreak!: number;

  @Field({ nullable: true })
  googleId?: string;

  @Field({ nullable: true })
  appleId?: string;

  // Don't expose password in GraphQL
  passwordHash!: string;
}

@InputType()
export class CreateUserInput {
  @Field()
  email!: string;

  @Field()
  username!: string;

  @Field()
  password!: string;
}

@InputType()
export class LoginInput {
  @Field()
  email!: string;

  @Field()
  password!: string;
}

@ObjectType()
export class AuthPayload {
  @Field()
  token!: string;

  @Field(() => User)
  user!: User;
}

@InputType()
export class UpdateUserInput {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  username?: string;

  @Field({ nullable: true })
  email?: string;
}

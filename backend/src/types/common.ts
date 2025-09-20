import { Field, ObjectType, InputType, ID } from 'type-graphql';

// Common interfaces and types used across the GraphQL schema

@ObjectType()
export class BaseEntity {
  @Field(() => ID)
  id!: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class HealthStatus {
  @Field()
  status!: string;

  @Field()
  timestamp!: Date;

  @Field()
  service!: string;

  @Field()
  database!: string;
}

@InputType()
export class PaginationInput {
  @Field({ nullable: true, defaultValue: 0 })
  offset?: number;

  @Field({ nullable: true, defaultValue: 10 })
  limit?: number;
}

@ObjectType()
export class PaginationInfo {
  @Field()
  total!: number;

  @Field()
  offset!: number;

  @Field()
  limit!: number;

  @Field()
  hasMore!: boolean;
}

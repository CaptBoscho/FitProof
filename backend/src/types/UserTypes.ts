import { InputType, Field, Int } from 'type-graphql';
import { IsEmail, IsString, IsOptional, IsBoolean, IsNumber, MinLength, MaxLength, Min, Max } from 'class-validator';

@InputType()
export class CreateUserInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPoints?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentStreak?: number;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  lastWorkoutDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class LoginInput {
  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(1)
  password: string;
}

@InputType()
export class ChangePasswordInput {
  @Field()
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

@InputType()
export class UserSearchInput {
  @Field()
  @IsString()
  @MinLength(1)
  searchTerm: string;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

@InputType()
export class UserFiltersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @Field(() => Int, { nullable: true, defaultValue: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @Field(() => Int, { nullable: true, defaultValue: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
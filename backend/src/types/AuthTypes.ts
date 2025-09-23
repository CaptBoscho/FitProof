import { Field, InputType, ObjectType } from 'type-graphql';
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @Field()
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must be less than 30 characters' })
  username: string;

  @Field()
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsString({ message: 'Email or username is required' })
  emailOrUsername: string;

  @Field()
  @IsString({ message: 'Password is required' })
  password: string;
}

@ObjectType()
export class AuthValidationError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
export class UserResponse {
  @Field()
  id: string;

  @Field()
  email: string;

  @Field()
  username: string;

  @Field()
  totalPoints: number;

  @Field()
  currentStreak: number;

  @Field({ nullable: true })
  lastWorkoutDate?: Date;

  @Field()
  isActive: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field()
  expiresIn: string;

  @Field()
  refreshExpiresIn: string;

  @Field()
  tokenType: string;

  @Field(() => UserResponse)
  user: UserResponse;
}


@ObjectType()
export class RegisterResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => [AuthValidationError], { nullable: true })
  validationErrors?: AuthValidationError[];

  @Field(() => AuthResponse, { nullable: true })
  authData?: AuthResponse;
}

@ObjectType()
export class LoginResponse {
  @Field({ nullable: true })
  success?: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => AuthResponse, { nullable: true })
  authData?: AuthResponse;
}

@ObjectType()
export class RefreshTokenResponse {
  @Field()
  accessToken: string;

  @Field()
  expiresIn: string;

  @Field()
  tokenType: string;
}

@InputType()
export class PasswordResetRequestInput {
  @Field()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

@InputType()
export class PasswordResetConfirmInput {
  @Field()
  @IsString({ message: 'Reset token is required' })
  token: string;

  @Field()
  @IsString({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;
}

@ObjectType()
export class PasswordResetResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  token?: string;
}

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must be less than 30 characters' })
  username?: string;
}

@ObjectType()
export class UpdateProfileResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field(() => UserResponse, { nullable: true })
  user?: UserResponse;

  @Field(() => [AuthValidationError], { nullable: true })
  validationErrors?: AuthValidationError[];
}
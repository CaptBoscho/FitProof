import { Query, Mutation, Arg, Resolver, InputType, Field } from 'type-graphql';
import { Exercise } from '../entities/Exercise';
import { ExerciseRepository } from '../repositories/ExerciseRepository';
import { AppDataSource } from '../config/database';

@InputType()
class CreateExerciseInput {
  @Field()
  name: string;

  @Field()
  pointsPerRep: number;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  validationRules?: string[];

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  iconColor?: string;

  @Field({ nullable: true })
  instructionText?: string;
}

@InputType()
class UpdateExerciseInput {
  @Field()
  id: string;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  pointsPerRep?: number;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  validationRules?: string[];

  @Field({ nullable: true })
  category?: string;

  @Field({ nullable: true })
  iconColor?: string;

  @Field({ nullable: true })
  instructionText?: string;

  @Field({ nullable: true })
  isActive?: boolean;
}

@Resolver(() => Exercise)
export class ExerciseResolver {
  private exerciseRepository: ExerciseRepository;

  constructor() {
    this.exerciseRepository = new ExerciseRepository(AppDataSource);
  }

  @Query(() => [Exercise])
  async exercises(): Promise<Exercise[]> {
    return await this.exerciseRepository.findAll({ activeOnly: true });
  }

  @Query(() => Exercise, { nullable: true })
  async exercise(@Arg('id') id: string): Promise<Exercise | null> {
    return await this.exerciseRepository.findById(id);
  }

  @Query(() => [String])
  async exerciseCategories(): Promise<string[]> {
    return await this.exerciseRepository.getCategories();
  }

  @Query(() => [Exercise])
  async exercisesByCategory(@Arg('category') category: string): Promise<Exercise[]> {
    return await this.exerciseRepository.findByCategory(category);
  }

  @Mutation(() => Exercise)
  async createExercise(@Arg('input') input: CreateExerciseInput): Promise<Exercise> {
    return await this.exerciseRepository.create(input);
  }

  @Mutation(() => Exercise)
  async updateExercise(@Arg('input') input: UpdateExerciseInput): Promise<Exercise> {
    const { id, ...updateData } = input;
    const exercise = await this.exerciseRepository.update(id, updateData);

    if (!exercise) {
      throw new Error('Exercise not found');
    }

    return exercise;
  }

  @Mutation(() => Boolean)
  async deleteExercise(@Arg('id') id: string): Promise<boolean> {
    return await this.exerciseRepository.softDelete(id);
  }
}

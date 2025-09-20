import { buildSchema } from 'type-graphql';
import { HealthResolver } from '../resolvers/HealthResolver';
import { ExerciseResolver } from '../resolvers/ExerciseResolver';

describe('GraphQL Schema', () => {
  test('should build schema successfully', async () => {
    const schema = await buildSchema({
      resolvers: [HealthResolver, ExerciseResolver],
      validate: false
    });

    expect(schema).toBeDefined();
    expect(schema.getQueryType()).toBeDefined();
    expect(schema.getMutationType()).toBeDefined();
  });

  test('should include health queries', async () => {
    const schema = await buildSchema({
      resolvers: [HealthResolver, ExerciseResolver],
      validate: false
    });

    const queryType = schema.getQueryType();
    const fields = queryType?.getFields();

    expect(fields?.hello).toBeDefined();
    expect(fields?.health).toBeDefined();
  });

  test('should include exercise queries and mutations', async () => {
    const schema = await buildSchema({
      resolvers: [HealthResolver, ExerciseResolver],
      validate: false
    });

    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();

    const queryFields = queryType?.getFields();
    const mutationFields = mutationType?.getFields();

    // Check queries
    expect(queryFields?.exercises).toBeDefined();
    expect(queryFields?.exercise).toBeDefined();

    // Check mutations
    expect(mutationFields?.createExercise).toBeDefined();
    expect(mutationFields?.updateExercise).toBeDefined();
  });
});
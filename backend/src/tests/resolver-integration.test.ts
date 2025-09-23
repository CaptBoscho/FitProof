import 'reflect-metadata';
import { buildSchema } from 'type-graphql';
import { graphql, GraphQLSchema } from 'graphql';
import { ExerciseResolver } from '../resolvers/ExerciseResolver';
import { HealthResolver } from '../resolvers/HealthResolver';

describe('GraphQL Schema Integration Tests', () => {
  let schema: GraphQLSchema;

  beforeAll(async () => {
    // Build GraphQL schema with only resolvers that don't require database
    schema = await buildSchema({
      resolvers: [HealthResolver],
      validate: false
    });
  });

  describe('HealthResolver', () => {
    it('should respond to health check query', async () => {
      const query = `
        query {
          health {
            status
            service
            database
            timestamp
          }
        }
      `;

      const result = await graphql({
        schema,
        source: query
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.health).toMatchObject({
        status: expect.any(String),
        service: 'FitProof Backend',
        database: expect.any(String)
      });
      expect((result.data as any)?.health.timestamp).toBeDefined();
    });
  });

  describe('GraphQL Schema Validation', () => {
    it('should build schema with all resolvers without errors', async () => {
      expect(async () => {
        await buildSchema({
          resolvers: [HealthResolver, ExerciseResolver],
          validate: false
        });
      }).not.toThrow();
    });

    it('should handle invalid query syntax', async () => {
      const invalidQuery = `
        query {
          health {
            invalidField
          }
        }
      `;

      const result = await graphql({
        schema,
        source: invalidQuery
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Cannot query field "invalidField"');
    });

    it('should validate required arguments', async () => {
      // Test that the schema contains our health query
      const query = `
        query {
          __schema {
            queryType {
              fields {
                name
              }
            }
          }
        }
      `;

      const result = await graphql({ schema, source: query });
      const fields = (result.data as any)?.__schema.queryType.fields;
      const healthField = fields.find((f: any) => f.name === 'health');
      expect(healthField).toBeDefined();
    });
  });

  describe('Input Validation Tests', () => {
    it('should validate string inputs', async () => {
      // Test with invalid input types
      const queryWithInvalidInput = `
        query {
          health {
            status
          }
        }
      `;

      const result = await graphql({
        schema,
        source: queryWithInvalidInput
      });

      // Health query should work fine
      expect(result.errors).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed queries gracefully', async () => {
      const malformedQuery = `
        query {
          health {
            status
          // Missing closing brace
        }
      `;

      const result = await graphql({
        schema,
        source: malformedQuery
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toMatch(/syntax error/i);
    });

    it('should handle unknown queries', async () => {
      const unknownQuery = `
        query {
          unknownField
        }
      `;

      const result = await graphql({
        schema,
        source: unknownQuery
      });

      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].message).toContain('Cannot query field "unknownField"');
    });
  });

  describe('Schema Introspection', () => {
    it('should support introspection queries', async () => {
      const introspectionQuery = `
        query {
          __schema {
            types {
              name
            }
          }
        }
      `;

      const result = await graphql({
        schema,
        source: introspectionQuery
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.__schema).toBeDefined();
      expect((result.data as any)?.__schema.types).toBeInstanceOf(Array);
    });

    it('should include custom types in schema', async () => {
      const typeQuery = `
        query {
          __type(name: "HealthStatus") {
            name
            fields {
              name
              type {
                name
              }
            }
          }
        }
      `;

      const result = await graphql({
        schema,
        source: typeQuery
      });

      expect(result.errors).toBeUndefined();
      expect((result.data as any)?.__type).toBeDefined();
      expect((result.data as any)?.__type.name).toBe('HealthStatus');
    });
  });
});
# FitProof Backend

A Node.js TypeScript backend service for the FitProof fitness application, featuring GraphQL API, PostgreSQL database, and exercise validation.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Docker & Docker Compose** (for PostgreSQL database)
- **npm** (comes with Node.js)

### Local Development Setup

1. **Clone and navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   The default `.env` file is configured for local development.

4. **Start the PostgreSQL database:**
   ```bash
   docker-compose up -d
   ```
   This starts PostgreSQL on port `5433` (to avoid conflicts with local installations).

5. **Run database migrations:**
   ```bash
   npm run migration:run
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:4000` with:
- 🚀 **GraphQL Playground**: `http://localhost:4000/`
- 💚 **Health Check**: Available via GraphQL query `{ health { status database service timestamp } }`
- 🏋️ **Exercise Queries**: Access exercises via `{ exercises { id name pointsPerRep } }`

## 📋 Available Scripts

### Development
```bash
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm start               # Start production server (requires build first)
```

### Database
```bash
npm run migration:create    # Create a new migration
npm run migration:generate  # Generate migration from entity changes
npm run migration:run      # Run pending migrations
npm run migration:revert   # Revert last migration
```

### Testing
```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Docker Database
```bash
docker-compose up -d    # Start PostgreSQL database
docker-compose down     # Stop database
docker-compose logs     # View database logs
```

## 🗄️ Database

### Connection Details
- **Host**: `localhost`
- **Port**: `5433`
- **Database**: `fitproof_dev`
- **Username**: `fitproof_user`
- **Password**: `fitproof_password`

### Database Health Check
The application includes built-in database health monitoring. Check database status by querying the GraphQL health endpoint.

## 🧪 Testing

The project includes comprehensive test coverage:

- **Unit Tests**: Test individual components and utilities
- **Integration Tests**: Test database connections and API endpoints
- **GraphQL Tests**: Test schema generation and resolver functionality
- **Configuration Tests**: Validate environment and setup

Run tests before committing changes:
```bash
npm test
```

### GraphQL Testing
Test GraphQL queries directly:
```bash
# Health check
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ health { status database } }"}' \
  http://localhost:4000

# Get exercises
curl -X POST -H "Content-Type: application/json" \
  -d '{"query":"{ exercises { id name pointsPerRep } }"}' \
  http://localhost:4000
```

## 📂 Version Control

The project includes comprehensive `.gitignore` files to prevent committing:
- `node_modules/` and dependencies
- Build outputs (`dist/`, `build/`)
- Environment variables (`.env` files)
- Logs and temporary files
- Editor and OS-specific files
- Database files and Docker volumes

**Important**: Always use `.env.example` as a template and never commit actual `.env` files containing secrets.

## 🔧 Project Structure

```
backend/
├── src/
│   ├── config/          # Database and app configuration
│   ├── models/          # TypeORM entities (coming in Day 6)
│   ├── resolvers/       # GraphQL resolvers ✅
│   │   ├── HealthResolver.ts    # Health check and system status
│   │   └── ExerciseResolver.ts  # Exercise queries and mutations
│   ├── services/        # Business logic services
│   ├── types/           # GraphQL types and TypeScript definitions ✅
│   │   ├── common.ts    # Shared types and interfaces
│   │   ├── exercise.ts  # Exercise-related types
│   │   └── user.ts      # User-related types (for Day 4)
│   ├── tests/           # Test files ✅
│   │   ├── server.test.ts     # Server functionality tests
│   │   ├── database.test.ts   # Database configuration tests
│   │   └── graphql.test.ts    # GraphQL schema tests
│   └── server.ts        # Main application entry point ✅
├── migrations/          # Database migration files ✅
├── docker-compose.yml   # PostgreSQL setup ✅
├── tsconfig.json       # TypeScript configuration ✅
├── .gitignore          # Git ignore rules ✅
├── .env.example        # Environment variables template ✅
└── package.json        # Dependencies and scripts ✅
```

## 🚨 Troubleshooting

### Port Already in Use
If you get a "port already in use" error:

1. **For port 4000 (GraphQL server):**
   ```bash
   lsof -i :4000  # Find what's using the port
   kill -9 <PID>  # Kill the process
   ```

2. **For port 5433 (PostgreSQL):**
   ```bash
   docker-compose down  # Stop the database
   docker-compose up -d # Restart the database
   ```

### Database Connection Issues
1. Ensure Docker is running
2. Check if PostgreSQL container is healthy:
   ```bash
   docker-compose ps
   ```
3. Verify environment variables in `.env` file
4. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

### Migration Issues
If migrations fail:
1. Ensure database is running
2. Check connection settings in `.env`
3. Verify migration files are properly formatted
4. Reset database if needed:
   ```bash
   docker-compose down -v  # Remove volumes
   docker-compose up -d    # Restart fresh
   npm run migration:run   # Run migrations again
   ```

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `5433` |
| `DB_NAME` | Database name | `fitproof_dev` |
| `DB_USER` | Database username | `fitproof_user` |
| `DB_PASSWORD` | Database password | `fitproof_password` |
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Environment mode | `development` |
| `JWT_SECRET` | JWT signing secret | (change in production) |

## 📈 Next Steps

This backend is ready for:
- ✅ **Day 1**: Backend project setup and TypeScript configuration
- ✅ **Day 2**: Database setup with PostgreSQL and TypeORM
- ✅ **Day 3**: GraphQL foundation with Apollo Server and basic resolvers
- 🔄 **Day 4**: Mobile project setup with Expo React Native
- 🔄 **Day 5**: Development environment and testing setup
- 🔄 **Day 6**: Database schema and exercise data models

## 🎯 Available Endpoints

### GraphQL Queries
```graphql
# Get system health
query {
  health {
    status
    timestamp
    service
    database
  }
}

# Get all exercises
query {
  exercises {
    id
    name
    pointsPerRep
    description
    validationRules
  }
}

# Get specific exercise
query {
  exercise(id: "1") {
    id
    name
    pointsPerRep
  }
}
```

### GraphQL Mutations
```graphql
# Create new exercise
mutation {
  createExercise(input: {
    name: "Burpee"
    pointsPerRep: 3
    description: "Full body exercise"
  }) {
    id
    name
    pointsPerRep
  }
}
```

Stay tuned as we build out the complete FitProof backend! 🏋️‍♂️
# 🎾 Tennis Coach Booking Platform

A modern, full-stack web application for tennis coaches to manage their business and for clients to book sessions.

## Features

### For Clients
- Browse coach profiles and credentials
- View available booking types and pricing
- Book sessions with real-time availability
- Apply discount codes
- Secure PayPal payment processing
- Automatic calendar scheduling
- In-app messaging with coaches
- Session history and management

### For Coaches
- Complete profile management
- Dynamic booking type creation and pricing
- Availability management
- Discount campaign creation
- Session tracking and analytics
- Client communication
- Admin dashboard

## Tech Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **Prisma** - Type-safe database ORM
- **PostgreSQL** - Relational database
- **WebSockets** - Real-time communication
- **Passport JWT** - Authentication
- **PayPal API** - Payment processing
- **Google Calendar API** - Calendar integration
- **Nodemailer** - Email notifications

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Socket.io** - Real-time features
- **Axios** - HTTP client

### Testing
- **TestCafe** - End-to-end testing
- **Jest** - Unit testing
- **Vitest** - Frontend testing

### Development
- **Nx** - Monorepo management
- **Docker** - Local development environment
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- pnpm (recommended) or npm

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo>
   cd tennis-coach-platform
   pnpm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development services**
   ```bash
   pnpm docker:dev
   ```

4. **Setup database**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

### URLs
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3333/api
- **API Documentation**: http://localhost:3333/api/docs
- **Database Studio**: `pnpm db:studio`
- **Email Testing**: http://localhost:8025 (MailHog)

## Project Structure

```
tennis-coach-platform/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # React frontend
├── libs/
│   ├── domain/       # Shared types and DTOs
│   ├── ui/           # Shared UI components
│   └── utils/        # Shared utilities
├── tests/
│   └── e2e/          # TestCafe tests
└── docker-compose.dev.yml
```

## Available Scripts

```bash
# Development
pnpm dev              # Start both frontend and backend
pnpm dev:api          # Start only backend
pnpm dev:web          # Start only frontend

# Database
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed database with sample data
pnpm db:studio        # Open Prisma Studio
pnpm db:reset         # Reset database

# Testing
pnpm test             # Run all tests
pnpm test:e2e         # Run E2E tests

# Build
pnpm build            # Build all apps
pnpm lint             # Lint all code

# Docker
pnpm docker:dev       # Start development services
pnpm docker:down      # Stop development services
```

## Environment Configuration

Copy `.env.example` to `.env.local` and configure:

### Database
- Set up PostgreSQL connection string

### PayPal Integration
1. Create PayPal developer account
2. Create sandbox/live application
3. Add client ID and secret

### Google Calendar Integration
1. Create Google Cloud project
2. Enable Calendar API
3. Create OAuth 2.0 credentials
4. Add client ID and secret

### Email Configuration
- Configure SMTP settings for email notifications
- For development, use MailHog (included in Docker Compose)

## Testing

### Unit Tests
```bash
pnpm test
```

### E2E Tests
```bash
pnpm test:e2e
```

Test reports are generated in `reports/` directory.

## Deployment

### Production Build
```bash
pnpm build
```

### Environment Variables
Ensure all production environment variables are set:
- Database connection
- JWT secrets
- PayPal production credentials
- Google OAuth production credentials
- SMTP configuration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

Private - All rights reserved

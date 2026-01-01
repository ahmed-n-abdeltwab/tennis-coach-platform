# 🎾 Tennis Coach Booking Platform
> This repository is under development.

[![codecov](https://codecov.io/github/ahmed-n-abdeltwab/tennis-coach-platform/graph/badge.svg?token=J7XLLI2L7H)](https://codecov.io/github/ahmed-n-abdeltwab/tennis-coach-platform)
[![CI](https://github.com/ahmed-n-abdeltwab/tennis-coach-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/ahmed-n-abdeltwab/tennis-coach-platform/actions/workflows/ci.yml)

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
- **React** - UI library
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Socket.io** - Real-time features

### Testing
- **Jest** - Unit and integration testing
- **TestCafe** - End-to-end testing

### Development
- **Nx** - Monorepo management
- **Docker** - Local development environment
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- pnpm

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd tennis-coach-platform
   pnpm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start development services**
   ```bash
   docker-compose up -d
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

## License

Private - All rights reserved

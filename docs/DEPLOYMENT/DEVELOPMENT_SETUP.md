# Development Environment Setup Guide

## Overview

This guide provides comprehensive instructions for setting up a complete development environment for the OffScreen Buddy mobile application, including all necessary tools, dependencies, and configuration requirements.

## Prerequisites

### System Requirements
- **Operating System**: macOS 10.15+, Ubuntu 18.04+, or Windows 10+
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: Minimum 50GB free space
- **Network**: Stable internet connection for package downloads

### Required Software

#### Core Development Tools
```bash
# Install Node.js (v18 or higher)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install npm/yarn
npm install -g yarn@latest

# Install Git
sudo apt-get install git

# Install code editor (VS Code recommended)
curl -L "https://code.visualstudio.com/sha/download?build=stable&os=linux-deb-x64" --output vscode.deb
sudo dpkg -i vscode.deb
```

#### Mobile Development Tools
```bash
# Install Java Development Kit (JDK 11+)
sudo apt-get install openjdk-11-jdk

# Install Android Studio and SDK
wget https://redirector.gvt1.com/edgedl/android/studio/ide-zips/2022.3.1.18/android-studio-2022.3.1.18-linux.tar.gz
sudo tar -xzf android-studio-2022.3.1.18-linux.tar.gz -C /opt/
sudo ln -s /opt/android-studio/bin/studio.sh /usr/local/bin/android-studio

# Set Android environment variables
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Install iOS development tools (macOS only)
# Xcode from App Store
# iOS Simulator
```

#### Database Tools
```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install Redis
sudo apt-get install redis-server

# Install Supabase CLI
npm install -g supabase
```

## Project Setup

### Repository Setup
```bash
# Clone the repository
git clone https://github.com/your-org/offscreen-buddy.git
cd offscreen-buddy

# Install dependencies
npm install

# Install workspace dependencies
cd app && npm install && cd ..
cd backend && npm install && cd ..
cd services && npm install && cd ..
```

### Environment Configuration

#### Development Environment File
```bash
# Create development environment file
cp .env.example .env.development

# Edit configuration
nano .env.development
```

```env
# Application Configuration
NODE_ENV=development
APP_ENV=development
APP_VERSION=1.0.0-dev
APP_DEBUG=true

# API Configuration
API_BASE_URL=http://localhost:3000
API_TIMEOUT=30000

# Database Configuration
DATABASE_URL=postgresql://offscreen_dev:dev_password@localhost:5432/offscreen_dev
REDIS_URL=redis://localhost:6379

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

# Authentication Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# PayU Configuration (Sandbox)
PAYU_ENVIRONMENT=sandbox
PAYU_MERCHANT_ID=your_payu_merchant_id
PAYU_SALT=your_payu_salt_key

# Email Configuration
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@offscreen-buddy.dev

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif

# Monitoring Configuration
LOG_LEVEL=debug
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ERROR_TRACKING=true

# Security Configuration
ENABLE_CORS=true
CORS_ORIGIN=http://localhost:8081
ENABLE_RATE_LIMITING=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Notification Configuration
ENABLE_PUSH_NOTIFICATIONS=true
FCM_SERVER_KEY=your_fcm_server_key
APNS_KEY_ID=your_apns_key_id
APNS_TEAM_ID=your_apns_team_id

# Cache Configuration
CACHE_TTL=3600
ENABLE_CACHE=true
CACHE_TYPE=memory

# Development Tools
ENABLE_HOT_RELOAD=true
ENABLE_MOCK_DATA=true
MOCK_DATA_PATH=./mock-data
```

#### Mobile App Configuration
```bash
# Navigate to app directory
cd app

# Create app environment configuration
cp .env.example .env.development
```

```env
# Mobile App Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_APP_DEBUG=true
EXPO_PUBLIC_APP_VERSION=1.0.0-dev

# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Feature Flags
EXPO_PUBLIC_ENABLE_OFFLINE_MODE=true
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true

# Development Configuration
EXPO_PUBLIC_DEV_SERVER_HOST=localhost
EXPO_PUBLIC_DEV_SERVER_PORT=8081

# Debug Configuration
EXPO_PUBLIC_ENABLE_DEBUG_MENU=true
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
EXPO_PUBLIC_LOG_LEVEL=debug
```

## Development Environment Configuration

### Backend Development Setup

#### Database Setup
```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create development database
sudo -u postgres createdb offscreen_dev

# Create database user
sudo -u postgres psql -c "CREATE USER offscreen_dev WITH PASSWORD 'dev_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE offscreen_dev TO offscreen_dev;"

# Run database migrations
cd backend
npm run migrate:dev
npm run seed:dev
```

#### Redis Setup
```bash
# Start Redis service
sudo systemctl start redis
sudo systemctl enable redis

# Test Redis connection
redis-cli ping
# Should return: PONG
```

#### Backend Development Server
```bash
# Start development server with hot reload
cd backend
npm run dev

# Server will start on http://localhost:3000
# API documentation available at http://localhost:3000/docs
```

### Mobile App Development Setup

#### Expo Development Setup
```bash
# Navigate to app directory
cd app

# Install Expo CLI globally
npm install -g @expo/cli

# Start Expo development server
npm start
# or
expo start

# The app will be available at:
# - Metro bundler: http://localhost:8081
# - Development build: exp://192.168.1.100:8081
```

#### iOS Development Setup (macOS only)
```bash
# Install iOS Simulator
# Xcode will install simulators automatically

# Start iOS simulator from Expo
expo start --ios

# Or open Xcode and select Simulator
open -a Simulator
```

#### Android Development Setup
```bash
# Set Android environment variables in ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools

# Install Android SDK platforms and tools
sdkmanager "platforms;android-33"
sdkmanager "build-tools;33.0.0"
sdkmanager "platform-tools"

# Create Android Virtual Device (AVD)
avdmanager create avd -n "offscreen_dev_avd" -k "system-images;android-33;google_apis;x86_64"

# Start Android emulator
emulator -avd offscreen_dev_avd

# Start Expo with Android
expo start --android
```

### Supabase Development Setup

#### Local Supabase Setup
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize local Supabase project
supabase init

# Start local Supabase services
supabase start

# This will start:
# - PostgreSQL database
# - API Gateway
# - Auth service
# - Storage service
# - Realtime service
```

#### Supabase Database Setup
```sql
-- Run in Supabase SQL Editor or psql
-- Enable Row Level Security
ALTER DATABASE postgres SET "app.settings.jwt_secret" TO 'your-jwt-secret';

-- Create necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set up database schemas and tables
-- (Run migration files from backend/migrations/)
```

### Development Tools Setup

#### Code Quality Tools

##### ESLint Configuration
```bash
# Install ESLint dependencies
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Configure ESLint
npx eslint --init
```

```json
// .eslintrc.json
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 12,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "no-console": "warn"
  }
}
```

##### Prettier Configuration
```bash
# Install Prettier
npm install --save-dev prettier eslint-config-prettier

# Configure Prettier
echo '{ "semi": true, "trailingComma": "es5" }' > .prettierrc
```

#### Testing Framework Setup

##### Jest Configuration
```bash
# Install Jest and related packages
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest

# Configure Jest
npx jest --init
```

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
```

#### Git Hooks Setup
```bash
# Install Husky
npm install --save-dev husky

# Initialize Husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run type-check"

# Add commit message hook
npx husky add .husky/commit-msg "npx commitlint --edit $1"
```

#### Package.json Scripts
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:mobile\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:mobile": "cd app && npm start",
    "dev:full": "npm run dev:database && npm run dev:redis && npm run dev",
    "dev:database": "sudo systemctl start postgresql",
    "dev:redis": "sudo systemctl start redis",
    "build": "npm run build:backend && npm run build:mobile",
    "build:backend": "cd backend && npm run build",
    "build:mobile": "cd app && npm run build",
    "test": "npm run test:backend && npm run test:mobile",
    "test:backend": "cd backend && npm test",
    "test:mobile": "cd app && npm test",
    "lint": "npm run lint:backend && npm run lint:mobile",
    "lint:backend": "cd backend && npm run lint",
    "lint:mobile": "cd app && npm run lint",
    "type-check": "npm run type-check:backend && npm run type-check:mobile",
    "type-check:backend": "cd backend && npm run type-check",
    "type-check:mobile": "cd app && npm run type-check",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "clean": "npm run clean:backend && npm run clean:mobile",
    "clean:backend": "cd backend && npm run clean",
    "clean:mobile": "cd app && npm run clean",
    "setup": "npm install && npm run setup:backend && npm run setup:mobile",
    "setup:backend": "cd backend && npm install && npm run migrate:dev && npm run seed:dev",
    "setup:mobile": "cd app && npm install"
  }
}
```

## Development Workflow

### Daily Development Workflow
```bash
# 1. Start development environment
npm run dev

# 2. Run tests before committing
npm run test
npm run lint

# 3. Format code
npm run format

# 4. Commit changes
git add .
git commit -m "feat: add new feature description"
git push origin feature-branch
```

### Code Review Process
```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes and commit
git commit -am "feat: implement new feature"

# 3. Push to remote
git push origin feature/your-feature-name

# 4. Create pull request on GitHub
# 5. Address review comments
# 6. Merge after approval
```

### Debugging Setup

#### Backend Debugging
```bash
# Enable debug mode
DEBUG=offscreen:* npm run dev

# Use Node.js inspector
node --inspect backend/src/server.js

# Debug with VS Code
# Use launch.json configuration for Node.js
```

#### Mobile Debugging
```bash
# Enable React Native debugger
# 1. Install React Native Debugger
# 2. Start Metro bundler
# 3. Enable debugging in Expo DevTools
# 4. Use Chrome DevTools for debugging
```

### Performance Monitoring

#### Development Performance Setup
```javascript
// app/src/utils/performance/DevelopmentProfiler.ts
import { PerformanceObserver, performance } from 'perf_hooks';

export class DevelopmentProfiler {
  private observer: PerformanceObserver;
  
  constructor() {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 100) {
          console.warn(`Slow operation detected: ${entry.name} took ${entry.duration}ms`);
        }
      }
    });
    
    this.observer.observe({ entryTypes: ['measure'] });
  }

  startMeasure(name: string): void {
    performance.mark(`${name}-start`);
  }

  endMeasure(name: string): void {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
  }
}
```

## Common Development Tasks

### Adding New Dependencies
```bash
# Backend dependencies
cd backend
npm install package-name
npm install --save-dev @types/package-name

# Mobile app dependencies
cd app
expo install package-name

# Root level dependencies (shared utilities)
npm install package-name
```

### Database Migrations
```bash
# Create new migration
cd backend
npm run migrate:create migration_name

# Run migrations
npm run migrate:up

# Rollback migration
npm run migrate:down

# Reset database
npm run migrate:reset
```

### Testing
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- test-file-name.test.ts
```

### Building for Different Environments
```bash
# Development build
npm run build:dev

# Staging build
npm run build:staging

# Production build
npm run build:prod
```

## Troubleshooting

### Common Issues and Solutions

#### Metro bundler issues
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear npm cache
npm start -- --clear
```

#### Backend database connection issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-13-main.log
```

#### Mobile app building issues
```bash
# Clean Expo cache
expo r -c

# Clear npm cache
npm start -- --clear

# Reset Metro bundler
npx react-native start --reset-cache
```

#### Environment variable issues
```bash
# Verify environment variables are loaded
npm run env:check

# Reload environment
source .env.development
```

### Development Environment Validation
```bash
# Run environment check script
npm run env:validate

# Expected output:
# ✅ Node.js version: v18.x.x
# ✅ npm version: 8.x.x
# ✅ PostgreSQL: running
# ✅ Redis: running
# ✅ Backend API: http://localhost:3000
# ✅ Mobile app: http://localhost:8081
```

This development environment setup guide provides a comprehensive foundation for developers to start working on the OffScreen Buddy project efficiently and consistently.
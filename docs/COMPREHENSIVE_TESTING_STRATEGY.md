# Comprehensive Testing Strategy

## Overview
This document outlines the testing strategy for OffScreen Buddy, covering unit tests, integration tests, end-to-end tests, and performance testing to ensure reliable and maintainable code.

## Testing Pyramid Structure

```
    E2E Tests (10%)
   ━━━━━━━━━━━━━━━━
   Integration Tests (20%)
  ━━━━━━━━━━━━━━━━━━━━━━
    Unit Tests (70%)
   ━━━━━━━━━━━━━━━━━
```

## 1. Unit Testing

### Frontend (Jest + React Native Testing Library)
**Location**: `app/__tests__/` or alongside components

```typescript
// Example component test
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Button } from '@/components/Button';

describe('Button Component', () => {
  it('should render with correct text', () => {
    render(<Button title="Test Button" onPress={jest.fn()} />);
    expect(screen.getByText('Test Button')).toBeTruthy();
  });

  it('should call onPress when tapped', () => {
    const mockPress = jest.fn();
    render(<Button title="Test Button" onPress={mockPress} />);
    
    fireEvent.press(screen.getByText('Test Button'));
    expect(mockPress).toHaveBeenCalledTimes(1);
  });
});
```

### Backend (Jest + Supertest)
**Location**: `backend/__tests__/`

```javascript
// Example API test
const request = require('supertest');
const app = require('../server');

describe('Auth Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@example.com',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});
```

## 2. Integration Testing

### Frontend-Backend Integration
```typescript
// E2E API integration test
import { validateUserProfile } from '@/utils/validation/EnhancedValidator';
import { supabase } from '@/services/Supabase/supabase';

describe('User Profile Integration', () => {
  it('should create user profile through API', async () => {
    const profileData = {
      name: 'John Doe',
      email: 'john@example.com',
      country: 'US'
    };

    // Validate data locally
    const validation = await validateUserProfile(profileData);
    expect(validation.success).toBe(true);

    // Test API integration
    const response = await supabase
      .from('user_profiles')
      .insert(profileData);
    
    expect(response.error).toBeNull();
  });
});
```

### Database Integration
```javascript
// Backend database integration test
const { createTestDb, cleanupTestDb } = require('./testDb');

describe('Database Integration', () => {
  beforeAll(async () => {
    await createTestDb();
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  it('should create and retrieve user', async () => {
    const UserService = require('../services/UserService');
    
    // Create user
    const user = await UserService.createUser({
      email: 'test@example.com',
      name: 'Test User'
    });
    
    expect(user.id).toBeDefined();
    
    // Retrieve user
    const retrieved = await UserService.getUserById(user.id);
    expect(retrieved.email).toBe('test@example.com');
  });
});
```

## 3. End-to-End Testing

### Mobile App Testing (Detox)
```typescript
// e2e/smoke.spec.ts
describe('App Launch', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should show onboarding screen on first launch', async () => {
    await element(by.id('onboarding-screen')).waitForVisible();
    await expect(element(by.text('Welcome to OffScreen Buddy'))).toBeVisible();
  });

  it('should complete authentication flow', async () => {
    // Navigate to auth screen
    await element(by.id('skip-onboarding')).tap();
    await element(by.id('auth-screen')).waitForVisible();
    
    // Fill login form
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();
    
    // Verify successful login
    await element(by.id('main-app-screen')).waitForVisible();
  });
});
```

### Web Testing (Cypress)
```typescript
// e2e/web/auth.cy.ts
describe('Authentication Flow', () => {
  it('should complete registration flow', () => {
    cy.visit('/register');
    
    cy.get('[data-testid="name-input"]').type('John Doe');
    cy.get('[data-testid="email-input"]').type('john@example.com');
    cy.get('[data-testid="password-input"]').type('SecurePass123');
    cy.get('[data-testid="register-button"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome, John Doe').should('be.visible');
  });
});
```

## 4. Performance Testing

### Load Testing (Artillery for Backend)
```yaml
# backend/tests/load/load-test.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 5
    - duration: 120
      arrivalRate: 10
  defaults:
    headers:
      Authorization: 'Bearer {{ token }}'

scenarios:
  - name: "API Load Test"
    requests:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          expect:
            - statusCode: 200
```

### Frontend Performance (Lighthouse CI)
```javascript
// .github/workflows/lighthouse-ci.yml
name: Lighthouse CI
on: [push]
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci && npm run build
      - uses: treosh/lighthouse-ci-action@v8
        with:
          configPath: './lighthouserc.json'
          uploadArtifacts: true
```

## 5. Test Data Management

### Frontend Test Fixtures
```typescript
// __tests__/fixtures/user.ts
export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  name: 'Test User',
  created_at: '2023-01-01T00:00:00Z'
};

export const createMockTimerSession = (overrides = {}) => ({
  id: 'session-123',
  type: 'work',
  duration: 1500,
  completed: false,
  ...overrides
});
```

### Backend Test Database
```javascript
// backend/tests/helpers/testDb.js
const { Pool } = require('pg');

const testDb = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || 'postgresql://localhost/test_db'
});

async function createTestDb() {
  // Run migrations on test database
  await testDb.query(`
    DROP TABLE IF EXISTS user_profiles CASCADE;
    -- Add your migration SQL here
  `);
}

module.exports = {
  testDb,
  createTestDb,
  cleanupTestDb: async () => {
    await testDb.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }
};
```

## 6. Test Coverage Goals

| Component | Coverage Goal | Priority |
|-----------|---------------|----------|
| Business Logic | 90% | High |
| API Routes | 85% | High |
| Components | 80% | Medium |
| Utils/Helpers | 75% | Medium |
| Integration Points | 70% | High |

## 7. Continuous Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run test:e2e:web

  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd backend && npm ci
      - run: cd backend && npm test
```

## 8. Mocking Strategies

### API Mocking
```typescript
// __mocks__/services/Supabase/supabase.ts
export const supabase = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null } }))
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn()
  }))
};
```

### Async Storage Mocking
```typescript
// __mocks__/@react-native-async-storage/async-storage.ts
export default {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn()
};
```

## 9. Test Execution Commands

### Frontend
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests (iOS)
npm run test:e2e:ios

# E2E tests (Android)
npm run test:e2e:android

# E2E tests (Web)
npm run test:e2e:web
```

### Backend
```bash
# Unit tests
cd backend && npm test

# Integration tests
cd backend && npm run test:integration

# Load tests
cd backend && npm run test:load

# All tests with coverage
cd backend && npm run test:all
```

## 10. Best Practices

### Testing Guidelines
1. **Write tests first** (TDD approach for critical features)
2. **Use meaningful test descriptions** that explain the expected behavior
3. **Mock external dependencies** to ensure tests are reliable and fast
4. **Keep tests isolated** - each test should be independent
5. **Test user behavior**, not implementation details
6. **Use data builders** for complex test scenarios
7. **Group related tests** using `describe` blocks
8. **Clean up test data** in `afterEach` or `afterAll` hooks

### Common Patterns
```typescript
// Test user interaction
it('should update timer when user presses start', async () => {
  const { getByTestId } = render(<TimerScreen />);
  
  fireEvent.press(getByTestId('start-timer'));
  
  await waitFor(() => {
    expect(getByTestId('timer-display')).toHaveTextContent('25:00');
  });
});

// Test error handling
it('should show error message on network failure', async () => {
  jest.spyOn(api, 'saveData').mockRejectedValue(new Error('Network error'));
  
  const { findByText } = render(<DataScreen />);
  
  expect(await findByText('Network error occurred')).toBeTruthy();
});
```

## 11. Test Environment Setup

### Required Environment Variables
```bash
# Frontend (.env.test)
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend (.env.test)
NODE_ENV=test
DATABASE_URL=postgresql://localhost/offscreen_buddy_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret
```

This comprehensive testing strategy ensures robust, maintainable, and reliable code across all layers of the application.
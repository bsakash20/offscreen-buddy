const request = require('supertest');
const app = require('../server');
const { supabase } = require('../config/supabase');

// Mock specific Supabase auth methods not covered by setup.js
supabase.auth = {
    ...supabase.auth,
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    admin: {
        updateUserById: jest.fn().mockResolvedValue({ error: null }),
        getUserById: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user', user_metadata: {} } } })
    }
};

describe('Auth API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            // Mock SignUp success
            supabase.auth.signUp = jest.fn().mockResolvedValue({
                data: {
                    user: { id: 'new-user-id', email: 'test@example.com' },
                    session: { access_token: 'test-token' }
                },
                error: null // Important: Explicit null error
            });

            // Mock DB Interactions
            // We need a chainable mock that handles select/insert/eq/limit/single
            // and returns a Promise-like result when awaited.

            const mockResult = { data: [], error: null };
            const mockSingleResult = { data: {}, error: null };
            const mockInsertResult = { error: null };

            // Helper to create a chainable builder
            const createBuilder = () => {
                const builder = {};
                builder.select = jest.fn(() => builder);
                builder.insert = jest.fn(() => Promise.resolve(mockInsertResult)); // Insert awaits directly
                builder.update = jest.fn(() => builder); // Update might await or chain
                builder.delete = jest.fn(() => builder);
                builder.eq = jest.fn(() => builder);
                builder.is = jest.fn(() => builder);
                builder.in = jest.fn(() => builder);
                builder.limit = jest.fn(() => {
                    // limit returns a promise that resolves to data (for freePlans check)
                    return Promise.resolve({ data: [{ id: 'plan-id' }], error: null });
                });
                builder.single = jest.fn(() => Promise.resolve(mockSingleResult));
                builder.maybeSingle = jest.fn(() => Promise.resolve(mockSingleResult));

                return builder;
            };

            const mockBuilder = createBuilder();
            supabase.from = jest.fn(() => mockBuilder);

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'Password123!',
                    name: 'Test User'
                });

            if (res.status !== 201) {
                console.error('Register Error Body:', JSON.stringify(res.body, null, 2));
            }
            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('id', 'new-user-id');
        });

        it('should return 400 validation error for invalid email', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'Password123!',
                    name: 'Test User'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toBe('Validation failed');
        });
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with valid credentials', async () => {
            // Mock SignIn Success
            supabase.auth.signInWithPassword = jest.fn().mockResolvedValue({
                data: {
                    user: { id: 'user-id' },
                    session: { access_token: 'login-token' }
                },
                error: null
            });

            // Create a chainable, thenable builder
            const mockBuilder = {};
            mockBuilder.select = jest.fn(() => mockBuilder);
            mockBuilder.update = jest.fn(() => mockBuilder);
            mockBuilder.eq = jest.fn(() => mockBuilder);
            mockBuilder.single = jest.fn().mockResolvedValue({
                data: {
                    id: 'user-id',
                    email: 'test@example.com',
                    name: 'Test User',
                    is_active: true,
                    user_subscriptions: [{
                        status: 'active',
                        subscription_plans: { tier: 'free', features: [] }
                    }]
                },
                error: null
            });

            // Make the builder thenable so it resolves when awaited (for update().eq())
            mockBuilder.then = (resolve) => resolve({ data: [], error: null });

            supabase.from = jest.fn(() => mockBuilder);

            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    identifier: 'test@example.com',
                    password: 'Password123!'
                });

            if (res.status !== 200) {
                console.error('Login Error Body:', JSON.stringify(res.body, null, 2));
            }
            expect(res.status).toBe(200);
            expect(res.body.token).toBe('login-token');
        });
    });
});

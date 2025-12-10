const request = require('supertest');
const app = require('../server');
const { supabase } = require('../config/supabase');

describe('User API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Helper to create a chainable Supabase mock
    const createMockBuilder = (resultData = {}, error = null) => {
        const builder = {};
        builder.select = jest.fn(() => builder);
        builder.insert = jest.fn(() => builder);
        builder.update = jest.fn(() => builder);
        builder.delete = jest.fn(() => builder);
        builder.eq = jest.fn(() => builder);
        builder.single = jest.fn().mockResolvedValue({ data: resultData, error });
        builder.maybeSingle = jest.fn().mockResolvedValue({ data: resultData, error });
        // For limit/order chaining if needed
        builder.limit = jest.fn(() => Promise.resolve({ data: resultData, error }));
        builder.order = jest.fn(() => builder);

        // Make it thenable for direct awaits on the builder (like update().eq())
        builder.then = (resolve) => resolve({ data: resultData, error });

        return builder;
    };

    describe('GET /api/user/profile', () => {
        it('should return user profile successfully', async () => {
            // Mock Auth User (for middleware)
            supabase.auth.getUser = jest.fn().mockResolvedValue({
                data: { user: { id: 'user-id' } },
                error: null
            });

            // Mock DB Profile (Merged for Middleware & Controller)
            const mockProfile = {
                id: 'user-id',
                email: 'test@example.com',
                name: 'Test User',
                is_active: true, // Middleware needs this
                last_active: new Date().toISOString(), // Middleware needs this
                user_subscriptions: [{
                    status: 'active',
                    subscription_plans: { tier: 'pro', price_monthly: 9.99 }
                }]
            };

            const mockBuilder = createMockBuilder(mockProfile);

            // Update mock for auth activity update
            mockBuilder.update = jest.fn(() => createMockBuilder(mockProfile));

            supabase.from = jest.fn(() => mockBuilder);

            const res = await request(app)
                .get('/api/user/profile')
                .set('Authorization', 'Bearer valid-token');

            if (res.status !== 200) {
                console.error('Get Profile Error:', JSON.stringify(res.body, null, 2));
            }
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('email', 'test@example.com');
            expect(res.body.subscription).toHaveProperty('tier', 'pro');
        });

        it('should return 401 if not authenticated', async () => {
            supabase.auth.getUser = jest.fn().mockResolvedValue({
                data: { user: null },
                error: new Error('Invalid token')
            });

            const res = await request(app).get('/api/user/profile');
            expect(res.status).toBe(401);
        });
    });

    describe('PUT /api/user/profile', () => {
        it('should update user profile', async () => {
            // Mock Auth
            supabase.auth.getUser = jest.fn().mockResolvedValue({
                data: { user: { id: 'user-id' } },
                error: null
            });

            const mockProfile = {
                id: 'user-id',
                email: 'test@example.com',
                name: 'Updated Name',
                is_active: true,
                last_active: new Date().toISOString(),
                country_code: 'US',
                country_name: 'United States',
                user_subscriptions: []
            };

            const mockBuilder = createMockBuilder(mockProfile);

            // Handle Country lookup
            mockBuilder.select = jest.fn((cols) => {
                if (cols && cols.includes('country_code')) {
                    // This is likely the country lookup
                    return createMockBuilder({ country_code: 'US', country_name: 'United States' });
                }
                return mockBuilder; // Return self for other selects
            });

            supabase.from = jest.fn(() => mockBuilder);

            const res = await request(app)
                .put('/api/user/profile')
                .set('Authorization', 'Bearer token')
                .send({
                    name: 'Updated Name',
                    countryCode: 'US'
                });

            if (res.status !== 200) {
                console.error('Update Profile Error:', JSON.stringify(res.body, null, 2));
            }
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Name');
        });
    });
});

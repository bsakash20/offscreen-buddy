const request = require('supertest');
const app = require('../server');

// Mock memory usage to ensure health check passes
const originalMemoryUsage = process.memoryUsage;
beforeAll(() => {
    process.memoryUsage = jest.fn(() => ({
        heapUsed: 50 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        rss: 200 * 1024 * 1024
    }));
});

afterAll(() => {
    process.memoryUsage = originalMemoryUsage;
});

describe('Health Check API', () => {
    it('GET /api/health should return 200 OK', async () => {
        const res = await request(app).get('/api/health');
        if (res.statusCode !== 200) {
            console.error('Health Check Failed:', JSON.stringify(res.body, null, 2));
        }
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('status', 'healthy');
    });
});

const axios = require('axios');

async function testRegistration() {
    try {
        console.log('Testing basic registration...');

        const testData = {
            name: 'John Test',
            email: `john.test.${Date.now()}@gmail.com`,
            password: 'SecurePass123'
        };

        console.log('Request data:', testData);

        const response = await axios.post('http://localhost:3001/api/auth/register', testData, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
        });

        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('Request failed:');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('Error:', error.message);
        }
    }
}

testRegistration();
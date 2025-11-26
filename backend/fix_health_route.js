const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
let content = fs.readFileSync(serverPath, 'utf8');

// Remove any existing health route mount
content = content.replace(/app\.use\(['"']\/health['"'],\s*healthRoutes\);\s*$/gm, '');

// Add health route mount after API routes comment but before the logging section
content = content.replace(
    /\/\/ API Routes with PayU mobile app security\s*$/m,
    `// API Routes with PayU mobile app security
// Health check endpoints (mounted at /api/health for consistency)
app.use('/api/health', healthRoutes);`
);

fs.writeFileSync(serverPath, content);
console.log('✅ Health route fixed - moved to /api/health');
#!/bin/bash

# setup-monitoring.sh - Monitoring infrastructure setup script
# Usage: ./setup-monitoring.sh

set -e

echo "📊 Monitoring setup started"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to install monitoring tools
install_monitoring_tools() {
    log "🔧 Installing monitoring tools..."
    
    # Create monitoring directory structure
    mkdir -p monitoring/{logs,metrics,alerts,config}
    
    # Install basic monitoring scripts
    log "📝 Creating basic monitoring scripts..."
    
    # Health check script
    cat > monitoring/health-check.js << 'EOF'
#!/usr/bin/env node
// Basic health check script
const http = require('http');

const checkHealth = (service, url, expectedStatus = 200) => {
    return new Promise((resolve) => {
        http.get(url, (res) => {
            if (res.statusCode === expectedStatus) {
                console.log(`✅ ${service}: HEALTHY`);
                resolve(true);
            } else {
                console.log(`❌ ${service}: UNHEALTHY (Status: ${res.statusCode})`);
                resolve(false);
            }
        }).on('error', (err) => {
            console.log(`❌ ${service}: ERROR - ${err.message}`);
            resolve(false);
        });
    });
};

async function main() {
    const services = [
        { name: 'Backend', url: 'http://localhost:3001/health' },
        { name: 'Frontend', url: 'http://localhost:3000' }
    ];
    
    let healthy = 0;
    for (const service of services) {
        const isHealthy = await checkHealth(service.name, service.url);
        if (isHealthy) healthy++;
    }
    
    console.log(`\n📊 Overall Health: ${healthy}/${services.length} services healthy`);
    process.exit(healthy === services.length ? 0 : 1);
}

main().catch(console.error);
EOF
    
    # Performance monitoring script
    cat > monitoring/performance-check.js << 'EOF'
#!/usr/bin/env node
// Basic performance monitoring script
const os = require('os');

function getSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuLoad = os.loadavg();
    const uptime = os.uptime();
    
    console.log('\n📊 System Performance Metrics:');
    console.log(`⏱️  Uptime: ${Math.floor(uptime / 60)} minutes`);
    console.log(`💾 Memory RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(`💾 Memory Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`📈 CPU Load (1m, 5m, 15m): ${cpuLoad.map(x => x.toFixed(2)).join(', ')}`);
    
    // Alert thresholds
    if (cpuLoad[0] > 2.0) {
        console.log('⚠️  High CPU load detected');
    }
    
    if (memUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
        console.log('⚠️  High memory usage detected');
    }
}

getSystemMetrics();
EOF
    
    # Log monitoring script
    cat > monitoring/log-monitor.js << 'EOF'
#!/usr/bin/env node
// Basic log monitoring script
const fs = require('fs');
const path = require('path');

function monitorLogs() {
    const logDirs = ['logs', 'backend/logs'];
    
    logDirs.forEach(dir => {
        if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir).filter(f => f.endsWith('.log'));
            if (files.length > 0) {
                console.log(`📄 Logs in ${dir}:`);
                files.forEach(file => {
                    const filePath = path.join(dir, file);
                    const stats = fs.statSync(filePath);
                    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
                    console.log(`   - ${file}: ${sizeInMB}MB`);
                });
            }
        }
    });
}

monitorLogs();
EOF
    
    chmod +x monitoring/*.js
    log "✅ Monitoring scripts created"
}

# Function to setup alerting
setup_alerting() {
    log "🚨 Setting up alerting configuration..."
    
    # Create alert configuration
    cat > monitoring/config/alerts.yml << 'EOF'
# Basic alert configuration
alerts:
  - name: "High CPU Usage"
    condition: "cpu_load > 2.0"
    duration: "5m"
    severity: "warning"
    
  - name: "High Memory Usage"
    condition: "memory_usage > 500MB"
    duration: "2m"
    severity: "warning"
    
  - name: "Service Down"
    condition: "service_health == false"
    duration: "1m"
    severity: "critical"
EOF
    
    # Create notification script
    cat > monitoring/notify-alert.js << 'EOF'
#!/usr/bin/env node
// Alert notification script
const sendAlert = (alertType, message) => {
    console.log(`🚨 ALERT [${alertType.toUpperCase()}]: ${message}`);
    // This would integrate with actual notification services
    // Email, Slack, PagerDuty, etc.
};

const args = process.argv.slice(2);
if (args.length >= 2) {
    sendAlert(args[0], args.slice(1).join(' '));
} else {
    console.error('Usage: node notify-alert.js <type> <message>');
}
EOF
    
    chmod +x monitoring/notify-alert.js
    log "✅ Alerting configuration created"
}

# Function to setup monitoring dashboard
setup_monitoring_dashboard() {
    log "📊 Setting up monitoring dashboard..."
    
    # Create simple dashboard HTML
    cat > monitoring/dashboard.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Monitoring Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .healthy { border-left: 4px solid #28a745; }
        .unhealthy { border-left: 4px solid #dc3545; }
        .warning { border-left: 4px solid #ffc107; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>📊 Application Monitoring Dashboard</h1>
    <div id="metrics"></div>
    
    <script>
        // Simple auto-refresh dashboard
        async function fetchMetrics() {
            try {
                const response = await fetch('/api/health');
                const health = await response.json();
                
                const metrics = [
                    { name: 'Backend Health', status: health.backend ? 'healthy' : 'unhealthy' },
                    { name: 'Frontend Health', status: health.frontend ? 'healthy' : 'unhealthy' }
                ];
                
                const metricsDiv = document.getElementById('metrics');
                metricsDiv.innerHTML = metrics.map(m => 
                    `<div class="metric ${m.status}">
                        <h3>${m.name}: ${m.status.toUpperCase()}</h3>
                    </div>`
                ).join('');
            } catch (error) {
                document.getElementById('metrics').innerHTML = 
                    '<div class="metric unhealthy"><h3>Error loading metrics</h3></div>';
            }
        }
        
        fetchMetrics();
        setInterval(fetchMetrics, 30000); // Refresh every 30 seconds
    </script>
</body>
</html>
EOF
    
    log "✅ Monitoring dashboard created"
}

# Function to setup log rotation
setup_log_rotation() {
    log "📝 Setting up log rotation..."
    
    cat > monitoring/config/logrotate.conf << 'EOF'
# Log rotation configuration
logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 app app
    postrotate
        # Restart services if needed
        echo "Logs rotated"
    endscript
}
EOF
    
    log "✅ Log rotation configuration created"
}

# Main execution
install_monitoring_tools
setup_alerting
setup_monitoring_dashboard
setup_log_rotation

# Create monitoring startup script
cat > monitoring/start.sh << 'EOF'
#!/bin/bash
# Start monitoring services
echo "📊 Starting monitoring services..."

# Start health check monitoring
node monitoring/health-check.js &

# Start performance monitoring
node monitoring/performance-check.js &

# Start log monitoring
node monitoring/log-monitor.js &

echo "✅ Monitoring services started"
echo "📊 Dashboard available at: http://localhost:3000/monitoring/dashboard.html"
EOF

chmod +x monitoring/start.sh

log "🎉 Monitoring setup completed successfully!"
echo ""
echo "📊 Monitoring Setup Summary:"
echo "   Scripts: Health, Performance, Log monitoring"
echo "   Dashboard: Basic HTML dashboard created"
echo "   Alerting: Basic alert configuration"
echo "   Log Rotation: Configured"
echo ""
echo "📋 Next Steps:"
echo "   1. Start monitoring: ./monitoring/start.sh"
echo "   2. Access dashboard: http://localhost:3000/monitoring/dashboard.html"
echo "   3. Configure alert notifications"
echo "   4. Set up external monitoring service if needed"
echo ""
echo "⏰ Timestamp: $(date)"
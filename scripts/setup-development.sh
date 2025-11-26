#!/bin/bash

# setup-development.sh - Development environment setup script
# Usage: ./setup-development.sh [--reset]

set -e

echo "🚀 Setting up development environment..."

# Check if --reset flag is provided
if [[ "$1" == "--reset" ]]; then
    echo "🔄 Reset flag detected. Cleaning development environment..."
    rm -rf node_modules package-lock.json
    rm -rf backend/node_modules backend/package-lock.json
    echo "✅ Cleaned node_modules directories"
fi

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install backend dependencies
if [ -d "backend" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
else
    echo "⚠️  Backend directory not found, skipping backend setup"
fi

# Create necessary directories
mkdir -p logs
mkdir -p temp

# Check for environment files
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env.local
    else
        echo "⚠️  No .env.example found, creating basic .env.local"
        cat > .env.local << EOF
# Development Environment Variables
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=development
EOF
    fi
fi

# Check for backend environment file
if [ ! -f "backend/.env.local" ]; then
    echo "📝 Creating backend .env.local from template..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env.local
    else
        echo "⚠️  No backend .env.example found, creating basic .env.local"
        cat > backend/.env.local << EOF
# Backend Development Environment
PORT=3001
DATABASE_URL=your_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EOF
    fi
fi

echo "✅ Development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review and update .env.local files with your actual values"
echo "   2. Run 'npm run dev' to start development servers"
echo "   3. Check that all services are running properly"
echo ""
echo "🎉 Happy coding!"
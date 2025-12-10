# OffScreen Buddy

A comprehensive screen-time discipline mobile application built with React Native/Expo and Node.js, featuring accessibility-first design, payment integration, and performance optimization.

![OffScreen Buddy](./app/_assets/images/icon.png.svg)

## 📱 Overview

OffScreen Buddy is a modern mobile application designed to help users develop healthy screen-time habits and manage their digital wellness through timer functionality, enhanced accessibility features, and seamless payment integration. The app supports both iOS and Android platforms with a robust backend infrastructure.

## ✨ Features

### 🕐 Timer & Productivity
- **Smart Timer System**: Advanced timer functionality with customizable intervals
- **Pomodoro Technique**: Built-in support for Pomodoro timing methodology
- **Progress Tracking**: Real-time progress monitoring
- **Milestone Management**: Achievement-based milestone system

### 🎯 Accessibility-First Design
- **Universal Accessibility**: Comprehensive accessibility support for all users
- **Screen Reader Integration**: Native screen reader compatibility
- **Voice Control**: Hands-free operation capabilities
- **Motor Accessibility**: Support for users with motor impairments
- **Cognitive Accessibility**: Features designed for cognitive ease of use

### 💳 Payment & Subscriptions
- **PayU Integration**: Secure payment processing
- **Multiple Payment Methods**: UPI, Net Banking, Cards
- **Subscription Management**: Flexible subscription plans
- **Payment Analytics**: Transaction monitoring and reporting

### 🔧 Technical Features
- **Offline Support**: Full offline functionality with sync capabilities
- **Performance Optimization**: Advanced caching and performance monitoring
- **Smart Notifications**: Intelligent messaging with standardized 5-second intervals
- **Fake Call Simulation**: Security feature for personal safety
- **Cross-platform**: iOS and Android support

## 🏗️ Architecture

```
OffScreen Buddy/
├── app/                    # React Native/Expo Frontend
│   ├── _components/        # Reusable UI components
│   ├── _services/          # Business logic and API services
│   ├── _contexts/          # React contexts for state management
│   ├── _hooks/             # Custom React hooks
│   ├── _assets/            # Images, fonts, and constants
│   ├── _utils/             # Utility functions
│   └── _design-system/     # Theme and styling configuration
├── backend/                # Node.js/Express Backend
│   ├── routes/             # API routes
│   ├── middleware/         # Express middleware
│   ├── services/           # Backend services
│   ├── models/             # Data models
│   └── utils/              # Utility functions
├── scripts/                # Deployment and utility scripts
└── config/                 # Configuration files
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator / Android Emulator (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd offscreen-buddy
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

4. **Start Development**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start separately
   npm run dev:frontend  # Frontend only
   npm run dev:backend   # Backend only
   ```

5. **Run the App**
   ```bash
   # Start Expo development server
   npm start
   
   # For web
   npm run start:web
   ```

## 🛠️ Development

### Project Structure

- **`app/`** - React Native/Expo mobile application with underscore-prefixed internal modules
- **`backend/`** - Node.js backend API server
- **`scripts/`** - Deployment and automation scripts
- **`config/`** - Application configuration

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start frontend only
npm run dev:backend      # Start backend only

# Linting and Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues

# Deployment
npm run deploy           # Deploy to production
npm run deploy:local     # Deploy to local environment
npm run deploy:prod      # Deploy to production

# Database
npm run deploy:db        # Deploy database changes
npm run deploy:db:local  # Deploy to local database

# Health Checks
npm run health:check     # Check backend health
npm run health:full      # Full health validation
```

### Backend Services

The backend provides comprehensive API services:

- **Authentication**: JWT-based user authentication
- **User Management**: User profiles and preferences
- **Timer Services**: Timer state management and sync
- **Payment Processing**: PayU integration for subscriptions
- **Notifications**: Push notification management

## 🧪 Testing

```bash
# Backend performance testing
cd backend
npm run test:performance
npm run benchmark

# Frontend testing (when implemented)
npm run test
```

## 📦 Deployment

### Environment Setup

1. **Local Development**
   ```bash
   npm run env:setup:local
   ```

2. **Production Deployment**
   ```bash
   npm run env:setup:prod
   npm run deploy:prod
   ```

### Deployment Scripts

- `scripts/deploy.sh` - Main deployment script
- `scripts/deploy-frontend.sh` - Frontend-specific deployment
- `scripts/deploy-backend.sh` - Backend-specific deployment
- `scripts/deploy-database.sh` - Database deployment

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Backend Configuration
PORT=3001
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# PayU Configuration
PAYU_MERCHANT_ID=your_payu_merchant_id
PAYU_SALT=your_payu_salt
PAYU_ENVIRONMENT=sandbox

# Redis Configuration (for caching)
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

### App Configuration

The app uses `app.json` for Expo configuration and `app.config.ts` for runtime configuration.

## 🎨 UI/UX Design

### Design System

- **Framework**: NativeWind for styling
- **Icons**: Expo Vector Icons
- **Navigation**: Expo Router
- **Theme**: Dark mode optimized design
- **Accessibility**: WCAG 2.1 AA compliance

### Key Components

- **Timer Interface**: Intuitive timer controls
- **Settings Panel**: Comprehensive app configuration
- **Accessibility Features**: Screen reader and voice control support
- **Payment UI**: Seamless subscription management

## 🔐 Security

- **Authentication**: JWT-based secure authentication
- **Data Encryption**: End-to-end encryption for sensitive data
- **Payment Security**: PCI DSS compliant PayU integration
- **Rate Limiting**: API rate limiting and DDoS protection
- **CORS Configuration**: Properly configured CORS policies

## 📊 Performance

### Optimization Features

- **Caching**: Multi-layer caching with Redis
- **Bundle Optimization**: Code splitting and lazy loading
- **Performance Monitoring**: Real-time performance analytics
- **Memory Management**: Efficient memory usage patterns
- **Network Optimization**: Request batching and optimization

### Monitoring Tools

- **Backend**: Winston logging, performance monitoring
- **Frontend**: Performance analytics and error tracking
- **Database**: Query optimization and indexing
- **Cache**: Redis monitoring and optimization

## 🌍 Accessibility

### Supported Features

- **Screen Reader**: Full VoiceOver and TalkBack support
- **Voice Control**: Hands-free navigation
- **Motor Accessibility**: Alternative input methods
- **Cognitive Support**: Simplified UI and clear navigation
- **Visual Accessibility**: High contrast and font sizing

### Compliance

- WCAG 2.1 AA standards
- iOS Accessibility Guidelines
- Android Accessibility Guidelines

## 📱 Mobile Support

### Platform Compatibility

- **iOS**: 13.0+ (iPhone/iPad)
- **Android**: API Level 21+ (Android 5.0+)

### Mobile Features

- **Push Notifications**: Expo Notifications for timer reminders and break alerts
- **Screen Time Management**: Digital wellness tracking and healthy habit formation
- **Timer Synchronization**: Cross-device timer state management

## 🗃️ Database

### Supabase Integration

- **Authentication**: Built-in auth with row-level security
- **Real-time**: Live data synchronization
- **Storage**: File storage and management
- **Functions**: Serverless function support

### Database Schema

- **Users**: User profiles and authentication
- **Timers**: Timer sessions and configurations
- **Settings**: User preferences and app settings
- **Subscriptions**: Payment and subscription data
- **Analytics**: Usage and performance metrics

## 🔄 API Documentation

### Authentication Endpoints

```
POST /api/auth/login      # User login
POST /api/auth/register   # User registration
POST /api/auth/logout     # User logout
POST /api/auth/refresh    # Refresh token
```

### Timer Endpoints

```
GET /api/timers           # Get user timers
POST /api/timers          # Create new timer
PUT /api/timers/:id       # Update timer
DELETE /api/timers/:id    # Delete timer
POST /api/timers/:id/start # Start timer
POST /api/timers/:id/pause # Pause timer
```

### Payment Endpoints

```
POST /api/payments/create # Create payment intent
POST /api/payments/verify # Verify payment
GET /api/subscriptions    # Get user subscriptions
POST /api/subscriptions   # Create subscription
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add some amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style and conventions
- Write comprehensive tests for new features
- Update documentation for API changes
- Ensure accessibility compliance
- Test on both iOS and Android platforms

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please contact:
- **Email**: support@offscreenbuddy.com
- **Issues**: Create an issue on GitHub
- **Documentation**: [Project Wiki](wiki-url)

## 📈 Roadmap

### Performance Improvements

- [ ] Further optimization of bundle size
- [ ] Enhanced offline capabilities
- [ ] Improved battery optimization
- [ ] Advanced caching strategies

---

**Built with ❤️ by the OffScreen Buddy Team**

*Making productivity accessible to everyone*
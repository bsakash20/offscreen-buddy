# Service Integration Documentation

## Overview

This comprehensive guide outlines the integration patterns, best practices, and implementation strategies for integrating services within the OffScreen Buddy application architecture, including third-party services, modular plugins, and external APIs.

## Integration Architecture Principles

### Core Integration Principles
1. **Loose Coupling**: Services communicate through well-defined interfaces
2. **Event-Driven**: Asynchronous communication through events
3. **Circuit Breakers**: Fault tolerance and resilience
4. **Version Management**: Backward and forward compatibility
5. **Security First**: Secure integration with proper authentication
6. **Monitoring**: Full observability of integration points
7. **Testing**: Comprehensive integration testing strategies

### Integration Patterns Overview
```
┌─────────────────────────────────────────┐
│         Integration Gateway             │
│  ┌─────────────────────────────────┐   │
│  │      Service Registry           │   │
│  │      Load Balancer              │   │
│  │      Authentication             │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│          Communication Layer            │
│  ┌─────────────────────────────────┐   │
│  │      REST APIs                  │   │
│  │      GraphQL                    │   │
│  │      WebSocket                  │   │
│  │      Message Queue              │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│          Service Mesh                   │
│  ┌─────────────────────────────────┐   │
│  │      Service Discovery          │   │
│  │      Circuit Breaker            │   │
│  │      Retry Logic                │   │
│  │      Health Checks              │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Internal Service Integration

### Service Registry Pattern
```typescript
// integration/service-registry.ts
export class ServiceRegistry {
  private services: Map<string, ServiceInstance> = new Map();
  private healthChecks: Map<string, HealthChecker> = new Map();
  private loadBalancers: Map<string, LoadBalancer> = new Map();

  async registerService(instance: ServiceInstance): Promise<void> {
    // Validate service instance
    await this.validateServiceInstance(instance);
    
    // Register service
    this.services.set(instance.id, {
      ...instance,
      status: 'starting',
      registeredAt: new Date()
    });
    
    // Setup health checking
    if (instance.healthCheck) {
      await this.setupHealthChecking(instance);
    }
    
    // Update load balancer
    if (instance.loadBalancer) {
      await this.updateLoadBalancer(instance);
    }
    
    // Notify service discovery
    await this.notifyServiceDiscovery(instance);
  }

  async discoverService(serviceName: string): Promise<ServiceInstance[]> {
    const services = Array.from(this.services.values())
      .filter(service => service.name === serviceName && service.status === 'healthy');
    
    if (services.length === 0) {
      throw new Error(`No healthy instances found for service: ${serviceName}`);
    }
    
    // Apply load balancing
    const loadBalancer = this.loadBalancers.get(serviceName);
    if (loadBalancer) {
      return loadBalancer.selectInstances(services);
    }
    
    return services;
  }

  private async validateServiceInstance(instance: ServiceInstance): Promise<void> {
    // Validate required fields
    if (!instance.id || !instance.name || !instance.endpoint) {
      throw new Error('Invalid service instance: missing required fields');
    }
    
    // Check for duplicates
    if (this.services.has(instance.id)) {
      throw new Error(`Service instance ${instance.id} already registered`);
    }
    
    // Validate endpoint
    await this.validateEndpoint(instance.endpoint);
  }
}
```

### Event-Driven Architecture
```typescript
// integration/event-system.ts
export class EventSystem {
  private eventBus: EventBus;
  private eventStore: EventStore;
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  async publish<T extends Event>(event: T): Promise<void> {
    try {
      // Store event for audit trail
      await this.eventStore.store(event);
      
      // Validate event
      await this.validateEvent(event);
      
      // Publish to event bus
      await this.eventBus.publish(event);
      
      // Process synchronous handlers
      await this.processSynchronousHandlers(event);
      
      // Schedule asynchronous handlers
      await this.scheduleAsynchronousHandlers(event);
      
    } catch (error) {
      // Handle event publishing failure
      await this.handleEventPublishingError(event, error);
      throw error;
    }
  }

  async subscribe<T extends Event>(
    eventType: string,
    handler: EventHandler<T>,
    options: SubscriptionOptions = {}
  ): Promise<void> {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    const handlers = this.eventHandlers.get(eventType)!;
    handlers.push({
      ...handler,
      id: this.generateHandlerId(),
      subscribedAt: new Date(),
      options
    });
    
    // Log subscription
    await this.logSubscription(eventType, handler);
  }

  private async processSynchronousHandlers<T extends Event>(event: T): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || [];
    
    for (const handler of handlers) {
      if (handler.options.synchronous) {
        try {
          await handler.handle(event);
        } catch (error) {
          await this.handleHandlerError(handler, event, error);
        }
      }
    }
  }
}

// Event definitions
export interface Event {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: Date;
  version: number;
  metadata?: Record<string, any>;
}

export class UserRegisteredEvent implements Event {
  id = generateId();
  type = 'user.registered';
  timestamp = new Date();
  version = 1;

  constructor(
    public aggregateId: string,
    public payload: {
      userId: string;
      email: string;
      registrationMethod: string;
      metadata?: Record<string, any>;
    }
  ) {}
}

export class MilestoneCompletedEvent implements Event {
  id = generateId();
  type = 'milestone.completed';
  timestamp = new Date();
  version = 1;

  constructor(
    public aggregateId: string,
    public payload: {
      milestoneId: string;
      userId: string;
      completionDate: Date;
      progress: number;
      metadata?: Record<string, any>;
    }
  ) {}
}
```

### Circuit Breaker Implementation
```typescript
// integration/circuit-breaker.ts
export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 10000, // 10 seconds
      ...options
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    // Check state and timeouts
    this.checkState();
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private checkState(): void {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.options.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.successCount++;
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = 'OPEN';
      throw new Error(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }
}

// Usage with service integration
export class ServiceIntegration {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  async callService<T>(
    serviceName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    let circuitBreaker = this.circuitBreakers.get(serviceName);
    
    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeout: 30000
      });
      this.circuitBreakers.set(serviceName, circuitBreaker);
    }
    
    return circuitBreaker.execute(operation);
  }
}
```

## External Service Integration

### API Integration Framework
```typescript
// integration/api-client.ts
export class APIClient {
  private httpClient: AxiosInstance;
  private authProvider: AuthenticationProvider;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor(config: APIClientConfig) {
    this.httpClient = axios.create({
      timeout: config.timeout || 30000,
      baseURL: config.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OffScreen-Buddy/1.0'
      }
    });

    this.setupInterceptors();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000
    });
  }

  private setupInterceptors(): void {
    // Request interceptor for authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        const token = await this.authProvider.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, refresh and retry
          await this.authProvider.refreshToken();
          return this.httpClient.request(error.config);
        }
        
        if (error.response?.status === 429) {
          // Rate limited, wait and retry
          const retryAfter = error.response.headers['retry-after'] || 60;
          await this.delay(retryAfter * 1000);
          return this.httpClient.request(error.config);
        }
        
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.httpClient.get<T>(url, { params });
      return response.data;
    });
  }

  async post<T>(url: string, data?: any): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.httpClient.post<T>(url, data);
      return response.data;
    });
  }

  async put<T>(url: string, data?: any): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.httpClient.put<T>(url, data);
      return response.data;
    });
  }

  async delete<T>(url: string): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      const response = await this.httpClient.delete<T>(url);
      return response.data;
    });
  }
}
```

### PayU Payment Integration
```typescript
// integration/payu-integration.ts
export class PayUIntegration {
  private apiClient: APIClient;
  private webhookValidator: WebhookValidator;
  private config: PayUConfig;

  constructor(config: PayUConfig) {
    this.config = config;
    this.apiClient = new APIClient({
      baseURL: config.environment === 'production' 
        ? 'https://secure.payu.in' 
        : 'https://test.payu.in',
      timeout: 30000
    });
    this.webhookValidator = new WebhookValidator(config.salt);
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Validate payment request
      await this.validatePaymentRequest(request);
      
      // Create payment hash
      const hash = this.generatePaymentHash(request);
      
      // Prepare payment data
      const paymentData = {
        key: this.config.merchantId,
        txnid: request.transactionId,
        amount: request.amount.toString(),
        productinfo: request.productInfo,
        firstname: request.customer.firstName,
        lastname: request.customer.lastName,
        email: request.customer.email,
        phone: request.customer.phone,
        surl: request.successUrl,
        furl: request.failureUrl,
        hash: hash,
        ...request.additionalParams
      };

      // Initiate payment
      const response = await this.apiClient.post('/_payment', paymentData);
      
      return {
        success: true,
        paymentId: response.txnid,
        redirectUrl: response.formAction,
        formFields: response.formFields
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifyPayment(transactionId: string): Promise<PaymentVerification> {
    try {
      // Get payment status from PayU
      const response = await this.apiClient.post('/merchant/postservice?form=2', {
        key: this.config.merchantId,
        hash: '',
        var1: transactionId,
        command: 'verify_payment'
      });

      // Parse response
      const status = this.parsePaymentStatus(response);
      
      return {
        success: true,
        transactionId: transactionId,
        status: status.status,
        amount: status.amount,
        gateway: status.gateway,
        bankRefNumber: status.bankRefNumber,
        bankCode: status.bankCode,
        date: status.date
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validateWebhook(webhookData: any): Promise<WebhookValidationResult> {
    try {
      // Verify webhook signature
      const isValid = this.webhookValidator.validate(webhookData);
      
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Additional validation
      await this.validateWebhookData(webhookData);
      
      return {
        isValid: true,
        payment: {
          transactionId: webhookData.txnid,
          amount: webhookData.amount,
          status: webhookData.status,
          productInfo: webhookData.productinfo
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  private generatePaymentHash(request: PaymentRequest): string {
    const hashString = [
      this.config.merchantId,
      request.transactionId,
      request.amount.toString(),
      request.productInfo,
      request.customer.firstName,
      request.customer.email,
      request.customer.phone,
      '', // udf1
      '', // udf2
      '', // udf3
      '', // udf4
      '', // udf5
      '', // udf6
      '', // udf7
      '', // udf8
      '', // udf9,
      '', // udf10
      this.config.salt
    ].join('|');

    return this.createHash(hashString);
  }
}
```

### Supabase Integration
```typescript
// integration/supabase-integration.ts
export class SupabaseIntegration {
  private client: SupabaseClient;
  private authClient: AuthClient;
  private realtimeClient: RealtimeClient;

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    this.authClient = this.client.auth;
    this.realtimeClient = this.client.realtime;
  }

  async authenticateUser(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      const { data, error } = await this.authClient.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createUser(userData: CreateUserData): Promise<UserResult> {
    try {
      // Create user in auth
      const { data: authData, error: authError } = await this.authClient.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName
          }
        }
      });

      if (authError) {
        return {
          success: false,
          error: authError.message
        };
      }

      // Create user profile
      const { data: profileData, error: profileError } = await this.client
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          preferences: userData.preferences || {}
        });

      if (profileError) {
        // Cleanup auth user if profile creation fails
        await this.deleteUser(authData.user.id);
        return {
          success: false,
          error: profileError.message
        };
      }

      return {
        success: true,
        user: authData.user,
        profile: profileData[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async subscribeToRealtime(
    table: string,
    callback: (payload: any) => void
  ): Promise<RealtimeSubscription> {
    return this.client
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        callback
      )
      .subscribe();
  }

  async uploadFile(
    bucket: string,
    path: string,
    file: File
  ): Promise<UploadResult> {
    try {
      const { data, error } = await this.client.storage
        .from(bucket)
        .upload(path, file);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Get public URL
      const { data: urlData } = this.client.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        success: true,
        path: data.path,
        url: urlData.publicUrl
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
```

## Plugin System Integration

### Plugin Architecture
```typescript
// integration/plugin-system.ts
export class PluginSystem {
  private plugins: Map<string, Plugin> = new Map();
  private pluginLoaders: PluginLoader[] = [];
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async loadPlugin(pluginPath: string): Promise<PluginResult> {
    try {
      // Load plugin module
      const PluginClass = await import(pluginPath);
      const pluginInstance = new PluginClass.default();

      // Validate plugin
      await this.validatePlugin(pluginInstance);

      // Register plugin
      this.plugins.set(pluginInstance.id, pluginInstance);

      // Initialize plugin
      await pluginInstance.initialize({
        eventBus: this.eventBus,
        config: this.getPluginConfig(pluginInstance.id),
        logger: this.createPluginLogger(pluginInstance.id)
      });

      // Register event handlers
      await this.registerEventHandlers(pluginInstance);

      return {
        success: true,
        plugin: pluginInstance
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async executePlugin<T>(
    pluginId: string,
    method: string,
    ...args: any[]
  ): Promise<T> {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (typeof plugin[method] !== 'function') {
      throw new Error(`Method ${method} not found on plugin ${pluginId}`);
    }

    return await plugin[method](...args);
  }

  private async registerEventHandlers(plugin: Plugin): Promise<void> {
    const eventHandlers = plugin.getEventHandlers?.() || [];
    
    for (const handler of eventHandlers) {
      await this.eventBus.subscribe(handler.eventType, async (event) => {
        try {
          await handler.handle(event);
        } catch (error) {
          this.handlePluginError(plugin.id, handler.eventType, error);
        }
      });
    }
  }
}

// Plugin interface
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  dependencies?: string[];
  
  initialize(context: PluginContext): Promise<void>;
  execute?(method: string, ...args: any[]): Promise<any>;
  getEventHandlers?(): PluginEventHandler[];
  dispose?(): Promise<void>;
}

export interface PluginContext {
  eventBus: EventBus;
  config: PluginConfig;
  logger: Logger;
}

// Example plugin
export class NotificationPlugin implements Plugin {
  id = 'notification-plugin';
  name = 'Notification Plugin';
  version = '1.0.0';
  description = 'Handles notification processing and delivery';

  async initialize(context: PluginContext): Promise<void> {
    context.logger.info('Initializing notification plugin');
    // Plugin initialization logic
  }

  async sendNotification(notification: NotificationData): Promise<void> {
    // Send notification logic
  }

  getEventHandlers(): PluginEventHandler[] {
    return [
      {
        eventType: 'milestone.completed',
        handle: async (event: MilestoneCompletedEvent) => {
          // Send congratulatory notification
        }
      }
    ];
  }
}
```

### Third-Party Plugin Integrations
```typescript
// integration/third-party-plugins.ts
export class ThirdPartyPluginManager {
  private marketplace: PluginMarketplace;
  private pluginRegistry: PluginRegistry;
  private securityScanner: SecurityScanner;

  async installPlugin(pluginId: string): Promise<InstallationResult> {
    try {
      // Download plugin from marketplace
      const pluginPackage = await this.marketplace.downloadPlugin(pluginId);
      
      // Security scan
      const scanResult = await this.securityScanner.scan(pluginPackage);
      if (!scanResult.isSecure) {
        throw new Error(`Plugin failed security scan: ${scanResult.issues.join(', ')}`);
      }

      // Install plugin
      const installationPath = await this.installPluginFiles(pluginPackage);
      
      // Initialize plugin
      const plugin = await this.initializePlugin(installationPath);
      
      return {
        success: true,
        plugin
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async securityScan(pluginPackage: PluginPackage): Promise<SecurityScanResult> {
    const issues: SecurityIssue[] = [];

    // Static code analysis
    const staticAnalysis = await this.performStaticAnalysis(pluginPackage.sourceCode);
    issues.push(...staticAnalysis.issues);

    // Dependency vulnerability scan
    const vulnScan = await this.scanDependencies(pluginPackage.dependencies);
    issues.push(...vulnScan.issues);

    // Code signature verification
    const signature = await this.verifyCodeSignature(pluginPackage);
    if (!signature.isValid) {
      issues.push({
        type: 'signature_invalid',
        severity: 'high',
        description: 'Plugin code signature is invalid'
      });
    }

    return {
      isSecure: issues.filter(i => i.severity === 'high').length === 0,
      issues
    };
  }
}
```

## API Gateway Integration

### API Gateway Pattern
```typescript
// integration/api-gateway.ts
export class APIGateway {
  private routes: RouteConfig[] = [];
  private middleware: Middleware[] = [];
  private loadBalancer: LoadBalancer;
  private rateLimiter: RateLimiter;

  async configureRoutes(): Promise<void> {
    // Authentication routes
    this.routes.push({
      path: '/api/v1/auth/*',
      target: 'auth-service',
      middleware: ['auth', 'rate-limit'],
      loadBalancing: 'round-robin'
    });

    // User management routes
    this.routes.push({
      path: '/api/v1/users/*',
      target: 'user-service',
      middleware: ['auth', 'validation', 'rate-limit'],
      loadBalancing: 'least-connections'
    });

    // Milestone routes
    this.routes.push({
      path: '/api/v1/milestones/*',
      target: 'milestone-service',
      middleware: ['auth', 'validation', 'cache'],
      loadBalancing: 'weighted'
    });

    // Notification routes
    this.routes.push({
      path: '/api/v1/notifications/*',
      target: 'notification-service',
      middleware: ['auth', 'validation'],
      loadBalancing: 'round-robin'
    });
  }

  async handleRequest(
    request: GatewayRequest
  ): Promise<GatewayResponse> {
    try {
      // Find matching route
      const route = this.findRoute(request.path);
      if (!route) {
        return this.createNotFoundResponse();
      }

      // Apply middleware
      let processedRequest = request;
      for (const middlewareName of route.middleware) {
        const middleware = this.middleware.find(m => m.name === middlewareName);
        if (middleware) {
          processedRequest = await middleware.process(processedRequest);
        }
      }

      // Load balance to target service
      const targetService = await this.loadBalancer.selectTarget(route.target);
      
      // Forward request
      const response = await this.forwardRequest(processedRequest, targetService);
      
      // Apply response middleware
      return await this.applyResponseMiddleware(response, route.middleware);
      
    } catch (error) {
      return this.createErrorResponse(error);
    }
  }

  private async forwardRequest(
    request: GatewayRequest,
    target: ServiceTarget
  ): Promise<GatewayResponse> {
    const client = this.createServiceClient(target);
    
    return client.forward({
      method: request.method,
      path: request.path,
      headers: request.headers,
      body: request.body
    });
  }
}
```

## Testing Integration

### Integration Test Framework
```typescript
// integration/testing/integration-test-suite.ts
export class IntegrationTestSuite {
  private testEnvironment: TestEnvironment;
  private serviceRegistry: ServiceRegistry;
  private eventSystem: EventSystem;

  async setup(): Promise<void> {
    // Start test services
    await this.testEnvironment.start();
    
    // Initialize service registry
    await this.serviceRegistry.initialize();
    
    // Setup event system
    await this.eventSystem.initialize();
    
    // Create test data
    await this.createTestData();
  }

  async testServiceIntegration(): Promise<TestResult> {
    const tests = [
      this.testUserRegistrationFlow(),
      this.testMilestoneCreation(),
      this.testNotificationDelivery(),
      this.testPaymentProcessing(),
      this.testRealTimeUpdates()
    ];

    const results = await Promise.all(tests);
    
    return {
      passed: results.every(r => r.passed),
      results,
      coverage: this.calculateCoverage(results)
    };
  }

  private async testUserRegistrationFlow(): Promise<TestCase> {
    try {
      // Test user registration through API
      const registrationResponse = await this.apiClient.post('/api/v1/auth/register', {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      });

      expect(registrationResponse.success).toBe(true);
      
      // Verify user exists in database
      const user = await this.db.query('SELECT * FROM users WHERE email = ?', ['test@example.com']);
      expect(user.length).toBe(1);
      
      // Test email verification
      const verificationResponse = await this.emailService.sendVerificationEmail(user[0].id);
      expect(verificationResponse.success).toBe(true);
      
      return { passed: true, name: 'user_registration_flow' };
    } catch (error) {
      return { passed: false, name: 'user_registration_flow', error: error.message };
    }
  }

  private async testMilestoneCreation(): Promise<TestCase> {
    try {
      // Create milestone
      const milestoneResponse = await this.apiClient.post('/api/v1/milestones', {
        title: 'Test Milestone',
        description: 'Test Description',
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        category: 'productivity'
      });

      expect(milestoneResponse.success).toBe(true);
      
      // Verify milestone in database
      const milestone = await this.db.query('SELECT * FROM milestones WHERE title = ?', ['Test Milestone']);
      expect(milestone.length).toBe(1);
      
      // Test milestone event publishing
      const events = await this.eventSystem.getEventsForAggregate(milestone[0].id);
      expect(events).toContainEvent('milestone.created');
      
      return { passed: true, name: 'milestone_creation' };
    } catch (error) {
      return { passed: false, name: 'milestone_creation', error: error.message };
    }
  }
}
```

This comprehensive service integration documentation provides the framework for building robust, scalable, and maintainable service integrations within the OffScreen Buddy application architecture.
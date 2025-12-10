/**
 * Plugin Sandbox - Secure execution environment for plugins
 * Provides controlled execution environment with security restrictions
 */

import { SandboxResult, PluginSandbox } from '../modules/ModuleTypes';

export class SecurePluginSandbox implements PluginSandbox {
    private timeoutMap: Map<number, number> = new Map();
    private executionCount: Map<string, number> = new Map();
    private readonly MAX_EXECUTION_TIME = 5000; // 5 seconds
    private readonly MAX_MEMORY_MB = 64; // 64MB limit
    private readonly MAX_EXECUTION_COUNT = 1000;

    constructor(private debug: boolean = false) { }

    /**
     * Execute code in a secure sandboxed environment
     */
    async execute(code: string): Promise<SandboxResult> {
        const startTime = Date.now();

        try {
            // Security validation
            const securityCheck = this.performSecurityCheck(code);
            if (!securityCheck.allowed) {
                return {
                    success: false,
                    error: new Error(`Security violation: ${securityCheck.reason}`),
                    warnings: [`Code blocked by security policy: ${securityCheck.reason}`]
                };
            }

            // Create sandbox environment
            const sandbox = this.createSandboxEnvironment();

            // Execute code with timeout protection
            const result = await this.executeWithTimeout(() => {
                return new Function('sandbox', 'require', `
          "use strict";
          ${code}
        `)(sandbox, sandbox.require);
            }, this.MAX_EXECUTION_TIME);

            // Log execution if debug is enabled
            if (this.debug) {
                console.log(`[PluginSandbox] Code executed successfully in ${Date.now() - startTime}ms`);
            }

            return {
                success: true,
                result,
                warnings: []
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            return {
                success: false,
                error: error as Error,
                warnings: [`Execution failed: ${errorMessage}`]
            };
        }
    }

    /**
     * Evaluate an expression in the sandbox
     */
    evaluate(expression: string): any {
        try {
            // Security validation
            const securityCheck = this.performSecurityCheck(expression);
            if (!securityCheck.allowed) {
                throw new Error(`Security violation: ${securityCheck.reason}`);
            }

            // Create minimal sandbox environment
            const sandbox = this.createMinimalSandbox();

            // Evaluate expression
            const result = new Function('sandbox', 'require', `
        "use strict";
        return (${expression});
      `)(sandbox, sandbox.require);

            return result;

        } catch (error) {
            throw new Error(`Expression evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Import a module with security restrictions
     */
    import(module: string): any {
        // Whitelist of allowed modules
        const allowedModules = [
            'console',
            'Math',
            'Date',
            'JSON',
            'String',
            'Number',
            'Array',
            'Object',
            'Promise',
            'setTimeout',
            'clearTimeout'
        ];

        if (!allowedModules.includes(module)) {
            throw new Error(`Module '${module}' is not allowed in sandbox`);
        }

        if (module === 'console') {
            return this.createSecureConsole();
        }

        if (module === 'setTimeout' || module === 'clearTimeout') {
            return this.createSecureTimeout(module);
        }

        return (global as any)[module];
    }

    /**
     * Execute function with timeout protection
     */
    timeout<T>(fn: Function, ms: number): Promise<T> {
        return this.executeWithTimeout(fn, Math.min(ms, this.MAX_EXECUTION_TIME));
    }

    public get console(): Console {
        return this.createSecureConsole();
    }

    /**
     * Perform security check on code
     */
    private performSecurityCheck(code: string): { allowed: boolean; reason?: string } {
        const dangerousPatterns = [
            /process\./gi,
            /global\./gi,
            /require\s*\(/gi,
            /eval\s*\(/gi,
            /Function\s*\(/gi,
            /constructor/gi,
            /__proto__/gi,
            /prototype\[/gi,
            /child_process/gi,
            /fs\./gi,
            /http\./gi,
            /https\./gi,
            /XMLHttpRequest/gi,
            /fetch\s*\(/gi,
            /WebSocket/gi,
            /localStorage/gi,
            /sessionStorage/gi,
            /document\./gi,
            /window\./gi,
            /document\.cookie/gi,
            /new\s+Error\s*\(/gi
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(code)) {
                return {
                    allowed: false,
                    reason: `Dangerous pattern detected: ${pattern.source}`
                };
            }
        }

        // Check for potential infinite loops
        if (this.containsInfiniteLoop(code)) {
            return {
                allowed: false,
                reason: 'Potential infinite loop detected'
            };
        }

        return { allowed: true };
    }

    /**
     * Check if code contains potential infinite loops
     */
    private containsInfiniteLoop(code: string): boolean {
        // Simple heuristic: while(true) or for(;;) patterns
        const infiniteLoopPatterns = [
            /while\s*\(\s*true\s*\)/gi,
            /for\s*\(\s*;;\s*\)/gi,
            /for\s*\(\s*;\s*;\s*\)/gi
        ];

        return infiniteLoopPatterns.some(pattern => pattern.test(code));
    }

    /**
     * Create sandbox environment for code execution
     */
    private createSandboxEnvironment(): any {
        const sandbox: any = {
            console: this.createSecureConsole(),
            require: (module: string) => this.import(module),
            setTimeout: (fn: Function, ms: number) => this.createSecureTimeout('setTimeout', fn, ms),
            clearTimeout: (id: number) => this.clearSecureTimeout(id),
            Math,
            Date,
            JSON,
            String,
            Number,
            Array,
            Object,
            Promise
        };

        // Freeze the sandbox object to prevent modifications
        Object.freeze(sandbox.console);
        Object.freeze(sandbox);

        return sandbox;
    }

    /**
     * Create minimal sandbox for expression evaluation
     */
    private createMinimalSandbox(): any {
        return {
            console: this.createSecureConsole(),
            require: (module: string) => this.import(module),
            Math,
            Date,
            JSON
        };
    }

    /**
     * Create secure console wrapper
     */
    private createSecureConsole(): Console {
        const originalConsole = console;
        return {
            log: (...args: any[]) => {
                if (this.debug) {
                    originalConsole.log('[Plugin]', ...args);
                }
            },
            warn: (...args: any[]) => {
                if (this.debug) {
                    originalConsole.warn('[Plugin]', ...args);
                }
            },
            error: (...args: any[]) => {
                if (this.debug) {
                    originalConsole.error('[Plugin]', ...args);
                }
            },
            info: (...args: any[]) => {
                if (this.debug) {
                    originalConsole.info('[Plugin]', ...args);
                }
            },
            debug: (...args: any[]) => {
                if (this.debug) {
                    originalConsole.debug('[Plugin]', ...args);
                }
            },
            time: originalConsole.time.bind(originalConsole),
            timeEnd: originalConsole.timeEnd.bind(originalConsole)
        };
    }

    /**
     * Create secure timeout functions
     */
    private createSecureTimeout(type: 'setTimeout' | 'clearTimeout', fn?: Function, ms?: number): any {
        if (type === 'clearTimeout') {
            return (id: number) => {
                const timeout = this.timeoutMap.get(id);
                if (timeout) {
                    clearTimeout(timeout);
                    this.timeoutMap.delete(id);
                }
            };
        }

        if (fn && ms !== undefined) {
            const id = Date.now() + Math.random();

            // Check execution count
            const execCount = this.executionCount.get('timeout') || 0;
            if (execCount >= this.MAX_EXECUTION_COUNT) {
                throw new Error('Maximum timeout execution count exceeded');
            }

            const timeout = setTimeout(() => {
                this.timeoutMap.delete(id);
                this.executionCount.set('timeout', execCount + 1);
                try {
                    fn();
                } catch (error) {
                    console.error('Plugin timeout execution error:', error);
                }
            }, ms);

            this.timeoutMap.set(id, timeout);
            return id;
        }

        return () => { };
    }

    /**
     * Clear secure timeout
     */
    private clearSecureTimeout(id: number): void {
        const timeout = this.timeoutMap.get(id);
        if (timeout) {
            clearTimeout(timeout);
            this.timeoutMap.delete(id);
        }
    }

    /**
     * Execute function with timeout protection
     */
    private async executeWithTimeout<T>(fn: () => T, timeoutMs: number): Promise<T> {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error('Execution timeout'));
            }, timeoutMs);

            try {
                const result = fn();

                // Handle Promises
                if (result && typeof result.then === 'function') {
                    (result as Promise<T>)
                        .then((resolvedValue) => {
                            clearTimeout(timeoutId);
                            resolve(resolvedValue);
                        })
                        .catch((error) => {
                            clearTimeout(timeoutId);
                            reject(error);
                        });
                } else {
                    clearTimeout(timeoutId);
                    resolve(result);
                }
            } catch (error) {
                clearTimeout(timeoutId);
                reject(error);
            }
        });
    }

    /**
     * Cleanup resources
     */
    cleanup(): void {
        // Clear all timeouts
        for (const timeout of this.timeoutMap.values()) {
            clearTimeout(timeout);
        }
        this.timeoutMap.clear();

        // Reset execution counts
        this.executionCount.clear();
    }

    /**
     * Get execution statistics
     */
    getStats(): { timeoutCount: number; executionCounts: Record<string, number> } {
        return {
            timeoutCount: this.timeoutMap.size,
            executionCounts: Object.fromEntries(this.executionCount)
        };
    }
}
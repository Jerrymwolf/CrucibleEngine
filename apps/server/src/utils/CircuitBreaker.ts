type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailure = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 30000; // 30 seconds

  async execute<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        console.warn('[CircuitBreaker] OPEN - returning fallback');
        return fallback;
      }
    }

    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout')), 10000);
        }),
      ]);
      if (timeoutId) clearTimeout(timeoutId);
      this.onSuccess();
      return result;
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      this.onFailure();
      console.error('[CircuitBreaker] Call failed:', error);
      return fallback;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.error(`[CircuitBreaker] OPENED after ${this.failures} failures`);
    }
  }

  isOpen(): boolean {
    return this.state === 'open';
  }
}

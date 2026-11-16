declare module "@gorules/zen-engine" {
  export interface ZenEvaluateOptions {
    trace?: boolean;
    maxDepth?: number;
  }

  export interface ZenEvaluateResponse<T = unknown> {
    performance: string;
    result: T;
    trace?: Record<string, unknown>;
  }

  export interface ZenDecision {
    evaluate(
      context: unknown,
      options?: ZenEvaluateOptions,
    ): Promise<ZenEvaluateResponse>;
    validate(): Promise<void>;
  }

  export interface ZenEngineOptions {
    loader?: (key: string) => Promise<Buffer | string>;
  }

  export class ZenEngine {
    constructor(options?: ZenEngineOptions);
    evaluate(
      key: string,
      context: unknown,
      options?: ZenEvaluateOptions,
    ): Promise<ZenEvaluateResponse>;
    createDecision(content: Buffer | string): Promise<ZenDecision>;
    getDecision(key: string): Promise<ZenDecision>;
    dispose(): Promise<void>;
  }
}

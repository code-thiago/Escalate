// apps/api/src/modules/quant/quant-worker-pool.ts
import { performance } from 'node:perf_hooks';

export type QuantTaskName = 'DCF' | 'MARKOWITZ' | 'BLACK_LITTERMAN';

export interface QuantTaskExecutionResult<TOutput> {
  taskName: string;
  durationMs: number;
  output: TOutput;
}

export async function runQuantTaskIsolated<TInput, TOutput>(
  taskName: QuantTaskName,
  payload: TInput,
  handler: (p: TInput) => TOutput
): Promise<QuantTaskExecutionResult<TOutput>> {
  const startMs = performance.now();

  const output = await new Promise<TOutput>((resolve, reject) => {
    setImmediate(() => {
      try {
        const result = handler(payload);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });

  const durationMs = Math.max(0, Number((performance.now() - startMs).toFixed(4)));

  return {
    taskName,
    durationMs,
    output,
  };
}

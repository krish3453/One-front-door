import type { AIMessage } from "@langchain/core/messages";

export type LLMUsage = {
  provider: string;
  model: string;
  operation: string;

  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  latencyMs: number;
};

type OperationMetrics = {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalLatencyMs: number;
};

type UsageMetrics = {
  totalCalls: number;

  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;

  totalLatencyMs: number;

  callsByProvider: Record<string, number>;
  callsByModel: Record<string, number>;
  callsByOperation: Record<string, number>;

  operations: Record<string, OperationMetrics>;
};

const metrics: UsageMetrics = {
  totalCalls: 0,

  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,

  totalLatencyMs: 0,

  callsByProvider: {},
  callsByModel: {},
  callsByOperation: {},

  operations: {},
};

function readNumber(value: unknown): number {
  return typeof value === "number"
    ? value
    : 0;
}

export function recordLLMUsage(
  usage: LLMUsage
): void {
  /*
   * Global metrics
   */
  metrics.totalCalls++;

  metrics.totalInputTokens +=
    usage.inputTokens;

  metrics.totalOutputTokens +=
    usage.outputTokens;

  metrics.totalTokens +=
    usage.totalTokens;

  metrics.totalLatencyMs +=
    usage.latencyMs;

  /*
   * Provider metrics
   */
  metrics.callsByProvider[
    usage.provider
  ] =
    (metrics.callsByProvider[
      usage.provider
    ] ?? 0) + 1;

  /*
   * Model metrics
   */
  metrics.callsByModel[
    usage.model
  ] =
    (metrics.callsByModel[
      usage.model
    ] ?? 0) + 1;

  /*
   * Operation call count
   */
  metrics.callsByOperation[
    usage.operation
  ] =
    (metrics.callsByOperation[
      usage.operation
    ] ?? 0) + 1;

  /*
   * Per-operation metrics
   */
  if (!metrics.operations[usage.operation]) {
    metrics.operations[usage.operation] = {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      totalLatencyMs: 0,
    };
  }

  const operation =
    metrics.operations[usage.operation];

  operation.calls++;

  operation.inputTokens +=
    usage.inputTokens;

  operation.outputTokens +=
    usage.outputTokens;

  operation.totalTokens +=
    usage.totalTokens;

  operation.totalLatencyMs +=
    usage.latencyMs;

  console.log(
    `[LLM] ${usage.provider}/${usage.model} | ` +
      `operation=${usage.operation} | ` +
      `input=${usage.inputTokens} | ` +
      `output=${usage.outputTokens} | ` +
      `total=${usage.totalTokens} | ` +
      `latency=${usage.latencyMs}ms`
  );
}

export function extractTokenUsage(
  response: AIMessage
): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} {
  /*
   * Most LangChain providers expose
   * usage through usage_metadata.
   */
  const usageMetadata =
    response.usage_metadata;

  if (usageMetadata) {
    const inputTokens =
      readNumber(
        usageMetadata.input_tokens
      );

    const outputTokens =
      readNumber(
        usageMetadata.output_tokens
      );

    const totalTokens =
      readNumber(
        usageMetadata.total_tokens
      ) ||
      inputTokens +
        outputTokens;

    return {
      inputTokens,
      outputTokens,
      totalTokens,
    };
  }

  /*
   * Fallback for providers that expose
   * usage through response_metadata.
   */
  const metadata =
    response.response_metadata as Record<
      string,
      unknown
    >;

  const usage =
    metadata?.usage as
      | Record<string, unknown>
      | undefined;

  const inputTokens =
    readNumber(
      usage?.prompt_tokens ??
        usage?.input_tokens
    );

  const outputTokens =
    readNumber(
      usage?.completion_tokens ??
        usage?.output_tokens
    );

  return {
    inputTokens,
    outputTokens,
    totalTokens:
      inputTokens +
      outputTokens,
  };
}

export function getLLMMetrics() {
  const averageLatencyMs =
    metrics.totalCalls > 0
      ? Math.round(
          metrics.totalLatencyMs /
            metrics.totalCalls
        )
      : 0;

  /*
   * Add calculated averages to every
   * operation.
   */
  const operations = Object.fromEntries(
    Object.entries(metrics.operations).map(
      ([name, operation]) => [
        name,
        {
          ...operation,

          averageLatencyMs:
            operation.calls > 0
              ? Math.round(
                  operation.totalLatencyMs /
                    operation.calls
                )
              : 0,
        },
      ]
    )
  );

  return {
    ...metrics,

    operations,

    averageLatencyMs,
  };
}
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

// Lazy-loaded pipeline — initialized once on first call, then reused.
let _pipeline: FeatureExtractionPipeline | null = null;

/**
 * Returns the feature-extraction pipeline, loading the model on first call.
 *
 * Model: onnx-community/all-MiniLM-L6-v2-ONNX
 * - 384-dimension sentence embeddings
 * - ONNX export, works with transformers.js v4 on Node via onnxruntime-node
 * - fp32 dtype for full-precision normalized vectors
 */
async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!_pipeline) {
    const { pipeline } = await import("@huggingface/transformers");
    _pipeline = (await pipeline(
      "feature-extraction",
      "onnx-community/all-MiniLM-L6-v2-ONNX",
      { dtype: "fp32" }
    )) as FeatureExtractionPipeline;
  }
  return _pipeline;
}

/**
 * Embeds a single string and returns a 384-dimension normalized float vector.
 *
 * Pooling strategy: mean — averages all token embeddings into one sentence vector.
 * Normalization: unit length (cosine similarity reduces to dot product after this).
 */
export async function embedText(text: string): Promise<number[]> {
  const pipe = await getPipeline();
  // Returns Tensor with dims [1, 384] when pooling is applied
  const result = await pipe(text, { pooling: "mean", normalize: true });
  // tolist() on [1, 384] tensor → [[...384 values...]]
  const nested = result.tolist() as number[][];
  return nested[0];
}

/**
 * Embeds multiple strings in a single forward pass.
 *
 * Batch input returns a Tensor with dims [batchSize, 384].
 * tolist() on that → [[...], [...], ...].
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const pipe = await getPipeline();
  const result = await pipe(texts, { pooling: "mean", normalize: true });
  return result.tolist() as number[][];
}

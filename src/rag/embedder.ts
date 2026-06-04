import { config } from "../config/index.js";
import { logger } from "../infrastructure/logger.js";

// OpenRouter supports OpenAI-compatible embeddings endpoint
const EMBEDDING_URL = "https://openrouter.ai/api/v1/embeddings";
const EMBEDDING_MODEL = "openai/text-embedding-3-small";

export async function embedText(text: string): Promise<number[]> {
  try {
    const response = await fetch(EMBEDDING_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openrouter.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://gold-market-ai.local",
        "X-Title": "Gold Market Expert AI",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Embedding API error: ${response.status} - ${body}`);
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return data.data[0].embedding;
  } catch (err) {
    logger.warn("Embedding failed, returning zero vector", { err });
    return new Array(1536).fill(0);
  }
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map(embedText));
}

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(" ");
    if (chunk.trim()) chunks.push(chunk.trim());
    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}

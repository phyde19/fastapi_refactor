import type { ApiStreamFrame } from "@/schemas/api/stream";

interface ParseOptions {
  onFrame: (frame: ApiStreamFrame) => void;
  signal?: AbortSignal;
}

function decodeFrame(line: string): ApiStreamFrame | null {
  try {
    const payload = JSON.parse(line) as Record<string, unknown>;
    const type = payload.type;
    if (type !== "llm" && type !== "citation" && type !== "error") {
      return null;
    }
    return payload as ApiStreamFrame;
  } catch {
    return null;
  }
}

export async function parseNdjsonStream(response: Response, options: ParseOptions): Promise<void> {
  if (!response.body) {
    throw new Error("Response body is missing");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    if (options.signal?.aborted) {
      await reader.cancel();
      throw new DOMException("Stream parsing aborted", "AbortError");
    }

    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const frame = decodeFrame(trimmed);
      if (frame) {
        options.onFrame(frame);
      }
    }
  }

  if (buffer.trim()) {
    const frame = decodeFrame(buffer.trim());
    if (frame) {
      options.onFrame(frame);
    }
  }
}

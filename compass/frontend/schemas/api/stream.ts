export interface ApiLlmFrame {
  type: "llm";
  content: string;
}

export interface ApiCitationFrame {
  type: "citation";
  content: Record<string, unknown>;
}

export interface ApiErrorFrame {
  type: "error";
  content: {
    code: string;
    message: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
  };
}

export type ApiStreamFrame = ApiLlmFrame | ApiCitationFrame | ApiErrorFrame;

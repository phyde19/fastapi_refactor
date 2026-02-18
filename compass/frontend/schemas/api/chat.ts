export interface ApiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ApiUserInputValue {
  name: string;
  value: unknown;
}

export interface ApiChatCompletionRequest {
  workspace: string;
  plugin: string;
  conversation: ApiChatMessage[];
  user_inputs: ApiUserInputValue[];
}

export interface ApiConversationSnapshot {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    citations?: Array<Record<string, unknown>>;
    error_payload?: {
      code: string;
      message: string;
      retryable?: boolean;
      details?: Record<string, unknown>;
    };
  }>;
}

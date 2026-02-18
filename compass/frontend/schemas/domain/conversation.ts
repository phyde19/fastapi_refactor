export type ChatRole = "user" | "assistant" | "system";

export interface CitationModel {
  source?: string;
  chunk_text?: string;
  similarity?: number;
  [key: string]: unknown;
}

export interface UserMessageModel {
  role: "user";
  content: string;
}

export interface AssistantMessageModel {
  role: "assistant";
  content: string;
  citations?: CitationModel[];
  error?: {
    code: string;
    message: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
  };
}

export interface SystemMessageModel {
  role: "system";
  content: string;
}

export type ConversationMessageModel =
  | UserMessageModel
  | AssistantMessageModel
  | SystemMessageModel;

export interface ConversationModel {
  id: string | null;
  title: string;
  workspaceId: string | null;
  pluginId: string | null;
  messages: ConversationMessageModel[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationHistoryItemModel {
  id: string;
  title: string;
  updatedAt: string;
}

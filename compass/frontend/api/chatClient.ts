import { ApiClient } from "@/api/client";
import type { ApiChatCompletionRequest, ApiConversationSnapshot } from "@/schemas/api/chat";
import type { ConversationMessageModel, ConversationModel } from "@/schemas/domain/conversation";

function mapSnapshotMessage(
  message: ApiConversationSnapshot["messages"][number]
): ConversationMessageModel {
  if (message.role === "assistant") {
    return {
      role: "assistant",
      content: message.content,
      citations: message.citations ?? [],
      error: message.error_payload
        ? {
            code: message.error_payload.code,
            message: message.error_payload.message,
            retryable: message.error_payload.retryable,
            details: message.error_payload.details
          }
        : undefined
    };
  }
  if (message.role === "system") {
    return {
      role: "system",
      content: message.content
    };
  }
  return {
    role: "user",
    content: message.content
  };
}

export interface StreamStartResult {
  response: Response;
  conversationId: string | null;
}

export async function startNewConversationStream(
  payload: ApiChatCompletionRequest,
  signal?: AbortSignal
): Promise<StreamStartResult> {
  const response = await ApiClient.postStream("/chats/new/stream", payload, signal);
  return {
    response,
    conversationId: response.headers.get("X-Conversation-Id")
  };
}

export async function startExistingConversationStream(
  conversationId: string,
  payload: ApiChatCompletionRequest,
  signal?: AbortSignal
): Promise<StreamStartResult> {
  const response = await ApiClient.postStream(`/chats/${conversationId}/stream`, payload, signal);
  return {
    response,
    conversationId
  };
}

export async function fetchConversationSnapshot(conversationId: string): Promise<ConversationModel> {
  const payload = await ApiClient.getJson<ApiConversationSnapshot>(`/chats/${conversationId}`);
  return {
    id: payload.id,
    title: payload.title,
    workspaceId: null,
    pluginId: null,
    messages: payload.messages.map(mapSnapshotMessage),
    createdAt: payload.created_at,
    updatedAt: payload.updated_at
  };
}

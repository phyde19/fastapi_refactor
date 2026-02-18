import type { CompassStore } from "@/store/types";

export function selectConversationMessages(state: CompassStore) {
  return state.activeConversation.messages;
}

export function selectLastAssistantMessage(state: CompassStore) {
  const messages = state.activeConversation.messages;
  const last = messages[messages.length - 1];
  return last?.role === "assistant" ? last : null;
}

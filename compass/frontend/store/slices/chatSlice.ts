import type { StateCreator } from "zustand";
import type { ConversationModel, CitationModel } from "@/schemas/domain/conversation";
import type { AssistantMessage, ChatSlice, CompassStore } from "@/store/types";

function nowIso() {
  return new Date().toISOString();
}

function createEmptyConversation(): ConversationModel {
  const timestamp = nowIso();
  return {
    id: null,
    title: "New conversation",
    workspaceId: null,
    pluginId: null,
    messages: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function asAssistantMessage(message: ConversationModel["messages"][number] | undefined): AssistantMessage | null {
  if (!message || message.role !== "assistant") {
    return null;
  }
  return message;
}

function withUpdatedTimestamp(conversation: ConversationModel): ConversationModel {
  return {
    ...conversation,
    updatedAt: nowIso()
  };
}

export const createChatSlice: StateCreator<CompassStore, [], [], ChatSlice> = (set, get) => ({
  activeConversation: createEmptyConversation(),
  conversationHistory: [],
  chatLoading: false,
  chatStreaming: false,
  streamError: null,
  activeAbortController: null,
  resetConversation: () =>
    set((state) => {
      const previous = state.activeConversation;
      return {
        activeConversation: {
          ...createEmptyConversation(),
          workspaceId: previous.workspaceId,
          pluginId: previous.pluginId
        },
        streamError: null,
        chatLoading: false,
        chatStreaming: false,
        activeAbortController: null
      };
    }),
  loadConversation: (conversation) =>
    set({
      activeConversation: conversation,
      streamError: null
    }),
  setConversationId: (conversationId) =>
    set((state) => ({
      activeConversation: withUpdatedTimestamp({
        ...state.activeConversation,
        id: conversationId
      })
    })),
  setConversationContext: (workspaceId, pluginId) =>
    set((state) => ({
      activeConversation: withUpdatedTimestamp({
        ...state.activeConversation,
        workspaceId,
        pluginId
      })
    })),
  appendUserMessage: (content) =>
    set((state) => {
      const conversation = state.activeConversation;
      return {
        activeConversation: withUpdatedTimestamp({
          ...conversation,
          messages: [...conversation.messages, { role: "user", content }],
          title: conversation.messages.length === 0 ? content.slice(0, 56) || "New conversation" : conversation.title
        })
      };
    }),
  ensureAssistantDraft: () =>
    set((state) => {
      const conversation = state.activeConversation;
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage?.role === "assistant") {
        return {};
      }
      return {
        activeConversation: withUpdatedTimestamp({
          ...conversation,
          messages: [...conversation.messages, { role: "assistant", content: "", citations: [] }]
        })
      };
    }),
  appendAssistantChunk: (chunk) =>
    set((state) => {
      const conversation = state.activeConversation;
      const nextMessages = [...conversation.messages];
      const lastIndex = nextMessages.length - 1;
      const existingAssistant = asAssistantMessage(nextMessages[lastIndex]);
      if (!existingAssistant) {
        nextMessages.push({ role: "assistant", content: chunk, citations: [] });
      } else {
        nextMessages[lastIndex] = {
          ...existingAssistant,
          content: `${existingAssistant.content}${chunk}`
        };
      }
      return {
        activeConversation: withUpdatedTimestamp({
          ...conversation,
          messages: nextMessages
        })
      };
    }),
  appendAssistantCitation: (citation: CitationModel) =>
    set((state) => {
      const conversation = state.activeConversation;
      const nextMessages = [...conversation.messages];
      const lastIndex = nextMessages.length - 1;
      const existingAssistant = asAssistantMessage(nextMessages[lastIndex]);
      if (!existingAssistant) {
        nextMessages.push({ role: "assistant", content: "", citations: [citation] });
      } else {
        nextMessages[lastIndex] = {
          ...existingAssistant,
          citations: [...(existingAssistant.citations ?? []), citation]
        };
      }
      return {
        activeConversation: withUpdatedTimestamp({
          ...conversation,
          messages: nextMessages
        })
      };
    }),
  setAssistantError: (error) =>
    set((state) => {
      const conversation = state.activeConversation;
      const nextMessages = [...conversation.messages];
      const lastIndex = nextMessages.length - 1;
      const existingAssistant = asAssistantMessage(nextMessages[lastIndex]);
      if (!existingAssistant) {
        nextMessages.push({
          role: "assistant",
          content: error.message,
          citations: [],
          error
        });
      } else {
        nextMessages[lastIndex] = {
          ...existingAssistant,
          error,
          content: existingAssistant.content || error.message
        };
      }
      return {
        activeConversation: withUpdatedTimestamp({
          ...conversation,
          messages: nextMessages
        }),
        streamError: error
      };
    }),
  setChatLoading: (value) => set({ chatLoading: value }),
  setChatStreaming: (value) => set({ chatStreaming: value }),
  setStreamError: (value) => set({ streamError: value }),
  registerAbortController: (controller) => set({ activeAbortController: controller }),
  abortActiveStream: () => {
    const active = get().activeAbortController;
    if (active) {
      active.abort();
    }
    set({
      activeAbortController: null,
      chatStreaming: false,
      chatLoading: false
    });
  },
  addOrUpdateConversationHistory: (item) =>
    set((state) => {
      const existing = state.conversationHistory.filter((entry) => entry.id !== item.id);
      return {
        conversationHistory: [item, ...existing]
      };
    })
});

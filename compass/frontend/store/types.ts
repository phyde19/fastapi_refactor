import type { InputValue, PluginInputField } from "@/schemas/domain/input";
import type {
  ConversationHistoryItemModel,
  ConversationMessageModel,
  ConversationModel,
  CitationModel
} from "@/schemas/domain/conversation";
import type {
  PluginAdminRecordModel,
  WorkspaceAdminGroupModel,
  WorkspaceMenuGroupModel
} from "@/schemas/domain/plugin";

export interface PluginSlice {
  workspaceGroups: WorkspaceMenuGroupModel[];
  pluginMenuLoading: boolean;
  pluginMenuError: string | null;
  activeWorkspaceId: string | null;
  activePluginId: string | null;
  setWorkspaceGroups: (groups: WorkspaceMenuGroupModel[]) => void;
  setPluginMenuLoading: (value: boolean) => void;
  setPluginMenuError: (value: string | null) => void;
  setActiveWorkspace: (workspaceId: string) => void;
  setActivePlugin: (workspaceId: string, pluginId: string) => void;
}

export interface InputSlice {
  inputValuesByPluginKey: Record<string, Record<string, InputValue>>;
  inputErrorsByPluginKey: Record<string, Record<string, string>>;
  hydrateInputDefaults: (pluginStateKey: string, schema: PluginInputField[]) => void;
  setInputValue: (pluginStateKey: string, inputName: string, value: InputValue) => void;
  clearInputErrors: (pluginStateKey: string) => void;
  validatePluginInputs: (pluginStateKey: string, schema: PluginInputField[]) => boolean;
  serializePluginInputs: (
    pluginStateKey: string,
    schema: PluginInputField[]
  ) => Array<{ name: string; value: unknown }>;
  resetPluginInputs: (pluginStateKey: string) => void;
}

export interface ChatSlice {
  activeConversation: ConversationModel;
  conversationHistory: ConversationHistoryItemModel[];
  chatLoading: boolean;
  chatStreaming: boolean;
  streamError: { code: string; message: string; retryable?: boolean } | null;
  activeAbortController: AbortController | null;
  resetConversation: () => void;
  loadConversation: (conversation: ConversationModel) => void;
  setConversationId: (conversationId: string | null) => void;
  setConversationContext: (workspaceId: string, pluginId: string) => void;
  appendUserMessage: (content: string) => void;
  ensureAssistantDraft: () => void;
  appendAssistantChunk: (chunk: string) => void;
  appendAssistantCitation: (citation: CitationModel) => void;
  setAssistantError: (error: { code: string; message: string; retryable?: boolean }) => void;
  setChatLoading: (value: boolean) => void;
  setChatStreaming: (value: boolean) => void;
  setStreamError: (value: { code: string; message: string; retryable?: boolean } | null) => void;
  registerAbortController: (controller: AbortController | null) => void;
  abortActiveStream: () => void;
  addOrUpdateConversationHistory: (item: ConversationHistoryItemModel) => void;
}

export interface AdminSlice {
  adminWorkspaceGroups: WorkspaceAdminGroupModel[];
  activeAdminPlugin: PluginAdminRecordModel | null;
  adminLoading: boolean;
  adminError: string | null;
  setAdminWorkspaceGroups: (groups: WorkspaceAdminGroupModel[]) => void;
  setActiveAdminPlugin: (plugin: PluginAdminRecordModel | null) => void;
  setAdminLoading: (value: boolean) => void;
  setAdminError: (value: string | null) => void;
  replaceAdminPlugin: (plugin: PluginAdminRecordModel) => void;
}

export interface UiSlice {
  rightPanelMode: "inputs" | "citations" | "none";
  selectedCitation: CitationModel | null;
  setRightPanelMode: (mode: "inputs" | "citations" | "none") => void;
  setSelectedCitation: (citation: CitationModel | null) => void;
}

export type CompassStore = PluginSlice & InputSlice & ChatSlice & AdminSlice & UiSlice;

export type AssistantMessage = Extract<ConversationMessageModel, { role: "assistant" }>;

"use client";

import { useCallback } from "react";
import {
  fetchConversationSnapshot,
  startExistingConversationStream,
  startNewConversationStream
} from "@/api/chatClient";
import { parseNdjsonStream } from "@/api/parsers/ndjsonStreamParser";
import { useCompassStore } from "@/store";
import { selectActivePlugin, selectActivePluginStateKey, selectActiveWorkspace } from "@/store/selectors/pluginSelectors";
import { titleFromPrompt } from "@/lib/utils";

function toApiConversation(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content
  }));
}

export function useChatStream() {
  const activeWorkspace = useCompassStore(selectActiveWorkspace);
  const activePlugin = useCompassStore(selectActivePlugin);
  const activePluginStateKey = useCompassStore(selectActivePluginStateKey);

  const activeConversation = useCompassStore((state) => state.activeConversation);
  const chatLoading = useCompassStore((state) => state.chatLoading);
  const chatStreaming = useCompassStore((state) => state.chatStreaming);
  const streamError = useCompassStore((state) => state.streamError);

  const appendUserMessage = useCompassStore((state) => state.appendUserMessage);
  const ensureAssistantDraft = useCompassStore((state) => state.ensureAssistantDraft);
  const appendAssistantChunk = useCompassStore((state) => state.appendAssistantChunk);
  const appendAssistantCitation = useCompassStore((state) => state.appendAssistantCitation);
  const setAssistantError = useCompassStore((state) => state.setAssistantError);
  const setChatLoading = useCompassStore((state) => state.setChatLoading);
  const setChatStreaming = useCompassStore((state) => state.setChatStreaming);
  const setStreamError = useCompassStore((state) => state.setStreamError);
  const setConversationId = useCompassStore((state) => state.setConversationId);
  const registerAbortController = useCompassStore((state) => state.registerAbortController);
  const abortActiveStream = useCompassStore((state) => state.abortActiveStream);
  const validatePluginInputs = useCompassStore((state) => state.validatePluginInputs);
  const serializePluginInputs = useCompassStore((state) => state.serializePluginInputs);
  const addOrUpdateConversationHistory = useCompassStore((state) => state.addOrUpdateConversationHistory);
  const loadConversation = useCompassStore((state) => state.loadConversation);

  const sendMessage = useCallback(
    async (prompt: string) => {
      const trimmedPrompt = prompt.trim();
      if (!trimmedPrompt || !activeWorkspace || !activePlugin) {
        return;
      }

      if (activePluginStateKey) {
        const isValid = validatePluginInputs(activePluginStateKey, activePlugin.userInputs);
        if (!isValid) {
          return;
        }
      }

      const previousConversationMessages = useCompassStore
        .getState()
        .activeConversation.messages.map((message) => ({
          role: message.role,
          content: message.content
        }));

      appendUserMessage(trimmedPrompt);
      ensureAssistantDraft();
      setChatLoading(true);
      setChatStreaming(true);
      setStreamError(null);

      const inputValues =
        activePluginStateKey !== null
          ? serializePluginInputs(activePluginStateKey, activePlugin.userInputs)
          : [];

      const payload = {
        workspace: activeWorkspace.id,
        plugin: activePlugin.id,
        conversation: toApiConversation([
          ...previousConversationMessages,
          { role: "user" as const, content: trimmedPrompt }
        ]),
        user_inputs: inputValues
      };

      const abortController = new AbortController();
      registerAbortController(abortController);

      try {
        const currentConversationId = useCompassStore.getState().activeConversation.id;
        const stream = currentConversationId
          ? await startExistingConversationStream(currentConversationId, payload, abortController.signal)
          : await startNewConversationStream(payload, abortController.signal);

        if (stream.conversationId) {
          setConversationId(stream.conversationId);
          addOrUpdateConversationHistory({
            id: stream.conversationId,
            title: titleFromPrompt(trimmedPrompt),
            updatedAt: new Date().toISOString()
          });
        }

        await parseNdjsonStream(stream.response, {
          signal: abortController.signal,
          onFrame: (frame) => {
            if (frame.type === "llm") {
              appendAssistantChunk(frame.content);
              return;
            }
            if (frame.type === "citation") {
              appendAssistantCitation(frame.content);
              return;
            }
            if (frame.type === "error") {
              const normalized = {
                code: frame.content.code,
                message: frame.content.message,
                retryable: frame.content.retryable
              };
              setAssistantError(normalized);
              setStreamError(normalized);
            }
          }
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        const fallback = {
          code: "STREAM_ERROR",
          message: error instanceof Error ? error.message : "Failed to stream response",
          retryable: true
        };
        setAssistantError(fallback);
        setStreamError(fallback);
      } finally {
        setChatLoading(false);
        setChatStreaming(false);
        registerAbortController(null);
      }
    },
    [
      activePlugin,
      activePluginStateKey,
      activeWorkspace,
      addOrUpdateConversationHistory,
      appendAssistantChunk,
      appendAssistantCitation,
      appendUserMessage,
      ensureAssistantDraft,
      registerAbortController,
      serializePluginInputs,
      setAssistantError,
      setChatLoading,
      setChatStreaming,
      setConversationId,
      setStreamError,
      validatePluginInputs
    ]
  );

  const loadConversationById = useCallback(
    async (conversationId: string) => {
      setChatLoading(true);
      setStreamError(null);
      try {
        const snapshot = await fetchConversationSnapshot(conversationId);
        loadConversation(snapshot);
      } catch (error) {
        setStreamError({
          code: "CONVERSATION_LOAD_ERROR",
          message: error instanceof Error ? error.message : "Failed to load conversation"
        });
      } finally {
        setChatLoading(false);
      }
    },
    [loadConversation, setChatLoading, setStreamError]
  );

  return {
    activeConversation,
    chatLoading,
    chatStreaming,
    streamError,
    sendMessage,
    stopStreaming: abortActiveStream,
    loadConversationById
  };
}

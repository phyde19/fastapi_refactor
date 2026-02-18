"use client";

import { useEffect, useMemo, useRef } from "react";
import { AlertTriangle, FileText } from "lucide-react";
import { useCompassStore } from "@/store";
import type { CitationModel } from "@/schemas/domain/conversation";

function CitationList({
  citations,
  onSelect
}: {
  citations: CitationModel[];
  onSelect: (citation: CitationModel) => void;
}) {
  if (!citations.length) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {citations.map((citation, index) => {
        const label = typeof citation.source === "string" ? citation.source : `Source ${index + 1}`;
        return (
          <button
            type="button"
            key={`${label}-${index}`}
            onClick={() => onSelect(citation)}
            className="text-xs rounded border border-border bg-muted/30 hover:bg-muted/60 px-2 py-1 inline-flex items-center gap-1"
          >
            <FileText size={12} className="text-compass-blue" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function ChatMessages() {
  const messages = useCompassStore((state) => state.activeConversation.messages);
  const chatLoading = useCompassStore((state) => state.chatLoading);
  const chatStreaming = useCompassStore((state) => state.chatStreaming);
  const setSelectedCitation = useCompassStore((state) => state.setSelectedCitation);
  const setRightPanelMode = useCompassStore((state) => state.setRightPanelMode);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, chatLoading, chatStreaming]);

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  if (!hasMessages) {
    return (
      <div className="h-full panel p-8 flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-semibold mb-2">Where would you like to go?</h2>
        <p className="text-sm text-muted-foreground max-w-xl">
          Pick a workspace plugin from the left, set input values on the right, and send your first message.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full panel p-4 overflow-y-auto">
      <div className="space-y-6">
        {messages.map((message, index) =>
          message.role === "user" ? (
            <div key={index} className="flex justify-end">
              <div className="max-w-[80%] bg-secondary/80 text-secondary-foreground rounded-2xl px-4 py-2.5 text-sm">
                {message.content}
              </div>
            </div>
          ) : (
            <div key={index} className="flex justify-start">
              <div className="max-w-[92%]">
                <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content || (chatStreaming ? "..." : "")}
                </div>

                {message.error ? (
                  <div className="mt-2 text-xs text-red-600 bg-red-500/10 border border-red-500/20 rounded-md px-2 py-1 inline-flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {message.error.message}
                  </div>
                ) : null}

                <CitationList
                  citations={message.citations ?? []}
                  onSelect={(citation) => {
                    setSelectedCitation(citation);
                    setRightPanelMode("citations");
                  }}
                />
              </div>
            </div>
          )
        )}

        {(chatLoading || chatStreaming) && (
          <div className="text-xs text-muted-foreground">Generating response...</div>
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}

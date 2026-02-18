"use client";

import { useMemo, useState } from "react";
import { Send, Square } from "lucide-react";
import { useChatStream } from "@/hooks/useChatStream";
import { useCompassStore } from "@/store";
import { selectActivePlugin, selectActiveWorkspace } from "@/store/selectors/pluginSelectors";
import { cn } from "@/lib/utils";

const STARTER_PROMPTS = [
  "Give me a 5-step plan to onboard a new analyst.",
  "Summarize the key policy changes in plain language.",
  "Create a checklist for preparing for a stakeholder meeting."
];

export function ChatInput() {
  const [prompt, setPrompt] = useState("");
  const workspace = useCompassStore(selectActiveWorkspace);
  const plugin = useCompassStore(selectActivePlugin);
  const { sendMessage, stopStreaming, chatStreaming, chatLoading } = useChatStream();

  const canSubmit = useMemo(
    () => !!workspace && !!plugin && !!prompt.trim() && !chatStreaming,
    [workspace, plugin, prompt, chatStreaming]
  );

  return (
    <div className="space-y-3">
      <div className="panel p-3">
        <textarea
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={
            workspace && plugin
              ? `Message ${workspace.name} / ${plugin.name}`
              : "Select a workspace plugin to begin"
          }
          className="w-full bg-transparent outline-none resize-none text-sm"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSubmit) {
                void sendMessage(prompt).then(() => setPrompt(""));
              }
            }
          }}
        />

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            Enter sends message, Shift+Enter creates newline.
          </p>
          {chatStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted/40"
            >
              <Square size={12} />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!canSubmit) {
                  return;
                }
                void sendMessage(prompt).then(() => setPrompt(""));
              }}
              disabled={!canSubmit}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-white",
                canSubmit ? "bg-compass-blue hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Send size={12} />
              Send
            </button>
          )}
        </div>
      </div>

      {!chatLoading && !chatStreaming && (
        <div className="flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((example) => (
            <button
              key={example}
              type="button"
              className="text-xs rounded-md border border-border px-2 py-1 hover:bg-muted/40"
              onClick={() => setPrompt(example)}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

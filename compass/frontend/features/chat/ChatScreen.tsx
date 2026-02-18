"use client";

import { useCompassStore } from "@/store";
import { ChatHeader } from "@/features/chat/ChatHeader";
import { ChatMessages } from "@/features/chat/ChatMessages";
import { ChatInput } from "@/features/chat/ChatInput";
import { PluginInputsPanel } from "@/features/pluginInputs/PluginInputsPanel";
import { CitationPanel } from "@/features/chat/CitationPanel";

export function ChatScreen() {
  const rightPanelMode = useCompassStore((state) => state.rightPanelMode);
  const streamError = useCompassStore((state) => state.streamError);

  return (
    <div className="w-full h-screen p-4 grid grid-cols-[minmax(0,1fr)_20rem] gap-4">
      <div className="min-w-0 grid grid-rows-[auto_minmax(0,1fr)_auto] gap-3">
        <ChatHeader />

        <ChatMessages />

        <div className="space-y-2">
          {streamError ? (
            <div className="text-xs rounded-md px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-600">
              {streamError.message}
            </div>
          ) : null}
          <ChatInput />
        </div>
      </div>

      <div className="min-h-0">
        {rightPanelMode === "citations" ? <CitationPanel /> : <PluginInputsPanel />}
      </div>
    </div>
  );
}

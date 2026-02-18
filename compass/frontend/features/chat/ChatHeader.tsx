"use client";

import { MessageSquare, SlidersHorizontal, BookOpenText } from "lucide-react";
import { useCompassStore } from "@/store";
import { selectActivePlugin, selectActiveWorkspace } from "@/store/selectors/pluginSelectors";
import { cn } from "@/lib/utils";

export function ChatHeader() {
  const workspace = useCompassStore(selectActiveWorkspace);
  const plugin = useCompassStore(selectActivePlugin);
  const rightPanelMode = useCompassStore((state) => state.rightPanelMode);
  const setRightPanelMode = useCompassStore((state) => state.setRightPanelMode);

  return (
    <header className="panel px-4 py-3 flex items-center justify-between">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">Current plugin</div>
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare size={15} className="text-compass-blue shrink-0" />
          <h1 className="font-semibold truncate">
            {workspace?.name ?? "Workspace"} / {plugin?.name ?? "Plugin"}
          </h1>
        </div>
        <p className="text-xs text-muted-foreground truncate">{plugin?.description || "No description"}</p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setRightPanelMode("inputs")}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs border flex items-center gap-1",
            rightPanelMode === "inputs" ? "border-compass-blue bg-compass-blue/10" : "border-border hover:bg-muted/40"
          )}
        >
          <SlidersHorizontal size={13} />
          Inputs
        </button>
        <button
          type="button"
          onClick={() => setRightPanelMode("citations")}
          className={cn(
            "rounded-md px-2.5 py-1.5 text-xs border flex items-center gap-1",
            rightPanelMode === "citations"
              ? "border-compass-blue bg-compass-blue/10"
              : "border-border hover:bg-muted/40"
          )}
        >
          <BookOpenText size={13} />
          Citation
        </button>
      </div>
    </header>
  );
}

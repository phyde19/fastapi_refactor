"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Puzzle, Settings2, MessageSquare, Loader2 } from "lucide-react";
import { usePluginMenu } from "@/hooks/usePluginMenu";
import { useCompassStore } from "@/store";
import { cn } from "@/lib/utils";

export function WorkspacePluginMenu() {
  const router = useRouter();
  const {
    workspaceGroups,
    activeWorkspaceId,
    activePluginId,
    pluginMenuLoading,
    pluginMenuError,
    choosePlugin
  } = usePluginMenu();
  const history = useCompassStore((state) => state.conversationHistory);

  return (
    <aside className="w-[18rem] h-screen shrink-0 bg-[hsl(var(--sidebar-background))] border-r border-border/60 px-3 py-4 flex flex-col gap-4">
      <div className="flex items-center gap-2 px-2">
        <Compass size={20} className="text-compass-blue" />
        <span className="font-semibold">Compass</span>
      </div>

      <div className="flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-background/60"
        >
          <MessageSquare size={15} />
          New Chat
        </Link>
        <Link
          href="/plugins"
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-background/60"
        >
          <Settings2 size={15} />
          Admin Dashboard
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="section-title px-2 mb-2">Workspaces</div>

        {pluginMenuLoading && (
          <div className="px-2 py-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" />
            Loading plugin menu...
          </div>
        )}

        {pluginMenuError && (
          <div className="px-2 py-2 text-xs text-red-500 bg-red-500/10 rounded-md">{pluginMenuError}</div>
        )}

        {!pluginMenuLoading &&
          workspaceGroups.map((workspace) => (
            <div key={workspace.id} className="mb-3">
              <div className="px-2 py-1 text-xs text-muted-foreground">
                {workspace.name}
              </div>
              <div className="space-y-1">
                {workspace.plugins.map((plugin) => {
                  const isActive =
                    workspace.id === activeWorkspaceId && plugin.id === activePluginId;
                  return (
                    <button
                      key={`${workspace.id}-${plugin.id}`}
                      type="button"
                      onClick={() => {
                        choosePlugin(workspace.id, plugin.id);
                        router.push("/");
                      }}
                      className={cn(
                        "w-full text-left rounded-md px-2 py-2 border transition-colors",
                        isActive
                          ? "border-compass-blue bg-compass-blue/10"
                          : "border-transparent hover:border-border hover:bg-background/60"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <Puzzle size={14} className="mt-0.5 text-compass-blue" />
                        <div className="min-w-0">
                          <div className="text-sm truncate">{plugin.name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {plugin.description || "No description"}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

        {!!history.length && (
          <>
            <div className="section-title px-2 mt-6 mb-2">Recent Chats</div>
            <div className="space-y-1">
              {history.slice(0, 15).map((item) => (
                <Link
                  key={item.id}
                  href={`/chat/${item.id}`}
                  className="block rounded-md px-2 py-2 text-sm hover:bg-background/60"
                >
                  <div className="truncate">{item.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{item.updatedAt}</div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

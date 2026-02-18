"use client";

import { useEffect } from "react";
import { WorkspacePluginMenu } from "@/features/pluginMenu/WorkspacePluginMenu";
import { usePluginMenu } from "@/hooks/usePluginMenu";

export default function ChatLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { loadMenu } = usePluginMenu();

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  return (
    <div className="h-screen w-full flex overflow-hidden">
      <WorkspacePluginMenu />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

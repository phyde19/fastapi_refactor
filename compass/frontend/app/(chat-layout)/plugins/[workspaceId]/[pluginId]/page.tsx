"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAdminPlugins } from "@/hooks/useAdminPlugins";
import { PluginDetailView } from "@/features/admin/PluginDetailView";

export default function PluginDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const pluginId = params.pluginId as string;
  const { activePlugin, loading, error, openPlugin, savePlugin } = useAdminPlugins();

  useEffect(() => {
    if (!workspaceId || !pluginId) {
      return;
    }
    void openPlugin(workspaceId, pluginId);
  }, [openPlugin, pluginId, workspaceId]);

  return (
    <div className="h-screen w-full overflow-y-auto p-4">
      <PluginDetailView
        plugin={activePlugin}
        loading={loading}
        error={error}
        onSave={(input) => savePlugin(workspaceId, pluginId, input)}
      />
    </div>
  );
}

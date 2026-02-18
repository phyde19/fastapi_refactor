import type { CompassStore } from "@/store/types";
import { pluginKey } from "@/lib/utils";

export function selectActiveWorkspace(state: CompassStore) {
  return state.workspaceGroups.find((group) => group.id === state.activeWorkspaceId) ?? null;
}

export function selectActivePlugin(state: CompassStore) {
  const workspace = selectActiveWorkspace(state);
  if (!workspace) {
    return null;
  }
  return workspace.plugins.find((plugin) => plugin.id === state.activePluginId) ?? null;
}

export function selectActivePluginStateKey(state: CompassStore): string | null {
  if (!state.activeWorkspaceId || !state.activePluginId) {
    return null;
  }
  return pluginKey(state.activeWorkspaceId, state.activePluginId);
}

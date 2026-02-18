"use client";

import { useCallback } from "react";
import { fetchPluginMenu } from "@/api/pluginsClient";
import { useCompassStore } from "@/store";
import { selectActivePlugin } from "@/store/selectors/pluginSelectors";
import { pluginKey } from "@/lib/utils";

export function usePluginMenu() {
  const workspaceGroups = useCompassStore((state) => state.workspaceGroups);
  const activeWorkspaceId = useCompassStore((state) => state.activeWorkspaceId);
  const activePluginId = useCompassStore((state) => state.activePluginId);
  const pluginMenuLoading = useCompassStore((state) => state.pluginMenuLoading);
  const pluginMenuError = useCompassStore((state) => state.pluginMenuError);
  const setWorkspaceGroups = useCompassStore((state) => state.setWorkspaceGroups);
  const setPluginMenuLoading = useCompassStore((state) => state.setPluginMenuLoading);
  const setPluginMenuError = useCompassStore((state) => state.setPluginMenuError);
  const setActivePlugin = useCompassStore((state) => state.setActivePlugin);
  const hydrateInputDefaults = useCompassStore((state) => state.hydrateInputDefaults);
  const setConversationContext = useCompassStore((state) => state.setConversationContext);
  const resetConversation = useCompassStore((state) => state.resetConversation);
  const setRightPanelMode = useCompassStore((state) => state.setRightPanelMode);

  const loadMenu = useCallback(async () => {
    setPluginMenuLoading(true);
    setPluginMenuError(null);
    try {
      const groups = await fetchPluginMenu();
      setWorkspaceGroups(groups);

      const state = useCompassStore.getState();
      const activePlugin = selectActivePlugin(state);
      if (state.activeWorkspaceId && activePlugin) {
        const stateKey = pluginKey(state.activeWorkspaceId, activePlugin.id);
        hydrateInputDefaults(stateKey, activePlugin.userInputs);
        setConversationContext(state.activeWorkspaceId, activePlugin.id);
      }
    } catch (error) {
      setPluginMenuError(error instanceof Error ? error.message : "Failed to load plugin menu");
    } finally {
      setPluginMenuLoading(false);
    }
  }, [
    hydrateInputDefaults,
    setConversationContext,
    setPluginMenuError,
    setPluginMenuLoading,
    setWorkspaceGroups
  ]);

  const choosePlugin = useCallback(
    (workspaceId: string, pluginId: string) => {
      setActivePlugin(workspaceId, pluginId);
      const state = useCompassStore.getState();
      const workspace = state.workspaceGroups.find((group) => group.id === workspaceId);
      const plugin = workspace?.plugins.find((entry) => entry.id === pluginId);
      if (!plugin) {
        return;
      }
      const stateKey = pluginKey(workspaceId, pluginId);
      hydrateInputDefaults(stateKey, plugin.userInputs);
      setConversationContext(workspaceId, pluginId);
      resetConversation();
      setRightPanelMode("inputs");
    },
    [hydrateInputDefaults, resetConversation, setActivePlugin, setConversationContext, setRightPanelMode]
  );

  return {
    workspaceGroups,
    activeWorkspaceId,
    activePluginId,
    pluginMenuLoading,
    pluginMenuError,
    loadMenu,
    choosePlugin
  };
}

import type { CompassStore } from "@/store/types";
import { selectActivePluginStateKey, selectActivePlugin } from "@/store/selectors/pluginSelectors";

export function selectActiveInputValues(state: CompassStore) {
  const activeKey = selectActivePluginStateKey(state);
  if (!activeKey) {
    return {};
  }
  return state.inputValuesByPluginKey[activeKey] ?? {};
}

export function selectActiveInputErrors(state: CompassStore) {
  const activeKey = selectActivePluginStateKey(state);
  if (!activeKey) {
    return {};
  }
  return state.inputErrorsByPluginKey[activeKey] ?? {};
}

export function selectActiveInputSchema(state: CompassStore) {
  return selectActivePlugin(state)?.userInputs ?? [];
}

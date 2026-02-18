import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { CompassStore } from "@/store/types";
import { createPluginSlice } from "@/store/slices/pluginSlice";
import { createInputSlice } from "@/store/slices/inputSlice";
import { createChatSlice } from "@/store/slices/chatSlice";
import { createAdminSlice } from "@/store/slices/adminSlice";
import { createUiSlice } from "@/store/slices/uiSlice";

export const useCompassStore = create<CompassStore>()(
  devtools((...args) => ({
    ...createPluginSlice(...args),
    ...createInputSlice(...args),
    ...createChatSlice(...args),
    ...createAdminSlice(...args),
    ...createUiSlice(...args)
  }))
);

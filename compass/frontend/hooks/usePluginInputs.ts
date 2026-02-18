"use client";

import { useMemo } from "react";
import { useCompassStore } from "@/store";
import {
  selectActiveInputErrors,
  selectActiveInputSchema,
  selectActiveInputValues
} from "@/store/selectors/inputSelectors";
import { selectActivePluginStateKey } from "@/store/selectors/pluginSelectors";
import type { InputValue } from "@/schemas/domain/input";

export function usePluginInputs() {
  const activeStateKey = useCompassStore(selectActivePluginStateKey);
  const schema = useCompassStore(selectActiveInputSchema);
  const values = useCompassStore(selectActiveInputValues);
  const errors = useCompassStore(selectActiveInputErrors);
  const setInputValue = useCompassStore((state) => state.setInputValue);
  const validatePluginInputs = useCompassStore((state) => state.validatePluginInputs);
  const serializePluginInputs = useCompassStore((state) => state.serializePluginInputs);

  const setValue = (name: string, value: unknown) => {
    if (!activeStateKey) {
      return;
    }
    setInputValue(activeStateKey, name, value as InputValue);
  };

  const validate = () => {
    if (!activeStateKey) {
      return true;
    }
    return validatePluginInputs(activeStateKey, schema);
  };

  const serialize = () => {
    if (!activeStateKey) {
      return [];
    }
    return serializePluginInputs(activeStateKey, schema);
  };

  const hasInputs = useMemo(() => schema.length > 0, [schema]);

  return {
    hasInputs,
    schema,
    values,
    errors,
    setValue,
    validate,
    serialize
  };
}

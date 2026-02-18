"use client";

import { Settings2 } from "lucide-react";
import { usePluginInputs } from "@/hooks/usePluginInputs";
import { InputRenderer } from "@/features/pluginInputs/InputRenderer";

export function PluginInputsPanel() {
  const { schema, values, errors, setValue } = usePluginInputs();

  return (
    <section className="panel p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <Settings2 size={16} className="text-compass-blue" />
        <h3 className="font-semibold">Input Settings</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        These values are defined by plugin developers in the registry and included with each chat request.
      </p>

      {!schema.length ? (
        <div className="text-sm text-muted-foreground">No extra inputs are configured for this plugin.</div>
      ) : (
        <div className="space-y-4">
          {schema.map((field) => (
            <InputRenderer
              key={field.name}
              field={field}
              value={values[field.name]}
              error={errors[field.name]}
              onChange={setValue}
            />
          ))}
        </div>
      )}
    </section>
  );
}

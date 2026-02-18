"use client";

import { BookOpenText } from "lucide-react";
import { useCompassStore } from "@/store";

export function CitationPanel() {
  const citation = useCompassStore((state) => state.selectedCitation);

  return (
    <section className="panel p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <BookOpenText size={16} className="text-compass-blue" />
        <h3 className="font-semibold">Citation</h3>
      </div>
      {!citation ? (
        <p className="text-sm text-muted-foreground">Select a citation from a response to inspect it here.</p>
      ) : (
        <div className="space-y-3 text-sm">
          {typeof citation.source === "string" && (
            <div>
              <div className="text-xs text-muted-foreground">Source</div>
              <div>{citation.source}</div>
            </div>
          )}
          {typeof citation.similarity === "number" && (
            <div>
              <div className="text-xs text-muted-foreground">Similarity</div>
              <div>{Math.round(citation.similarity * 100)}%</div>
            </div>
          )}
          {typeof citation.chunk_text === "string" && (
            <div>
              <div className="text-xs text-muted-foreground">Chunk Text</div>
              <div className="whitespace-pre-wrap">{citation.chunk_text}</div>
            </div>
          )}
          {Object.entries(citation)
            .filter(([key]) => !["source", "similarity", "chunk_text"].includes(key))
            .map(([key, value]) => (
              <div key={key}>
                <div className="text-xs text-muted-foreground">{key}</div>
                <div className="break-all">{String(value)}</div>
              </div>
            ))}
        </div>
      )}
    </section>
  );
}

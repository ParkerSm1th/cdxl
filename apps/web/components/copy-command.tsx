"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [command]);

  return (
    <button
      onClick={copy}
      className="group inline-flex cursor-pointer items-center gap-2 rounded-lg bg-secondary px-4 py-2.5 font-mono text-sm transition-colors hover:bg-secondary/80"
    >
      <span className="text-muted-foreground select-none">$</span>
      <span>{command}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";

export function AnimatedExample() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1200);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 1500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <div className="space-y-6 p-5">
        {/* User message — right-aligned bubble */}
        <div className="flex justify-end">
          <div className="rounded-2xl bg-card px-5 py-3.5 text-sm leading-relaxed">
            Use cdxl to share this session
          </div>
        </div>

        {/* Worked divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">Worked</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Assistant response + tool call */}
        <div className="space-y-3">
          {phase < 1 ? (
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                I&apos;ll share this session using cdxl.
              </p>
            </div>
          ) : (
            <>
              {phase >= 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden rounded-xl border border-border bg-card">
                  <div className="px-4 py-2 text-xs text-muted-foreground">
                    Shell
                  </div>
                  <div className="px-4 pb-3">
                    <pre className="font-mono text-xs leading-relaxed">
                      <span className="text-muted-foreground">$ </span>
                      cdxl share sess_a1b2c3
                    </pre>
                  </div>
                  <div className="flex justify-end px-4 pb-2.5">
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <Check className="h-3 w-3" />
                      Success
                    </span>
                  </div>
                </div>
              )}

              {phase >= 3 && (
                <p className="animate-in fade-in duration-300 text-sm leading-relaxed">
                  Shared! Here&apos;s your link:{" "}
                  <span className="font-mono text-emerald-400">
                    codexl.ink/c/abc123
                  </span>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

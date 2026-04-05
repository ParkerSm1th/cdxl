import {
  Terminal,
  Check,
  RefreshCw,
  Eye,
  Download,
  MessageSquare,
} from "lucide-react";
import { CopyCommand } from "@/components/copy-command";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-8 md:py-16">
      {/* Top bar */}
      <div className="flex items-center gap-2.5">
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">CodexLink</span>
      </div>

      {/* Hero */}
      <section className="mt-14 md:mt-20">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Share Codex sessions
          <br />
          from inside Codex.
        </h1>

        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
          Install the CLI, then just ask Codex to share the session. It runs the
          command, uploads the transcript, and gives you a public link.
        </p>

        {/* Install step */}
        <div className="mt-8 space-y-3">
          <CopyCommand command="npm i -g codex-link" />
        </div>
      </section>

      {/* Codex prompt example */}
      <section className="mt-12">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Then, in any Codex session
        </p>
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
              <p className="text-sm leading-relaxed">
                I&apos;ll share this session using cdxl.
              </p>

              {/* Shell command block */}
              <div className="overflow-hidden rounded-xl border border-border bg-card">
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

              {/* Output link */}
              <p className="text-sm leading-relaxed">
                Shared! Here&apos;s your link:{" "}
                <span className="font-mono text-emerald-400">
                  codexl.ink/c/abc123
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mt-16 space-y-6">
        <Feature
          icon={<Download className="h-4 w-4" />}
          title="Install once"
          text="npm i -g codex-link gives Codex a tool it can call whenever you want to share."
        />
        <Feature
          icon={<MessageSquare className="h-4 w-4" />}
          title="Just ask"
          text={`Say "use cdxl to share this session" and Codex handles the rest.`}
        />
        <Feature
          icon={<Eye className="h-4 w-4" />}
          title="Clean viewer"
          text="Messages, tool calls, and outputs rendered with collapsible sections — just like in Codex."
        />
        <Feature
          icon={<RefreshCw className="h-4 w-4" />}
          title="Live updates"
          text="Ask Codex to track the session and the link stays in sync as you keep working."
        />
      </section>

      {/* Preview */}
      <section className="mt-16">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          What the link looks like
        </p>
        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="space-y-6 p-5">
            {/* User message — right-aligned bubble */}
            <div className="flex justify-end">
              <div className="rounded-2xl bg-card px-5 py-3.5 text-sm leading-relaxed">
                Add input validation to the signup form
              </div>
            </div>

            {/* Worked divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">Worked</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Assistant response + tool calls */}
            <div className="space-y-3">
              <p className="text-sm leading-relaxed">
                I&apos;ll add Zod validation with proper error messages and
                tests for edge cases.
              </p>

              {/* File edits */}
              <div className="space-y-1.5 text-sm">
                <div className="text-muted-foreground">
                  Edited{" "}
                  <span className="text-emerald-400">signup-form.tsx</span>{" "}
                  <span className="text-emerald-400">+42</span>{" "}
                  <span className="text-red-400">-8</span>
                </div>
                <div className="text-muted-foreground">
                  Edited{" "}
                  <span className="text-emerald-400">signup-form.test.ts</span>{" "}
                  <span className="text-emerald-400">+67</span>{" "}
                  <span className="text-red-400">-0</span>
                </div>
              </div>

              {/* Shell command block */}
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="px-4 py-2 text-xs text-muted-foreground">
                  Shell
                </div>
                <div className="px-4 pb-3">
                  <pre className="font-mono text-xs leading-relaxed">
                    <span className="text-muted-foreground">$ </span>
                    pnpm test -- signup-form.test.ts
                  </pre>
                </div>
                <div className="flex justify-end px-4 pb-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <Check className="h-3 w-3" />
                    Success
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 pb-8 text-center text-xs text-muted-foreground">
        Open source
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {text}
        </p>
      </div>
    </div>
  );
}

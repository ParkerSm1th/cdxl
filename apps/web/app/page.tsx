import {
  Terminal,
  Check,
  RefreshCw,
  Eye,
  Download,
  MessageSquare,
} from "lucide-react";
import { CopyCommand } from "@/components/copy-command";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedExample } from "@/components/animated-example";

export default function HomePage() {
  return (
    <div>
      {/* Top section */}
      <div className="mx-auto max-w-2xl px-5 pt-8 md:pt-12">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">CodexLink</span>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="https://github.com/ParkerSm1th/cdxl"
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-current"
              >
                <path d="M12 1.5a10.5 10.5 0 0 0-3.32 20.46c.53.1.72-.23.72-.5v-1.95c-2.93.64-3.55-1.24-3.55-1.24-.47-1.2-1.16-1.52-1.16-1.52-.95-.65.07-.64.07-.64 1.05.08 1.6 1.08 1.6 1.08.94 1.6 2.45 1.14 3.05.87.1-.68.37-1.14.67-1.4-2.34-.27-4.8-1.17-4.8-5.22 0-1.15.41-2.08 1.08-2.82-.1-.27-.47-1.36.1-2.84 0 0 .88-.28 2.89 1.08a9.97 9.97 0 0 1 5.27 0c2-1.36 2.88-1.08 2.88-1.08.57 1.48.2 2.57.1 2.84.68.74 1.08 1.67 1.08 2.82 0 4.06-2.47 4.94-4.82 5.2.38.33.72.98.72 1.98v2.93c0 .28.19.61.73.5A10.5 10.5 0 0 0 12 1.5Z" />
              </svg>
            </a>
            <ThemeToggle />
          </div>
        </div>

        {/* Hero */}
        <section className="mt-14 text-center md:mt-20">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Share Codex sessions
            <br />
            from inside Codex.
          </h1>

          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            Install the CLI, then just ask Codex to share the session. It runs the
            command, uploads the transcript, and gives you a public link.
          </p>
        </section>
      </div>

      {/* Full-width install banner */}
      <div className="mt-8">
        <div className="flex justify-center px-5 py-5">
          <CopyCommand command="npm i -g codex-link" />
        </div>
      </div>

      {/* Content below banner */}
      <div className="mx-auto max-w-2xl px-5">
        {/* Codex prompt example — animated */}
        <section className="mt-12">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Then, in any Codex session
          </p>
          <AnimatedExample />
        </section>

        {/* Features */}
        <section className="mt-16 space-y-6">
          <Feature
            icon={<Download className="h-4 w-4" />}
            title="Install once"
            text={
              <>
                <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs">
                  npm i -g codex-link
                </code>{" "}
                gives Codex a tool it can call whenever you want to share.
              </>
            }
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
          <a
            href="https://github.com/ParkerSm1th/cdxl"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            Open source
          </a>
        </footer>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: React.ReactNode;
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

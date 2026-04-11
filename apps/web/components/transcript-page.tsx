"use client";

import React, { useState, useCallback } from "react";
import {
  Terminal,
  ChevronDown,
  ChevronRight,
  Clock,
  MessageSquare,
  Wrench,
  Check,
  Search,
  FileCode,
  CircleCheck,
  Download,
  Copy,
  Link,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { ImageLightboxProvider, useImageLightbox } from "@/components/image-lightbox";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ShareFetchResult } from "../lib/api";
import type { TranscriptEntry, RenderPayload } from "@codexlink/shared";

const OUTPUT_PREVIEW_LIMIT = 400;

function formatTimestamp(input: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(input));
}

function formatRelativeDate(input: string): string {
  const date = new Date(input);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatTimestamp(input);
}

function buildOutputPreview(output: string): string {
  if (output.length <= OUTPUT_PREVIEW_LIMIT) return output;
  return `${output.slice(0, OUTPUT_PREVIEW_LIMIT).trimEnd()}\n\n...`;
}

// Detect tool actions for Codex-style inline display
function getToolAction(
  toolName: string,
): { icon: React.ReactNode; verb: string } {
  const lower = toolName.toLowerCase();
  if (lower.includes("read") || lower.includes("grep") || lower.includes("glob") || lower.includes("search")) {
    return { icon: <Search className="h-3.5 w-3.5" />, verb: "Explored" };
  }
  if (lower.includes("edit") || lower.includes("write") || lower.includes("patch")) {
    return { icon: <FileCode className="h-3.5 w-3.5" />, verb: "Edited" };
  }
  if (lower.includes("bash") || lower.includes("shell") || lower.includes("exec") || lower.includes("command")) {
    return { icon: <Terminal className="h-3.5 w-3.5" />, verb: "Ran" };
  }
  return { icon: <Wrench className="h-3.5 w-3.5" />, verb: "" };
}

function generateMarkdown(data: RenderPayload): string {
  const lines: string[] = [];
  lines.push(`# ${data.title}`);
  lines.push("");
  if (data.excerpt && data.excerpt !== data.title) {
    lines.push(`> ${data.excerpt}`);
    lines.push("");
  }
  lines.push("---");
  lines.push("");

  for (const entry of data.entries) {
    switch (entry.kind) {
      case "message":
        lines.push(entry.role === "user" ? "**User:**" : "**Assistant:**");
        lines.push("");
        lines.push(entry.text);
        lines.push("");
        break;
      case "tool_call": {
        const action = getToolAction(entry.toolName);
        const lower = entry.toolName.toLowerCase();
        const isBash =
          lower.includes("bash") ||
          lower.includes("shell") ||
          lower.includes("command");
        let label = entry.toolName;
        try {
          const parsed = JSON.parse(entry.input);
          if (isBash && parsed.command) {
            label = `\`$ ${parsed.command}\``;
          } else if (parsed.file_path) {
            label = `${action.verb} \`${parsed.file_path}\``;
          }
        } catch {
          /* keep default label */
        }
        lines.push(`*${label}*`);
        lines.push("");
        if (!isBash) {
          lines.push("```");
          lines.push(entry.input);
          lines.push("```");
          lines.push("");
        }
        break;
      }
      case "tool_output":
        lines.push("```");
        lines.push(entry.output);
        lines.push("```");
        lines.push("");
        break;
      case "commentary":
        lines.push(`*${entry.text}*`);
        lines.push("");
        break;
    }
  }

  return lines.join("\n");
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadMarkdown(data: RenderPayload) {
  const md = generateMarkdown(data);
  const slug = data.title.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  downloadFile(md, `${slug}.md`, "text/markdown");
}

function downloadJson(data: RenderPayload) {
  const json = JSON.stringify(data, null, 2);
  const slug = data.title.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  downloadFile(json, `${slug}.json`, "application/json");
}

function ExportDropdown({ data }: { data: RenderPayload }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground outline-none">
        <Download className="h-3.5 w-3.5" />
        <span>Export</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6}>
        <DropdownMenuItem className="cursor-pointer" onClick={() => downloadMarkdown(data)}>
          Markdown
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer" onClick={() => downloadJson(data)}>
          JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShareUrlCopy({ shareId }: { shareId: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `codexl.ink/c/${shareId}`;

  const copy = useCallback(() => {
    navigator.clipboard.writeText(`https://${shareUrl}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareUrl]);

  return (
    <button
      onClick={copy}
      className="group inline-flex items-center gap-2 font-mono text-sm text-emerald-400 transition-colors hover:text-emerald-300"
    >
      <span>{shareUrl}</span>
      {copied ? (
        <Check className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function ShareLinkButton({ shareId }: { shareId: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(`https://codexl.ink/c/${shareId}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [shareId]);

  return (
    <button
      onClick={copy}
      className="text-emerald-400 transition-colors hover:text-emerald-300"
      title="Copy share link"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Link className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// Try to extract a file path from tool input
function extractFilePath(input: string): string | null {
  try {
    const parsed = JSON.parse(input);
    if (parsed.file_path) return parsed.file_path.split("/").pop();
    if (parsed.path) return parsed.path.split("/").pop();
    if (parsed.pattern) return parsed.pattern;
    if (parsed.command) return parsed.command;
  } catch {
    // Not JSON, try to find a path-like string
    const match = input.match(/[\w-]+\.\w+/);
    if (match) return match[0];
  }
  return null;
}

// A work block is everything between user messages — all assistant text + tool calls in order
type WorkBlock = {
  entries: TranscriptEntry[];
};

type DisplayGroup =
  | { type: "user_message"; entry: TranscriptEntry & { kind: "message"; role: "user" } }
  | { type: "work_block"; block: WorkBlock };

function groupIntoDisplayGroups(entries: TranscriptEntry[]): DisplayGroup[] {
  const groups: DisplayGroup[] = [];
  let currentWork: TranscriptEntry[] = [];

  const flushWork = () => {
    if (currentWork.length > 0) {
      groups.push({ type: "work_block", block: { entries: currentWork } });
      currentWork = [];
    }
  };

  for (const entry of entries) {
    if (entry.kind === "message" && entry.role === "user") {
      flushWork();
      groups.push({ type: "user_message", entry: entry as TranscriptEntry & { kind: "message"; role: "user" } });
    } else {
      // Everything else (assistant messages, tool calls, tool outputs, commentary)
      // goes into the current work block
      currentWork.push(entry);
    }
  }

  flushWork();
  return groups;
}

function MessageImages({
  images,
}: {
  images?: Array<{ alt: string; src: string }>;
}) {
  const openLightbox = useImageLightbox();

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-3">
      {images.map((image, index) => (
        <img
          key={`${image.src}-${index}`}
          alt={image.alt}
          className="max-h-[28rem] w-full cursor-pointer rounded-xl border border-border object-contain transition-opacity hover:opacity-80"
          loading="lazy"
          src={image.src}
          onClick={() => openLightbox(image.src, image.alt)}
        />
      ))}
    </div>
  );
}

function MessageBody({
  entry,
}: {
  entry: { images?: Array<{ alt: string; src: string }>; text: string };
}) {
  return (
    <>
      {entry.text ? <Markdown>{entry.text}</Markdown> : null}
      <MessageImages images={entry.images} />
    </>
  );
}

function UserBubble({ entry }: { entry: { images?: Array<{ alt: string; src: string }>; text: string } }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-card px-5 py-3.5 text-sm leading-relaxed">
        <MessageBody entry={entry} />
      </div>
    </div>
  );
}

function ExpandableOutput({
  output,
  truncated,
}: {
  output: string;
  truncated: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const preview = buildOutputPreview(output);
  const hasMore = output.length > OUTPUT_PREVIEW_LIMIT;

  return (
    <div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-card px-4 py-3 font-mono text-xs leading-relaxed text-muted-foreground">
        {expanded ? output : preview}
      </pre>
      <div className="mt-1.5 flex items-center gap-3">
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {expanded ? "Show less" : "Show full output"}
          </button>
        )}
        {truncated && (
          <span className="text-xs text-muted-foreground/50">truncated</span>
        )}
      </div>
    </div>
  );
}

function CommandBlock({ command }: { command: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="px-4 py-2 text-xs text-muted-foreground">Shell</div>
      <div className="px-4 pb-3">
        <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed">
          <span className="text-muted-foreground">$ </span>
          {command}
        </pre>
      </div>
      <div className="flex justify-end px-4 pb-2.5">
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CircleCheck className="h-3 w-3" />
          Success
        </span>
      </div>
    </div>
  );
}

function InlineToolCall({ entry }: { entry: TranscriptEntry & { kind: "tool_call" } }) {
  const [showInput, setShowInput] = useState(false);
  const action = getToolAction(entry.toolName);
  const filePath = extractFilePath(entry.input);

  // For shell/bash commands, try to show as a command block
  const isBash = entry.toolName.toLowerCase().includes("bash") ||
    entry.toolName.toLowerCase().includes("shell") ||
    entry.toolName.toLowerCase().includes("command");

  let command: string | null = null;
  if (isBash) {
    try {
      const parsed = JSON.parse(entry.input);
      command = parsed.command || parsed.cmd || null;
    } catch {
      command = null;
    }
  }

  if (command) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setShowInput(!showInput)}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {showInput ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <span>{action.verb} command</span>
        </button>
        {showInput && <CommandBlock command={command} />}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setShowInput(!showInput)}
        className="flex items-center gap-2 text-sm transition-colors"
      >
        {showInput ? (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-muted-foreground">{action.verb || entry.toolName}</span>
        {filePath && (
          <span className="text-emerald-400">{filePath}</span>
        )}
      </button>
      {showInput && (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-card px-4 py-3 font-mono text-xs leading-relaxed text-muted-foreground">
          {entry.input}
        </pre>
      )}
    </div>
  );
}

function InlineToolOutput({ entry }: { entry: TranscriptEntry & { kind: "tool_output" } }) {
  return <ExpandableOutput output={entry.output} truncated={entry.truncated} />;
}

// Pair tool_calls with their corresponding tool_outputs
type ToolPair = {
  call: TranscriptEntry & { kind: "tool_call" };
  output?: TranscriptEntry & { kind: "tool_output" };
};

function pairToolEntries(entries: TranscriptEntry[]): ToolPair[] {
  const pairs: ToolPair[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    if (entry.kind === "tool_call") {
      const next = entries[i + 1];
      if (next && next.kind === "tool_output") {
        pairs.push({
          call: entry,
          output: next,
        });
        i++; // skip the output
      } else {
        pairs.push({ call: entry });
      }
    } else if (entry.kind === "tool_output") {
      // orphan output - create a synthetic pair
      pairs.push({
        call: { ...entry, kind: "tool_call" as const, input: "", toolName: entry.toolName, id: entry.id + "-call", createdAt: entry.createdAt },
        output: entry,
      });
    }
  }

  return pairs;
}

function ToolCallWithOutput({ pair }: { pair: ToolPair }) {
  const [showOutput, setShowOutput] = useState(false);
  const action = getToolAction(pair.call.toolName);
  const filePath = extractFilePath(pair.call.input);

  const isBash = pair.call.toolName.toLowerCase().includes("bash") ||
    pair.call.toolName.toLowerCase().includes("shell") ||
    pair.call.toolName.toLowerCase().includes("command");

  let command: string | null = null;
  if (isBash) {
    try {
      const parsed = JSON.parse(pair.call.input);
      command = parsed.command || parsed.cmd || null;
    } catch {
      command = null;
    }
  }

  // For bash commands with output
  if (command && pair.output) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setShowOutput(!showOutput)}
          className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {showOutput ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          <span>{action.verb} command</span>
        </button>
        {showOutput && (
          <div className="space-y-3">
            <CommandBlock command={command} />
            <ExpandableOutput output={pair.output.output} truncated={pair.output.truncated} />
          </div>
        )}
      </div>
    );
  }

  // For file operations - show inline like Codex
  if (filePath && !isBash) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{action.verb}</span>
          <span className="text-emerald-400">{filePath}</span>
        </div>
        {pair.output && (
          <ExpandableOutput output={pair.output.output} truncated={pair.output.truncated} />
        )}
      </div>
    );
  }

  // Fallback
  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowOutput(!showOutput)}
        className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {showOutput ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <span>{pair.call.toolName}</span>
      </button>
      {showOutput && (
        <div className="space-y-3">
          {pair.call.input && (
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-card px-4 py-3 font-mono text-xs leading-relaxed text-muted-foreground">
              {pair.call.input}
            </pre>
          )}
          {pair.output && (
            <ExpandableOutput output={pair.output.output} truncated={pair.output.truncated} />
          )}
        </div>
      )}
    </div>
  );
}

function WorkBlockView({ block, showDivider }: { block: WorkBlock; showDivider: boolean }) {
  const [expanded, setExpanded] = useState(false);

  // Find the last assistant message — that's the "final message" always shown
  let finalMessageIndex = -1;
  for (let i = block.entries.length - 1; i >= 0; i--) {
    if (block.entries[i]!.kind === "message") {
      finalMessageIndex = i;
      break;
    }
  }

  const intermediateEntries = finalMessageIndex >= 0
    ? block.entries.slice(0, finalMessageIndex)
    : block.entries;
  const finalMessage = finalMessageIndex >= 0
    ? block.entries[finalMessageIndex] as TranscriptEntry & { kind: "message" }
    : null;
  const trailingEntries = finalMessageIndex >= 0
    ? block.entries.slice(finalMessageIndex + 1)
    : [];

  // Pair tool calls in the intermediate section
  const intermediateToolEntries = intermediateEntries.filter(
    (e) => e.kind === "tool_call" || e.kind === "tool_output",
  );
  const intermediateMessages = intermediateEntries.filter(
    (e) => e.kind === "message" || e.kind === "commentary",
  );
  const pairs = pairToolEntries(intermediateToolEntries);
  const trailingPairs = pairToolEntries(
    trailingEntries.filter((e) => e.kind === "tool_call" || e.kind === "tool_output"),
  );

  const toolCount = pairs.length + trailingPairs.length;
  const hasCollapsibleContent = intermediateEntries.length > 0 || trailingEntries.length > 0;

  // Build summary for collapsed state
  const summaryParts: string[] = [];
  if (toolCount > 0) summaryParts.push(`${toolCount} tool ${toolCount === 1 ? "call" : "calls"}`);
  const collapsedSummary = summaryParts.join(", ");

  // Render interleaved intermediate entries in order
  const renderIntermediateEntries = () => {
    const elements: React.ReactNode[] = [];

    // We need to render in original order, pairing tool_call+tool_output
    let i = 0;
    while (i < intermediateEntries.length) {
      const entry = intermediateEntries[i]!;

      if (entry.kind === "message") {
        elements.push(
          <div key={entry.id} className="text-sm leading-relaxed">
            <MessageBody entry={entry as TranscriptEntry & { kind: "message" }} />
          </div>,
        );
        i++;
      } else if (entry.kind === "commentary") {
        elements.push(
          <CommentaryLine key={entry.id} entry={entry as TranscriptEntry & { kind: "commentary" }} />,
        );
        i++;
      } else if (entry.kind === "tool_call") {
        const next = intermediateEntries[i + 1];
        if (next && next.kind === "tool_output") {
          elements.push(
            <ToolCallWithOutput
              key={entry.id}
              pair={{
                call: entry as TranscriptEntry & { kind: "tool_call" },
                output: next as TranscriptEntry & { kind: "tool_output" },
              }}
            />,
          );
          i += 2;
        } else {
          elements.push(
            <ToolCallWithOutput
              key={entry.id}
              pair={{ call: entry as TranscriptEntry & { kind: "tool_call" } }}
            />,
          );
          i++;
        }
      } else if (entry.kind === "tool_output") {
        // Orphan output
        elements.push(
          <ExpandableOutput
            key={entry.id}
            output={(entry as TranscriptEntry & { kind: "tool_output" }).output}
            truncated={(entry as TranscriptEntry & { kind: "tool_output" }).truncated}
          />,
        );
        i++;
      } else {
        i++;
      }
    }

    return elements;
  };

  return (
    <div>
      {/* Worked divider / collapse toggle */}
      {showDivider && hasCollapsibleContent && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="group flex w-full items-center gap-3 py-2"
        >
          <div className="h-px flex-1 bg-border" />
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
            Worked
            {!expanded && collapsedSummary && (
              <span className="text-muted-foreground/60">
                · {collapsedSummary}
              </span>
            )}
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </span>
          <div className="h-px flex-1 bg-border" />
        </button>
      )}

      {/* Non-collapsible divider when there's nothing to collapse */}
      {showDivider && !hasCollapsibleContent && (
        <div className="flex items-center gap-3 py-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">Worked</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* Collapsible content */}
      {expanded && intermediateEntries.length > 0 && (
        <div className="mt-4 space-y-3">
          {renderIntermediateEntries()}
        </div>
      )}

      {/* Final message - always visible */}
      {finalMessage && (
        <div className={`text-sm leading-relaxed ${showDivider ? "mt-4" : ""}`}>
          <MessageBody entry={finalMessage} />
        </div>
      )}

      {/* Any trailing tool calls after the final message (also collapsible) */}
      {expanded && trailingEntries.length > 0 && (
        <div className="mt-3 space-y-3">
          {trailingPairs.map((pair) => (
            <ToolCallWithOutput key={pair.call.id} pair={pair} />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentaryLine({ entry }: { entry: { text: string } }) {
  return (
    <div className="text-sm italic text-muted-foreground">
      <Markdown>{entry.text}</Markdown>
    </div>
  );
}

function StatePanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-5">
      <div className="w-full rounded-2xl border border-border bg-card p-10 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      </div>
    </main>
  );
}

export function TranscriptPage({ result, shareId }: { result: ShareFetchResult; shareId: string }) {
  if (result.state === "not-found") {
    return (
      <StatePanel
        title="Share not found"
        description="The link is invalid or the chat has not been published yet."
      />
    );
  }

  if (result.state === "revoked") {
    return (
      <StatePanel
        title="Share revoked"
        description="The owner removed this Codex chat from public view."
      />
    );
  }

  const { data } = result.share;
  const groups = groupIntoDisplayGroups(data.entries);
  const totalMessages = data.stats.userMessages + data.stats.assistantMessages;
  const totalTools = data.stats.toolCalls;

  return (
    <ImageLightboxProvider>
    <main className="mx-auto max-w-2xl px-5 py-8 md:py-12">
      {/* Top bar */}
      <div className="mb-6 flex items-center justify-between">
        <a
          href="/"
          className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Terminal className="h-4 w-4" />
          <span className="font-medium">CodexLink</span>
        </a>
        <div className="flex items-center gap-3">
          <ExportDropdown data={data} />
          <ThemeToggle />
        </div>
      </div>

      {/* Title */}
      <div className="flex items-center gap-2.5">
        <h1 className="text-lg font-semibold tracking-tight">
          {data.title}
        </h1>
        <ShareLinkButton shareId={shareId} />
      </div>

      {data.excerpt && data.excerpt !== data.title && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {data.excerpt}
        </p>
      )}

      {/* Metadata */}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          {formatRelativeDate(data.createdAt)}
        </span>
        <span>·</span>
        <span className="flex items-center gap-1.5">
          <MessageSquare className="h-3 w-3" />
          {totalMessages}
        </span>
        {totalTools > 0 && (
          <span className="flex items-center gap-1.5">
            <Wrench className="h-3 w-3" />
            {totalTools}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="my-6 h-px bg-border" />

      {/* Transcript */}
      <div className="space-y-6">
        {groups.map((group, i) => {
          if (group.type === "user_message") {
            return <UserBubble key={group.entry.id} entry={group.entry} />;
          }

          if (group.type === "work_block") {
            const showDivider = i > 0 && groups[i - 1]?.type === "user_message";
            return (
              <WorkBlockView
                key={`work-${i}`}
                block={group.block}
                showDivider={showDivider}
              />
            );
          }

          return null;
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 flex items-center gap-3 py-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          Updated {formatRelativeDate(data.sourceUpdatedAt)}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </main>
    </ImageLightboxProvider>
  );
}

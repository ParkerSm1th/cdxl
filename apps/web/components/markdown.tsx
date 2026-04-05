import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useImageLightbox } from "@/components/image-lightbox";

function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const openLightbox = useImageLightbox();
  return (
    <img
      alt={alt ?? ""}
      className="my-3 max-h-[28rem] w-full cursor-pointer rounded-xl border border-border object-contain transition-opacity last:mb-0 hover:opacity-80"
      loading="lazy"
      src={src ?? ""}
      onClick={() => openLightbox(src ?? "", alt ?? "")}
    />
  );
}

export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-3 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic">{children}</em>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-foreground underline underline-offset-2 decoration-muted-foreground/40 hover:decoration-foreground transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            {children}
          </a>
        ),
        img: ({ src, alt }) => <MarkdownImage src={typeof src === "string" ? src : undefined} alt={alt} />,
        ul: ({ children }) => (
          <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),
        h1: ({ children }) => (
          <h1 className="mb-3 mt-5 text-lg font-semibold first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h3>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-border pl-4 text-muted-foreground last:mb-0">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) => {
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            return (
              <code className="text-xs">{children}</code>
            );
          }
          return (
            <code className="rounded bg-card px-1.5 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="mb-3 overflow-x-auto rounded-lg bg-card px-4 py-3 font-mono text-xs leading-relaxed last:mb-0">
            {children}
          </pre>
        ),
        hr: () => <hr className="my-4 border-border" />,
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto last:mb-0">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-border">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-border/50 px-3 py-2">{children}</td>
        ),
        input: ({ checked, ...props }) => (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mr-2 accent-foreground"
            {...props}
          />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

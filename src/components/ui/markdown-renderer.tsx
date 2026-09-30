"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import { useMemo } from "react";

interface MarkdownRendererProps {
  content: string;
  showToc?: boolean;
}

export function MarkdownRenderer({ content, showToc = true }: MarkdownRendererProps) {
  // Extraer los headings del contenido para generar la tabla de contenidos manual
  const headings = useMemo(() => {
    const regex = /^(#{2,4})\s+(.+)$/gm;
    const matches = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      const level = match[1].length;
      const title = match[2];
      const id = title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");

      matches.push({ level, title, id });
    }

    return matches;
  }, [content]);

  const handleHeadingClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex gap-6 w-full">
      {/* Tabla de contenidos */}
      {showToc && headings.length > 0 && (
        <aside className="sticky top-4 hidden lg:block w-48 flex-shrink-0">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Tabla de contenidos
            </h3>
            <nav className="space-y-1 text-sm">
              {headings.map((heading) => (
                <button
                  key={heading.id}
                  onClick={() => handleHeadingClick(heading.id)}
                  className={`block w-full text-left px-2 py-1 rounded hover:bg-accent/50 transition-colors ${
                    heading.level === 2
                      ? "text-foreground font-medium"
                      : heading.level === 3
                        ? "text-muted-foreground ml-3"
                        : "text-muted-foreground ml-6"
                  }`}
                >
                  {heading.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      )}

      {/* Contenido principal */}
      <div className="flex-1 min-w-0">
        <article
          className="prose prose-sm dark:prose-invert max-w-none
            prose-headings:font-semibold prose-headings:tracking-tight
            prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-4 prose-h2:scroll-mt-20
            prose-h3:text-base prose-h3:mt-5 prose-h3:mb-3 prose-h3:scroll-mt-20
            prose-h4:text-sm prose-h4:mt-4 prose-h4:mb-2 prose-h4:scroll-mt-20
            prose-p:leading-relaxed prose-p:my-4
            prose-li:marker:text-muted-foreground prose-li:my-1
            prose-ul:my-4 prose-ol:my-4
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5
            prose-code:text-[0.85em] prose-code:font-medium
            prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-muted prose-pre:border prose-pre:border-border/60 prose-pre:overflow-x-auto
            prose-blockquote:border-l-2 prose-blockquote:border-primary/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground
            prose-table:border prose-table:border-border/60 prose-table:my-4
            prose-th:bg-muted prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold
            prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border/60
            prose-img:rounded prose-img:border prose-img:border-border/60 prose-img:my-4
            prose-hr:border-border/60 prose-hr:my-6"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm, [remarkToc, { tight: true, heading: "Índice" }]]}
            components={{
              h2: ({ children }) => {
                const id = String(children)
                  .toLowerCase()
                  .trim()
                  .replace(/[^\w\s-]/g, "")
                  .replace(/\s+/g, "-");
                return <h2 id={id}>{children}</h2>;
              },
              h3: ({ children }) => {
                const id = String(children)
                  .toLowerCase()
                  .trim()
                  .replace(/[^\w\s-]/g, "")
                  .replace(/\s+/g, "-");
                return <h3 id={id}>{children}</h3>;
              },
              h4: ({ children }) => {
                const id = String(children)
                  .toLowerCase()
                  .trim()
                  .replace(/[^\w\s-]/g, "")
                  .replace(/\s+/g, "-");
                return <h4 id={id}>{children}</h4>;
              },
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              code: ({ children }) => {
                return <code className="rounded bg-muted px-1 py-0.5 text-sm text-[0.85em] font-medium">{children}</code>;
              },
              table: ({ children }) => (
                <div className="overflow-x-auto">
                  <table>{children}</table>
                </div>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
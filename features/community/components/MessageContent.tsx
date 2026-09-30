import Markdown from "react-markdown";
import { twMerge } from "tailwind-merge";

interface MessageContentProps {
  content: string;
  className?: string;
  textSize?: "xs" | "sm" | "base";
  textColor?: string;
  compact?: boolean;
  unstyled?: boolean;
}

export function MessageContent({ 
  content, 
  className,
  textSize = "sm",
  textColor = "text-foreground",
  compact = false,
  unstyled = false,
}: MessageContentProps) {
  const textSizeClass = {
    xs: "text-xs",
    sm: "text-sm",
    base: "text-base",
  }[textSize];

  if (compact) {
    return (
      <div
        className={twMerge(
          unstyled ? "" : "prose prose-sm max-w-none",
          className,
        )}
      >
        <Markdown
          components={{
            p: ({ children }) => (
              <span className={twMerge("whitespace-pre-wrap break-words inline", textSizeClass, textColor)} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {children}
              </span>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic">{children}</em>
            ),
            code: ({ children }) => (
              <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                {children}
              </code>
            ),
            pre: ({ children }) => (
              <span className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                {children}
              </span>
            ),
            ul: ({ children }) => (
              <span className="inline">{children}</span>
            ),
            ol: ({ children }) => (
              <span className="inline">{children}</span>
            ),
            li: ({ children }) => (
              <span className={twMerge(textSizeClass, "inline")}>• {children} </span>
            ),
            blockquote: ({ children }) => (
              <span className="italic inline">
                {children}
              </span>
            ),
            a: ({ href, children }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-hover underline hover:text-accent"
              >
                {children}
              </a>
            ),
          }}
        >
          {content || ""}
        </Markdown>
      </div>
    );
  }

  return (
    <div
      className={twMerge(
        unstyled ? "" : "prose prose-sm max-w-none",
        className,
      )}
    >
      <Markdown
        components={{
          p: ({ children }) => (
            <p className={twMerge("mb-0 whitespace-pre-wrap break-words", textSizeClass, textColor)} style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          code: ({ children }) => (
            <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="bg-muted p-2 rounded overflow-x-auto text-xs">
              {children}
            </pre>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-1 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-1 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className={textSizeClass}>{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-border pl-2 italic my-1">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary-hover underline hover:text-accent"
            >
              {children}
            </a>
          ),
        }}
      >
        {content || ""}
      </Markdown>
    </div>
  );
}


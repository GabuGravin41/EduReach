import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Simple markdown renderer for AI responses
 * Supports:
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code blocks: ```code```
 * - Inline code: `code`
 * - Lists: - item or * item
 * - Headers: # H1, ## H2, etc.
 * - Line breaks and paragraphs
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const renderMarkdown = (text: string) => {
    // Split by double newlines to get paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim());

    return paragraphs.map((paragraph, pIdx) => {
      // Check if paragraph is a code block
      if (paragraph.startsWith('```')) {
        const codeContent = paragraph.replace(/```/g, '').trim();
        return (
          <pre key={pIdx} className="bg-slate-900 dark:bg-slate-950 text-slate-100 p-3 rounded-lg overflow-x-auto text-xs my-2 border border-slate-700">
            <code>{codeContent}</code>
          </pre>
        );
      }

      // Check if paragraph is a list
      if (paragraph.match(/^[\s]*[-*+]/m)) {
        const items = paragraph.split('\n').filter(line => line.trim());
        return (
          <ul key={pIdx} className="list-disc list-inside my-2 space-y-1">
            {items.map((item, itemIdx) => (
              <li key={itemIdx} className="text-sm">
                {renderInlineMarkdown(item.replace(/^[\s]*[-*+]\s*/, ''))}
              </li>
            ))}
          </ul>
        );
      }

      // Check if paragraph is a header
      const headerMatch = paragraph.match(/^(#+)\s+(.*)/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const text = headerMatch[2];
        const HeaderTag = `h${Math.min(level, 6)}` as const;
        const sizes = {
          h1: 'text-lg font-bold',
          h2: 'text-base font-bold',
          h3: 'text-sm font-semibold',
          h4: 'text-sm font-semibold',
          h5: 'text-sm font-medium',
          h6: 'text-sm font-medium',
        };
        return React.createElement(
          HeaderTag,
          { key: pIdx, className: `${sizes[HeaderTag]} my-2` },
          renderInlineMarkdown(text)
        );
      }

      // Regular paragraph with inline formatting
      return (
        <p key={pIdx} className="text-sm leading-relaxed my-2">
          {renderInlineMarkdown(paragraph)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Combined regex for all inline formatting
    const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|`([^`]+)`|(?<!\*)\*(?!\*)|(?<!_)_(?!_)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // Bold
        parts.push(
          <strong key={`strong-${parts.length}`} className="font-semibold">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // Italic
        parts.push(
          <em key={`italic-${parts.length}`} className="italic">
            {match[4]}
          </em>
        );
      } else if (match[5]) {
        // Inline code
        parts.push(
          <code key={`code-${parts.length}`} className="bg-slate-800 dark:bg-slate-900 text-amber-400 px-1.5 py-0.5 rounded text-xs font-mono">
            {match[5]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {renderMarkdown(content)}
    </div>
  );
};

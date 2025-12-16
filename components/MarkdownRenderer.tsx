
import React from 'react';
import katex from 'katex';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Enhanced renderer for AI responses with LaTeX support
 * Supports:
 * - LaTeX Math: $...$ (inline), $$...$$ (block)
 * - Bold: **text** or __text__
 * - Italic: *text* or _text_
 * - Code blocks: ```code```
 * - Inline code: `code`
 * - Lists: - item or * item
 * - Headers: # H1, ## H2, etc.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  
  const renderMath = (text: string, isBlock: boolean) => {
    try {
      return (
        <span 
          dangerouslySetInnerHTML={{ 
            __html: katex.renderToString(text, { 
              throwOnError: false, 
              displayMode: isBlock 
            }) 
          }} 
        />
      );
    } catch (error) {
      return <span className="text-red-500 font-mono">{text}</span>;
    }
  };

  const renderInlineContent = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Regex for Math ($...$), Bold, Italic, Code
    const regex = /(\$\$)([\s\S]*?)\1|(\$)(.*?)\3|(\*\*|__)(.*?)\5|(\*|_)(.*?)\7|`([^`]+)`/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) { // Block Math $$...$$
        parts.push(
          <div key={`math-block-${parts.length}`} className="my-4 flex justify-center">
            {renderMath(match[2], true)}
          </div>
        );
      } else if (match[3]) { // Inline Math $...$
        parts.push(
          <span key={`math-inline-${parts.length}`} className="mx-1">
            {renderMath(match[4], false)}
          </span>
        );
      } else if (match[5]) { // Bold
        parts.push(<strong key={`bold-${parts.length}`} className="font-semibold">{match[6]}</strong>);
      } else if (match[7]) { // Italic
        parts.push(<em key={`italic-${parts.length}`} className="italic">{match[8]}</em>);
      } else if (match[9]) { // Inline code
        parts.push(
          <code key={`code-${parts.length}`} className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
            {match[9]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  const renderMarkdown = (text: string) => {
    const paragraphs = text.split('\n\n').filter(p => p.trim());

    return paragraphs.map((paragraph, pIdx) => {
      // Code Block
      if (paragraph.startsWith('```')) {
        const codeContent = paragraph.replace(/```/g, '').trim();
        return (
          <pre key={pIdx} className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm my-3 border border-slate-700 font-mono shadow-sm">
            <code>{codeContent}</code>
          </pre>
        );
      }

      // List
      if (paragraph.match(/^[\s]*[-*+]/m)) {
        const items = paragraph.split('\n').filter(line => line.trim());
        return (
          <ul key={pIdx} className="list-disc list-outside ml-5 my-3 space-y-1 text-slate-700 dark:text-slate-300">
            {items.map((item, itemIdx) => (
              <li key={itemIdx} className="pl-1">
                {renderInlineContent(item.replace(/^[\s]*[-*+]\s*/, ''))}
              </li>
            ))}
          </ul>
        );
      }

      // Header
      const headerMatch = paragraph.match(/^(#+)\s+(.*)/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const headerText = headerMatch[2];
        const HeaderTag = `h${Math.min(level, 6)}` as const;
        const classes = {
          h1: 'text-2xl font-bold mt-6 mb-3',
          h2: 'text-xl font-bold mt-5 mb-2',
          h3: 'text-lg font-semibold mt-4 mb-2',
          h4: 'text-base font-semibold mt-3 mb-1',
          h5: 'text-sm font-semibold mt-2 mb-1',
          h6: 'text-sm font-semibold mt-2 mb-1',
        };
        return React.createElement(
          HeaderTag,
          { key: pIdx, className: `${classes[HeaderTag]} text-slate-900 dark:text-slate-100` },
          renderInlineContent(headerText)
        );
      }

      // Paragraph
      return (
        <div key={pIdx} className="text-slate-700 dark:text-slate-300 leading-relaxed my-2">
          {renderInlineContent(paragraph)}
        </div>
      );
    });
  };

  return (
    <div className="markdown-content">
      {renderMarkdown(content)}
    </div>
  );
};

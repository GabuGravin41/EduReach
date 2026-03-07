import React from 'react';
// @ts-ignore - katex types may not be installed
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  content: string;
  onTimestampClick?: (seconds: number) => void;
}

type MathSegment = { type: 'math'; content: string; block: boolean };
type TextSegment = { type: 'text'; content: string };

/**
 * Split a string into math and text segments. Handles $$...$$ (block) and $...$ (inline).
 * Block math is matched first so $$ takes precedence over single $.
 */
function splitMathSegments(str: string): (MathSegment | TextSegment)[] {
  const segments: (MathSegment | TextSegment)[] = [];
  let lastPos = 0;
  let pos = 0;
  const len = str.length;

  while (pos < len) {
    // Block math $$...$$
    if (str.substring(pos, pos + 2) === '$$') {
      const end = str.indexOf('$$', pos + 2);
      if (end !== -1) {
        if (pos > lastPos) segments.push({ type: 'text', content: str.slice(lastPos, pos) });
        segments.push({ type: 'math', content: str.slice(pos + 2, end).trim(), block: true });
        lastPos = end + 2;
        pos = end + 2;
        continue;
      }
    }
    // Inline math $...$ (single $, content, then closing $)
    if (str[pos] === '$' && (pos === 0 || str[pos - 1] !== '$') && (pos + 1 < len && str[pos + 1] !== '$')) {
      const rest = str.slice(pos + 1);
      const closeIdx = rest.indexOf('$');
      if (closeIdx > 0) {
        const inner = rest.slice(0, closeIdx).trim();
        if (inner && !inner.includes('\n\n')) {
          if (pos > lastPos) segments.push({ type: 'text', content: str.slice(lastPos, pos) });
          segments.push({ type: 'math', content: inner, block: false });
          lastPos = pos + 1 + closeIdx + 1;
          pos = lastPos;
          continue;
        }
      }
    }
    pos++;
  }

  if (lastPos < len) segments.push({ type: 'text', content: str.slice(lastPos) });
  return segments;
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
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, onTimestampClick }) => {
  
  const renderMath = (text: string, isBlock: boolean) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return null;
    try {
      const html = katex.renderToString(trimmed, {
        throwOnError: false,
        displayMode: isBlock,
        output: 'html',
      });
      return (
        <span
          className="katex-wrapper"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    } catch (error) {
      return <span className="text-red-500 font-mono">{text}</span>;
    }
  };

  /** Renders bold, italic, inline code, and timestamps. */
  const renderTextFormatting = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Regex matches:
    // 1. **bold** or __bold__
    // 2. *italic* or _italic_
    // 3. `code`
    // 4. [HH:MM:SS] or [MM:SS] timestamps
    const regex = /(\*\*|__)(.*?)\1|(\*|_)(.*?)\3|`([^`]+)`|\[(\d{1,2}:)?(\d{1,2}):(\d{1,2})\]/g;
    
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      if (match[1]) {
        // Bold
        parts.push(<strong key={`b-${parts.length}`} className="font-semibold">{match[2]}</strong>);
      } else if (match[3]) {
        // Italic
        parts.push(<em key={`i-${parts.length}`} className="italic">{match[4]}</em>);
      } else if (match[5]) {
        // Code
        parts.push(
          <code key={`c-${parts.length}`} className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600 dark:text-pink-400">
            {match[5]}
          </code>
        );
      } else if (match[7] && match[8]) {
        // Timestamp [HH:MM:SS] or [MM:SS]
        // match[6] exists if HH: is present
        const h = match[6] ? parseInt(match[6].replace(':', ''), 10) : 0;
        const m = parseInt(match[7], 10);
        const s = parseInt(match[8], 10);
        const totalSeconds = (h * 3600) + (m * 60) + s;
        const timeStr = match[0]; // the original [MM:SS] string
        
        parts.push(
          <button
            key={`ts-${parts.length}`}
            onClick={() => onTimestampClick?.(totalSeconds)}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-xs font-medium border border-blue-200 dark:border-blue-800 mx-0.5"
            title={`Jump to ${timeStr}`}
          >
            {timeStr}
          </button>
        );
      }
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) parts.push(text.substring(lastIndex));
    return parts.length > 0 ? parts : [text];
  };

  const renderInlineContent = (text: string): React.ReactNode[] => {
    const segments = splitMathSegments(text);
    const parts: React.ReactNode[] = [];
    segments.forEach((seg, idx) => {
      if (seg.type === 'math') {
        const el = seg.block ? (
          <div key={`math-b-${idx}`} className="my-2 flex justify-center max-h-[12rem] overflow-auto overflow-x-auto">
            {renderMath(seg.content, true)}
          </div>
        ) : (
          <span key={`math-i-${idx}`} className="mx-1">
            {renderMath(seg.content, false)}
          </span>
        );
        parts.push(el);
      } else {
        const formatted = renderTextFormatting(seg.content);
        if (Array.isArray(formatted)) {
          formatted.forEach((node, i) => parts.push(<React.Fragment key={`t-${idx}-${i}`}>{node}</React.Fragment>));
        } else {
          parts.push(<React.Fragment key={`t-${idx}`}>{formatted}</React.Fragment>);
        }
      }
    });
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

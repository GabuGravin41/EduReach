/**
 * Renders markdown with LaTeX math ($...$, $$...$$) and inline images.
 * Images stored in Django media are resolved via the `images` prop —
 * a map of { filename → absolute_url } built from the question's images array.
 */
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface QuestionImage {
  id: number;
  filename: string;
  image_url: string | null;
}

interface Props {
  children: string;
  images?: QuestionImage[];
  className?: string;
}

export default function MathMarkdown({ children, images = [], className = '' }: Props) {
  // Build filename → url lookup
  const imageMap: Record<string, string> = {};
  for (const img of images) {
    if (img.filename && img.image_url) {
      imageMap[img.filename] = img.image_url;
    }
  }

  // react-markdown v8+ dropped the className prop — wrap in a div instead
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none overflow-x-auto ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          img({ src, alt }) {
            const resolvedSrc = (src && imageMap[src]) ? imageMap[src] : src;
            return (
              <img
                src={resolvedSrc}
                alt={alt ?? ''}
                className="my-3 max-w-full rounded border border-slate-200 dark:border-slate-700"
              />
            );
          },
          p({ children: pChildren }) {
            return <p className="my-2 leading-relaxed">{pChildren}</p>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

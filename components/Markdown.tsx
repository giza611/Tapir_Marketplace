import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders contributor-authored markdown from a listing's README.md.
 *
 * SECURITY: `rehype-raw` is deliberately absent. Without it, react-markdown
 * escapes embedded HTML instead of rendering it, so a README cannot inject a
 * <script>, an <iframe>, or an onerror handler. This content arrives via pull
 * requests from strangers — treating it as trusted would hand any contributor
 * script execution on every visitor's browser.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-listing">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Force every outbound link to be safe and clearly external.
          a: ({ href, children: linkChildren }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
              {linkChildren}
            </a>
          ),
          // A README's top-level heading would compete with the listing title,
          // so demote it rather than letting the page have two <h1>s.
          h1: ({ children: headingChildren }) => <h2>{headingChildren}</h2>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

import ReactMarkdown from 'react-markdown';

import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { Container } from '@/components/ui/container';

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  content: string;
  /**
   * When true, the page shows a "draft — under review" banner. Flip to false
   * once the lawyer signs off and the `[CONFIRM]` items are filled in.
   * Defaults to true.
   */
  draft?: boolean;
}

/** Brand-styled legal page — header, title, "Last updated", markdown body, footer. */
export function LegalPage({ title, lastUpdated, content, draft = true }: LegalPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="bg-cream py-12 md:py-16">
        <Container className="max-w-3xl">
          {draft && (
            <div
              role="note"
              className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <strong className="font-semibold">Draft.</strong> This page is under review. Items
              marked{' '}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
                [CONFIRM]
              </code>{' '}
              are placeholders awaiting confirmation by the owner; a lawyer is reviewing the
              wording.
            </div>
          )}
          <h1 className="font-display text-3xl font-semibold text-forest-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-stone">Last updated: {lastUpdated}</p>
          <div className="mt-8 pb-4">
            <ReactMarkdown
              components={{
                // Document titles come from the page metadata, not the markdown.
                h1: () => null,
                h2: ({ node: _node, ...props }) => (
                  <h2
                    className="mt-10 font-display text-2xl font-semibold text-forest-900"
                    {...props}
                  />
                ),
                h3: ({ node: _node, ...props }) => (
                  <h3
                    className="mt-6 font-display text-lg font-semibold text-forest-900"
                    {...props}
                  />
                ),
                p: ({ node: _node, ...props }) => (
                  <p className="mt-4 leading-relaxed text-stone" {...props} />
                ),
                ul: ({ node: _node, ...props }) => (
                  <ul
                    className="mt-3 ml-5 list-disc space-y-1.5 leading-relaxed text-stone"
                    {...props}
                  />
                ),
                ol: ({ node: _node, ...props }) => (
                  <ol
                    className="mt-3 ml-5 list-decimal space-y-1.5 leading-relaxed text-stone"
                    {...props}
                  />
                ),
                li: ({ node: _node, ...props }) => <li {...props} />,
                a: ({ node: _node, ...props }) => (
                  <a
                    className="text-forest-700 underline underline-offset-2 hover:text-forest-800"
                    {...props}
                  />
                ),
                strong: ({ node: _node, ...props }) => (
                  <strong className="font-semibold text-forest-900" {...props} />
                ),
                em: ({ node: _node, ...props }) => <em {...props} />,
                hr: () => <hr className="my-10 border-forest-100" />,
                code: ({ node: _node, ...props }) => (
                  <code
                    className="rounded bg-forest-50 px-1 py-0.5 font-mono text-sm text-forest-900"
                    {...props}
                  />
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}

import { Fragment } from 'react';
import { highlightSegments } from '../lib/search';

interface Props {
  text: string | null | undefined;
  /** Current search query — empty renders `text` plainly. */
  query: string;
}

/**
 * Renders `text`, wrapping the substrings that match `query` in a <mark>.
 * A safe drop-in replacement for raw text: with an empty query it renders the
 * text unchanged, with empty text it renders nothing.
 */
export function Highlight({ text, query }: Props) {
  const segments = highlightSegments(text ?? '', query);
  return (
    <>
      {segments.map((seg, i) =>
        seg.match ? (
          <mark key={i} className="bg-accent/40 text-white rounded-[3px] px-[1px]">
            {seg.text}
          </mark>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </>
  );
}

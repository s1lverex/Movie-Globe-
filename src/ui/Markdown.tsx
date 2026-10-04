import { Fragment, type ReactNode } from 'react';

/** Minimal, safe Markdown renderer (headings, lists, links, bold, paragraphs) – no innerHTML. */
function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const href = /^https?:\/\//.test(m[2]) ? m[2] : '#';
      out.push(
        <a
          key={`${key}-${i++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#9CC2FF] underline-offset-2 hover:underline"
        >
          {m[1]}
        </a>,
      );
    } else if (m[3])
      out.push(
        <strong key={`${key}-${i++}`} className="text-white">
          {m[3]}
        </strong>,
      );
    else if (m[4])
      out.push(
        <code key={`${key}-${i++}`} className="rounded bg-white/10 px-1">
          {m[4]}
        </code>,
      );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r/g, '').split('\n');
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      const items = list;
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="ml-5 list-disc space-y-1">
          {items.map((t, i) => (
            <li key={i}>{inline(t, `li-${blocks.length}-${i}`)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((line, idx) => {
    const h = /^(#{1,3})\s+(.*)/.exec(line);
    const li = /^\s*[-*]\s+(.*)/.exec(line);
    if (h) {
      flush();
      const cls =
        h[1].length === 1
          ? 'text-xl font-bold text-white'
          : h[1].length === 2
            ? 'mt-4 text-lg font-semibold text-white'
            : 'mt-3 font-semibold text-slate-100';
      blocks.push(
        <div key={idx} role="heading" aria-level={h[1].length + 1} className={cls}>
          {inline(h[2], `h-${idx}`)}
        </div>,
      );
    } else if (li) list.push(li[1]);
    else if (line.trim() === '') flush();
    else {
      flush();
      blocks.push(<p key={idx}>{inline(line, `p-${idx}`)}</p>);
    }
  });
  flush();
  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-300">
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  );
}

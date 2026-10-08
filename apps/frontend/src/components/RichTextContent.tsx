import { imageUrl } from '@/lib/image-url';
import { Fragment, type ReactNode } from 'react';

type RichTextContentProps = {
  content: string;
  className?: string;
};

const specialBlock = /^(#{1,3}\s|>\s?|[-*]\s|\d+\.\s|!\[[^\]]*\]\(https?:\/\/[^)\s]+\))/;

function inlineContent(text: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|_[^_\n]+_|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  const result: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text))) {
    if (match.index > cursor) result.push(text.slice(cursor, match.index));
    const token = match[0];
    const key = `${match.index}-${token}`;
    if (token.startsWith('**')) {
      result.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('_')) {
      result.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (link) {
        result.push(
          <a key={key} href={link[2]} target="_blank" rel="noopener noreferrer">
            {link[1]}
          </a>,
        );
      }
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) result.push(text.slice(cursor));
  return result;
}

export function RichTextContent({ content, className = '' }: RichTextContentProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) {
      index += 1;
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/);
    if (image) {
      blocks.push(
        <figure key={`image-${index}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(image[2], 'hero')} alt={image[1] || 'Ảnh bài viết'} loading="lazy" />
          {image[1] && <figcaption>{image[1]}</figcaption>}
        </figure>,
      );
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const children = inlineContent(heading[2]);
      const key = `heading-${index}`;
      blocks.push(heading[1].length === 1
        ? <h1 key={key}>{children}</h1>
        : heading[1].length === 2
          ? <h2 key={key}>{children}</h2>
          : <h3 key={key}>{children}</h3>);
      index += 1;
      continue;
    }

    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quote.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`}>{inlineContent(quote.join(' '))}</blockquote>);
      continue;
    }

    if (/^[-*]\s/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^[-*]\s/.test(lines[index].trim())) {
        items.push(<li key={index}>{inlineContent(lines[index].trim().replace(/^[-*]\s+/, ''))}</li>);
        index += 1;
      }
      blocks.push(<ul key={`ul-${index}`}>{items}</ul>);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      const items: ReactNode[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index].trim())) {
        items.push(<li key={index}>{inlineContent(lines[index].trim().replace(/^\d+\.\s+/, ''))}</li>);
        index += 1;
      }
      blocks.push(<ol key={`ol-${index}`}>{items}</ol>);
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !specialBlock.test(lines[index].trim())) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(
      <p key={`paragraph-${index}`}>
        {paragraph.map((part, partIndex) => (
          <Fragment key={`${index}-${partIndex}`}>
            {partIndex > 0 && ' '}
            {inlineContent(part)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className={`rich-text-content ${className}`}>{blocks}</div>;
}

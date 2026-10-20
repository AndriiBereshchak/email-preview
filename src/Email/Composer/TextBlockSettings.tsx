import { useState } from 'react';
import type { EmailBlock, EmailBlockContent } from '../../utils/emailDocument';
import { letterLinkUrl } from '../../utils/letterLink';
import AppearanceColor from './AppearanceColor';
import { Field } from '../Field';
import e from './emailBuilder.module.css';

type TextBlock = Extract<EmailBlock, { type: 'text' }>;
type TextContent = Extract<EmailBlockContent, { type: 'text' }>;
export default function TextBlockSettings({
  mode,
  block,
  content,
  selection,
  textColor,
  onStyle,
  onContent,
}: {
  mode: 'style' | 'link';
  block: TextBlock;
  content: TextContent;
  selection: { start: number; end: number } | null;
  textColor: string;
  onStyle: (changes: Partial<TextBlock>) => void;
  onContent: (content: TextContent) => void;
}) {
  const selectedLink = content.links?.find(
    (link) =>
      selection && link.start < selection.end && link.end > selection.start,
  );
  const [url, setUrl] = useState(selectedLink?.href ?? '');
  const [error, setError] = useState('');
  const replaceLink = (href?: string) => {
    if (!selection || selection.start === selection.end) return;
    const links = (content.links ?? []).filter(
      (link) => link.end <= selection.start || link.start >= selection.end,
    );
    if (href) links.push({ ...selection, href });
    onContent({ ...content, links });
  };
  return (
    <div className={e.fields}>
      {mode === 'style' ? (
        <>
          <Field label="Вид текста">
            <select
              className="custom-input"
              value={block.variant ?? 'body'}
              onChange={(event) =>
                onStyle({ variant: event.target.value as TextBlock['variant'] })
              }
            >
              <option value="body">Обычный текст</option>
              <option value="heading">Заголовок</option>
            </select>
          </Field>
          <AppearanceColor
            label="Цвет букв"
            value={block.color ?? textColor}
            onChange={(color) => onStyle({ color })}
          />
        </>
      ) : selection && selection.end > selection.start ? (
        <>
          <p className={e.hint}>
            Ссылка для: «{content.text.slice(selection.start, selection.end)}»
          </p>
          <Field label="Адрес ссылки в тексте">
            <input
              className="custom-input"
              type="url"
              value={url}
              placeholder="https://…"
              onChange={(event) => {
                setUrl(event.target.value);
                setError('');
              }}
            />
          </Field>
          <button
            type="button"
            className={e.addColumn}
            onClick={() => {
              const href = letterLinkUrl(url);
              if (!href) {
                setError('Укажите полный адрес http://, https:// или mailto:.');
                return;
              }
              replaceLink(href);
            }}
          >
            Применить ссылку
          </button>
          {selectedLink && (
            <button
              type="button"
              className={e.addColumn}
              onClick={() => {
                replaceLink();
                setUrl('');
              }}
            >
              Убрать ссылку
            </button>
          )}
          {error && (
            <p className={e.error} role="alert">
              {error}
            </p>
          )}
        </>
      ) : (
        <p className={e.hint}>
          Чтобы добавить ссылку, выделите нужные слова в блоке и нажмите значок
          ссылки над ним.
        </p>
      )}
    </div>
  );
}

import { renderEmailDocumentContent } from '../../utils/renderEmailDocument';
import { emptyEmailBlockContent } from '../../utils/emailDocument';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type KeyboardEvent,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type {
  EmailBlock,
  EmailBlockContent,
  EmailDocument,
} from '../../utils/emailDocument';
import type { LetterLocale } from '../../utils/localModel';
import { readAppearanceImage } from '../../utils/appearanceImage';
import { backgroundImageStyle } from '../../utils/appearanceModel';
import { Field } from '../Field';
import e from './emailBuilder.module.css';

type ChangeDocument = Dispatch<SetStateAction<EmailDocument>>;
const labels = { text: 'Текст', image: 'Картинка', button: 'Кнопка' };
function removeContent(
  document: EmailDocument,
  ids: string[],
): EmailDocument['versions'] {
  return Object.fromEntries(
    Object.entries(document.versions).map(([locale, version]) => {
      const blocks = { ...version!.blocks };
      ids.forEach((id) => delete blocks[id]);
      return [locale, { ...version!, blocks }];
    }),
  );
}

function BlockFields({
  content,
  onChange,
}: {
  content: EmailBlockContent;
  onChange: (value: EmailBlockContent) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  const upload = async (file?: File) => {
    if (!file || content.type !== 'image') return;

    const id = ++request.current;
    const update = onChange;
    setBusy(true);
    setError('');
    try {
      const src = await readAppearanceImage(file);
      if (id === request.current) update({ ...content, src });
    } catch (failure) {
      if (id === request.current)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Не удалось загрузить картинку',
        );
    } finally {
      if (id === request.current) setBusy(false);
    }
  };
  if (content.type === 'text')
    return (
      <textarea
        className={e.textInput}
        aria-label="Текст блока"
        placeholder="Напишите текст письма…"
        rows={4}
        value={content.text}
        onChange={(event) => onChange({ ...content, text: event.target.value })}
      />
    );
  if (content.type === 'button')
    return (
      <div className={e.fields}>
        <Field label="Текст кнопки">
          <input
            className="custom-input"
            value={content.text}
            placeholder="Например, Подробнее"
            onChange={(event) =>
              onChange({ ...content, text: event.target.value })
            }
          />
        </Field>
        <Field label="Ссылка">
          <input
            className="custom-input"
            type="url"
            value={content.href}
            placeholder="https://…"
            onChange={(event) =>
              onChange({ ...content, href: event.target.value })
            }
          />
        </Field>
      </div>
    );
  return (
    <div className={e.fields}>
      <label className={e.upload}>
        {busy
          ? 'Загружаем…'
          : content.src
            ? 'Заменить картинку'
            : 'Загрузить картинку'}
        <input
          type="file"
          aria-label="Картинка для блока"
          disabled={busy}
          accept=".png,.jpg,.jpeg,.gif,.webp"
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </label>
      {content.src && (
        <Field label="Описание картинки">
          <input
            className="custom-input"
            disabled={busy}
            value={content.alt}
            placeholder="Что изображено на картинке"
            onChange={(event) =>
              onChange({ ...content, alt: event.target.value })
            }
          />
        </Field>
      )}
      <span className={e.hint}>PNG, JPEG, GIF или WebP до 15 МБ.</span>
      {error && (
        <p className={e.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function EmailBuilder({
  document,
  locale,
  onChange,
}: {
  document: EmailDocument;
  locale: LetterLocale;
  onChange: ChangeDocument;
}) {
  const [selection, setSelection] = useState<{
    columnId: string;
    blockId?: string;
  } | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    panelTop: number;
    panelLeft: number;
  } | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const html = useMemo(
    () => renderEmailDocumentContent(document, locale, { editor: true }).html,
    [document, locale],
  );
  const locations = document.sections.flatMap((section) =>
    section.columns.map((column) => ({ section, column })),
  );
  const target =
    locations.find((item) => item.column.id === selection?.columnId) ??
    locations.at(-1);
  const selectedBlock = target?.column.blocks.find(
    (block) => block.id === selection?.blockId,
  );
  const selectedContent = selectedBlock
    ? (document.versions[locale]?.blocks[selectedBlock.id] ??
      emptyEmailBlockContent(selectedBlock.type))
    : undefined;
  const closeSettings = () => {
    setColumnsOpen(false);
    setSelection((current) =>
      current ? { columnId: current.columnId } : null,
    );
  };

  useLayoutEffect(() => {
    const measure = () => {
      if (!surface.current || !canvas.current || !selection) return;
      const host = surface.current.getBoundingClientRect();
      if (!host.width) return;
      const attribute =
        selectedBlock && !columnsOpen ? 'data-block-id' : 'data-column-id';
      const id =
        selectedBlock && !columnsOpen ? selectedBlock.id : selection.columnId;
      const cell = Array.from(
        canvas.current.querySelectorAll<HTMLElement>(`[${attribute}]`),
      ).find((node) => node.getAttribute(attribute) === id);
      if (!cell) return;
      const node =
        attribute === 'data-block-id'
          ? (cell.querySelector<HTMLElement>('img') ??
            cell.querySelector<HTMLElement>('a,p,h2,span') ??
            cell)
          : cell;
      const bounds = node.getBoundingClientRect();
      const left = bounds.left - host.left;
      const top = bounds.top - host.top;
      const fitsRight = left + bounds.width + 272 <= host.width;
      setPosition({
        top,
        left,
        width: Math.max(24, bounds.width),
        height: Math.max(24, bounds.height),
        panelLeft: fitsRight
          ? left + bounds.width + 16
          : Math.max(0, Math.min(left, host.width - 256)),
        panelTop: fitsRight ? Math.max(0, top) : top + bounds.height + 16,
      });
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    if (surface.current) observer?.observe(surface.current);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [html, selection, columnsOpen, selectedBlock?.id]);

  useEffect(() => {
    if (selectedBlock && !columnsOpen)
      popover.current
        ?.querySelector<HTMLElement>('textarea,input:not([type="file"])')
        ?.focus();
  }, [selectedBlock?.id, columnsOpen]);

  const selectFromCanvas = (
    event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>,
  ) => {
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return;
    const node = event.target as HTMLElement;
    const column = node.closest<HTMLElement>('[data-column-id]');
    if (!column || !canvas.current?.contains(column)) return;
    event.preventDefault();
    const block = node.closest<HTMLElement>('[data-block-id]');
    setSelection({
      columnId: column.dataset.columnId!,
      blockId: block?.dataset.blockId,
    });
    setColumnsOpen(false);
  };

  const addSection = () => {
    setColumnsOpen(false);
    const sectionId = crypto.randomUUID();
    const columnId = crypto.randomUUID();
    setSelection({ columnId });
    onChange((current) => ({
      ...current,
      sections: [
        ...current.sections,
        { id: sectionId, columns: [{ id: columnId, blocks: [] }] },
      ],
    }));
  };
  const addColumn = (sectionId: string) => {
    const id = crypto.randomUUID();
    setSelection({ columnId: id });
    onChange((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === sectionId
          ? { ...section, columns: [...section.columns, { id, blocks: [] }] }
          : section,
      ),
    }));
  };
  const addBlock = (type: EmailBlock['type']) => {
    const id = crypto.randomUUID();
    const columnId = target?.column.id ?? crypto.randomUUID();
    const sectionId = crypto.randomUUID();
    setSelection({ columnId, blockId: id });
    setColumnsOpen(false);
    onChange((current) => ({
      ...current,
      sections: target
        ? current.sections.map((section) => ({
            ...section,
            columns: section.columns.map((column) =>
              column.id === columnId
                ? { ...column, blocks: [...column.blocks, { id, type }] }
                : column,
            ),
          }))
        : [
            {
              id: sectionId,
              columns: [{ id: columnId, blocks: [{ id, type }] }],
            },
          ],
    }));
  };
  const updateContent = (
    id: string,
    language: LetterLocale,
    content: EmailBlockContent,
  ) => {
    onChange((current) => {
      const version = current.versions[language];
      const exists = current.sections.some((section) =>
        section.columns.some((column) =>
          column.blocks.some((block) => block.id === id),
        ),
      );
      if (!version || !exists) return current;
      return {
        ...current,
        versions: {
          ...current.versions,
          [language]: {
            ...version,
            blocks: { ...version.blocks, [id]: content },
          },
        },
      };
    });
  };
  const confirmRemoval = (ids: string[], name: string) => {
    const filled = Object.values(document.versions).some((version) =>
      ids.some((id) => {
        const content = version?.blocks[id];
        return (
          content &&
          (content.type === 'image'
            ? Boolean(content.src)
            : Boolean(content.text.trim()))
        );
      }),
    );
    return (
      !filled ||
      window.confirm(
        `Удалить ${name} со всем содержимым во всех языковых версиях?`,
      )
    );
  };
  const deleteSection = (id: string) => {
    const section = document.sections.find((section) => section.id === id)!;
    const ids = section.columns.flatMap((column) =>
      column.blocks.map((block) => block.id),
    );
    if (!confirmRemoval(ids, 'эту секцию')) return;
    setSelection(null);
    setColumnsOpen(false);
    onChange((current) => ({
      ...current,
      sections: current.sections.filter((section) => section.id !== id),
      versions: removeContent(current, ids),
    }));
  };
  const deleteColumn = (id: string) => {
    const owner = document.sections.find((section) =>
      section.columns.some((column) => column.id === id),
    )!;
    const column = owner.columns.find((column) => column.id === id)!;
    const ids = column.blocks.map((block) => block.id);
    if (!confirmRemoval(ids, 'эту колонку')) return;
    setSelection({
      columnId: owner.columns.find((column) => column.id !== id)!.id,
    });
    onChange((current) => ({
      ...current,
      sections: current.sections.map((section) => ({
        ...section,
        columns: section.columns.filter((column) => column.id !== id),
      })),
      versions: removeContent(current, ids),
    }));
  };
  const deleteBlock = (id: string) => {
    if (!confirmRemoval([id], 'этот блок')) return;
    closeSettings();
    onChange((current) => ({
      ...current,
      sections: current.sections.map((section) => ({
        ...section,
        columns: section.columns.map((column) => ({
          ...column,
          blocks: column.blocks.filter((block) => block.id !== id),
        })),
      })),
      versions: removeContent(current, [id]),
    }));
  };
  return (
    <div
      className={e.builder}
      onKeyDown={(event) => {
        if (event.key === 'Escape') closeSettings();
      }}
    >
      <div className={e.toolbar} role="toolbar" aria-label="Добавить в письмо">
        <button type="button" onClick={() => addBlock('text')}>
          <span aria-hidden="true">T</span>Текст
        </button>
        <button type="button" onClick={() => addBlock('image')}>
          <span aria-hidden="true">▧</span>Картинка
        </button>
        <button type="button" onClick={() => addBlock('button')}>
          <span aria-hidden="true">↗</span>Кнопка
        </button>
        <span className={e.divider} />
        <button type="button" onClick={addSection}>
          + Секция
        </button>
        <button
          type="button"
          disabled={!target}
          aria-expanded={columnsOpen}
          onClick={() => {
            if (target) setSelection({ columnId: target.column.id });
            setColumnsOpen((open) => !open);
          }}
        >
          <span aria-hidden="true">▥</span>Колонки
        </button>
      </div>
      <div
        ref={surface}
        className={e.surface}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) {
            setSelection(null);
            setColumnsOpen(false);
          }
        }}
      >
        <div
          className={e.paper}
          style={{
            width: document.appearance.width,
            padding: document.appearance.padding,
            backgroundColor: document.appearance.background,
            color: document.appearance.textColor,
            fontFamily: `${document.appearance.fontFamily}, sans-serif`,
            fontSize: document.appearance.fontSize,
            lineHeight: document.appearance.lineHeight,
            ...backgroundImageStyle(document.appearance.backgroundImage),
          }}
        >
          {!document.sections.length ? (
            <div className={e.empty}>
              <span aria-hidden="true">＋</span>
              <h4>Начните с текста или картинки</h4>
              <p>Выберите элемент на панели сверху — он появится в письме.</p>
            </div>
          ) : (
            <div
              ref={canvas}
              className={e.canvas}
              onClick={selectFromCanvas}
              onKeyDown={selectFromCanvas}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
        {selection && position && (
          <div
            aria-hidden="true"
            className={e.selection}
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              height: position.height,
            }}
          />
        )}
        {(selectedBlock || columnsOpen) && target && (
          <div
            ref={popover}
            className={e.popover}
            role="dialog"
            aria-label={
              columnsOpen
                ? 'Колонки секции'
                : `Настройки блока ${labels[selectedBlock!.type].toLowerCase()}`
            }
            style={{
              top: position?.panelTop ?? 16,
              left: position?.panelLeft ?? 16,
            }}
          >
            <div className={e.popoverHead}>
              <strong>
                {columnsOpen ? 'Колонки' : labels[selectedBlock!.type]}
              </strong>
              <button
                type="button"
                aria-label="Закрыть настройки"
                onClick={closeSettings}
              >
                ×
              </button>
            </div>
            {columnsOpen ? (
              <div className={e.columnSettings}>
                {target.section.columns.map((column, index) => (
                  <div className={e.columnRow} key={column.id}>
                    <button
                      type="button"
                      aria-pressed={column.id === target.column.id}
                      onClick={() => setSelection({ columnId: column.id })}
                    >
                      Колонка {index + 1}
                    </button>
                    {target.section.columns.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Удалить колонку ${index + 1}`}
                        onClick={() => deleteColumn(column.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  className={e.addColumn}
                  onClick={() => addColumn(target.section.id)}
                >
                  + Колонка
                </button>
                <button
                  type="button"
                  className={e.removeSection}
                  onClick={() => deleteSection(target.section.id)}
                >
                  Удалить секцию
                </button>
              </div>
            ) : (
              <>
                <BlockFields
                  content={selectedContent!}
                  onChange={(value) =>
                    updateContent(selectedBlock!.id, locale, value)
                  }
                />
                <button
                  type="button"
                  className={e.removeBlockInPanel}
                  aria-label={`Удалить блок ${labels[selectedBlock!.type].toLowerCase()}`}
                  onClick={() => deleteBlock(selectedBlock!.id)}
                >
                  Удалить блок
                </button>
              </>
            )}
          </div>
        )}
        <button type="button" className={e.addSection} onClick={addSection}>
          + Добавить секцию
        </button>
      </div>
    </div>
  );
}

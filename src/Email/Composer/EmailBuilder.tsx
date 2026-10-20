import { renderEmailDocumentContent } from '../../utils/renderEmailDocument';
import {
  emailBlockContent,
  emailDefaultLocale,
  emptyEmailBlockContent,
} from '../../utils/emailDocument';
import {
  placeEmailBlockBeside,
  type EmailBlockFreeSpace,
  updateEmailBlock,
} from '../../utils/emailDocumentLayout';
import {
  useCallback,
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
  EmailSection,
} from '../../utils/emailDocument';
import type { LetterLocale } from '../../utils/localModel';
import { useImageUpload } from '../../hooks/useImageUpload';
import { backgroundImageStyle } from '../../utils/appearanceModel';
import EmailCanvasControls from './EmailCanvasControls';
import AppearanceColor from './AppearanceColor';
import TextBlockSettings from './TextBlockSettings';
import {
  emailTextHtml,
  isEmailTextBold,
  readEmailText,
  selectEmailText,
  toggleEmailTextBold,
} from '../../utils/emailText';
import AppearanceBackgroundImage from './AppearanceBackgroundImage';
import {
  Image as ImageIcon,
  Info,
  MousePointer2,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { Field } from '../Field';
import CustomModal from '../../parts/CustomModal/CustomModal';
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
  inherited = false,
  onResetImage,
  onChange,
}: {
  content: EmailBlockContent;
  inherited?: boolean;
  onResetImage?: () => void;
  onChange: (value: EmailBlockContent) => void;
}) {
  const {
    loading: busy,
    error,
    upload,
  } = useImageUpload((src) => {
    if (content.type === 'image') onChange({ ...content, src });
  }, true);
  if (content.type === 'text') return null;
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
        <Upload
          size={16}
          strokeWidth={1.7}
          aria-hidden="true"
          focusable="false"
        />
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
      {inherited && (
        <p className={e.fieldHint}>
          Картинка из основной версии. Замена изменит только эту версию.
        </p>
      )}
      {onResetImage && (
        <button
          type="button"
          className={e.addColumn}
          disabled={busy}
          onClick={onResetImage}
        >
          Использовать картинку основной версии
        </button>
      )}
      {content.src && (
        <Field label="Описание картинки">
          <input
            className="custom-input"
            disabled={busy}
            value={content.alt}
            placeholder="Что изображено на картинке"
            onChange={(event) =>
              onChange({
                ...content,
                src: inherited ? '' : content.src,
                alt: event.target.value,
              })
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
  const [textSettingsOpen, setTextSettingsOpen] = useState<
    'style' | 'link' | null
  >(null);
  const [textSelection, setTextSelection] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [manipulating, setManipulating] = useState(false);
  const [removal, setRemoval] = useState<{
    name: string;
    contentName: string;
    confirm: () => void;
  } | null>(null);
  const [insertion, setInsertion] = useState<{
    columnId: string;
    beforeId?: string;
    beside?: {
      anchorId: string;
      side: 'left' | 'right';
      anchorWidthPercent?: number;
      freeSpace?: EmailBlockFreeSpace;
    };
    top: number;
    left: number;
  } | null>(null);
  const insertionMenu = useRef<HTMLDivElement>(null);
  const insertionTrigger = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const surface = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const editingText = useRef<HTMLElement | null>(null);
  const renderedLocale = useRef(locale);
  const html = useMemo(
    () => renderEmailDocumentContent(document, locale, { editor: true }).html,
    [
      document.sections,
      document.appearance,
      document.versions[locale],
      document.versions[emailDefaultLocale(document)],
      document.defaultLocale,
      locale,
    ],
  );
  const locations = document.sections.flatMap((section) =>
    section.columns.map((column) => ({ section, column })),
  );
  const target = locations.find(
    (item) => item.column.id === selection?.columnId,
  );
  const selectedBlock = target?.column.blocks.find(
    (block) => block.id === selection?.blockId,
  );
  const selectedContent = selectedBlock
    ? (emailBlockContent(document, locale, selectedBlock) ??
      emptyEmailBlockContent(selectedBlock.type))
    : undefined;
  const ownContent = selectedBlock
    ? document.versions[locale]?.blocks[selectedBlock.id]
    : undefined;
  const baseContent = selectedBlock
    ? document.versions[emailDefaultLocale(document)]?.blocks[selectedBlock.id]
    : undefined;
  const inheritedImage =
    selectedContent?.type === 'image' &&
    !!selectedContent.src &&
    !(ownContent?.type === 'image' && ownContent.src);
  const canResetImage =
    locale !== emailDefaultLocale(document) &&
    ownContent?.type === 'image' &&
    !!ownContent.src &&
    baseContent?.type === 'image' &&
    !!baseContent.src;
  const settingsVisible = Boolean(
    !insertion &&
    target &&
    (columnsOpen ||
      (selectedBlock && (selectedBlock.type !== 'text' || textSettingsOpen))),
  );
  const updateSection = (changes: Partial<EmailSection>) => {
    if (!target) return;
    const id = target.section.id;
    onChange((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === id ? { ...section, ...changes } : section,
      ),
    }));
  };
  const updateButtonStyle = (
    changes: Partial<Extract<EmailBlock, { type: 'button' }>>,
  ) => {
    if (selectedBlock?.type !== 'button') return;
    onChange((current) =>
      updateEmailBlock(current, selectedBlock.id, (block) =>
        block.type === 'button' ? { ...block, ...changes } : block,
      ),
    );
  };
  const closePanels = useCallback(() => {
    setInsertion(null);
    setColumnsOpen(false);
    setTextSettingsOpen(null);
  }, []);
  const closeSettings = () => {
    if (insertion) insertionTrigger.current?.focus();
    closePanels();
    setSelection((current) =>
      current ? { columnId: current.columnId } : null,
    );
  };

  useEffect(() => {
    if (!selection && !insertion && !columnsOpen) return;
    const dismiss = (event: PointerEvent) => {
      const node = event.target;
      if (!(node instanceof Element) || node.closest('dialog')) return;
      const content = node
        .closest('[data-block-id]')
        ?.querySelector<HTMLElement>(
          'img, [data-email-button], [data-email-text]',
        );
      const bounds = content?.getBoundingClientRect();
      const insideBlock =
        canvas.current?.contains(node) &&
        (node.closest('img, [data-email-button], [data-email-text]') ||
          (bounds &&
            event.clientX >= bounds.left &&
            event.clientX <= bounds.right &&
            event.clientY >= bounds.top &&
            event.clientY <= bounds.bottom));
      if (
        popover.current?.contains(node) ||
        insertionMenu.current?.contains(node) ||
        insideBlock ||
        node.closest(`.${e.canvasControls}, .${e.addSection}`)
      )
        return;
      closePanels();
      setSelection(null);
      setTextSelection(null);
      const active = window.document.activeElement;
      if (active instanceof HTMLElement && canvas.current?.contains(active))
        active.blur();
    };
    window.document.addEventListener('pointerdown', dismiss, true);
    return () =>
      window.document.removeEventListener('pointerdown', dismiss, true);
  }, [insertion, columnsOpen, selection, closePanels]);

  useLayoutEffect(() => {
    const editingId =
      editingText.current?.closest<HTMLElement>('[data-block-id]')?.dataset
        .blockId;
    const stillExists = document.sections.some((section) =>
      section.columns.some((column) =>
        column.blocks.some((block) => block.id === editingId),
      ),
    );
    if (
      stillExists &&
      editingText.current &&
      canvas.current?.contains(editingText.current) &&
      renderedLocale.current === locale
    )
      return;
    editingText.current = null;
    renderedLocale.current = locale;
    if (canvas.current) canvas.current.innerHTML = html;
  }, [html, locale]);

  useLayoutEffect(() => {
    canvas.current
      ?.querySelectorAll<HTMLElement>('[data-block-id]')
      .forEach((cell) => {
        cell.toggleAttribute(
          'data-selected',
          !columnsOpen && cell.dataset.blockId === selectedBlock?.id,
        );
      });
  }, [html, locale, selectedBlock?.id, columnsOpen]);

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
      setPosition({
        top,
        left,
        width: Math.max(24, bounds.width),
        height: Math.max(24, bounds.height),
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
  }, [html, selection, columnsOpen, selectedBlock?.id, settingsVisible]);

  useEffect(() => {
    if (selectedBlock?.type === 'text' && !columnsOpen && !textSettingsOpen) {
      const cell = Array.from(
        canvas.current?.querySelectorAll<HTMLElement>('[data-block-id]') ?? [],
      ).find((node) => node.dataset.blockId === selectedBlock.id);
      cell
        ?.querySelector<HTMLElement>('[data-email-text]')
        ?.focus({ preventScroll: true });
    } else if (selectedBlock && selectedBlock.type !== 'text' && !columnsOpen)
      popover.current
        ?.querySelector<HTMLElement>(
          'input[type="text"],input:not([type]),input[type="url"]',
        )
        ?.focus();
  }, [selectedBlock?.id, columnsOpen, locale, textSettingsOpen]);

  useEffect(() => {
    if (insertion)
      insertionMenu.current
        ?.querySelector<HTMLButtonElement>('button[data-block-type]')
        ?.focus();
  }, [insertion]);

  const selectFromCanvas = (
    event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>,
  ) => {
    const node = event.target as HTMLElement;
    if ('key' in event && node.closest('[data-email-text]')) return;
    if ('key' in event && event.key !== 'Enter' && event.key !== ' ') return;
    const column = node.closest<HTMLElement>('[data-column-id]');
    if (!column || !canvas.current?.contains(column)) return;
    setTextSettingsOpen(null);
    if (!node.closest('[data-email-text]') || node.closest('a'))
      event.preventDefault();
    const add = node.closest<HTMLElement>('[data-add-column-id]');
    if (add && surface.current) {
      const host = surface.current.getBoundingClientRect();
      const rect = add.getBoundingClientRect();
      insertionTrigger.current = add;
      setInsertion({
        columnId: add.dataset.addColumnId!,
        beforeId: add.dataset.beforeBlockId,
        top: rect.bottom - host.top + 8,
        left: Math.max(0, Math.min(rect.left - host.left, host.width - 256)),
      });
      setSelection({ columnId: add.dataset.addColumnId! });
      setColumnsOpen(false);
      return;
    }
    setInsertion(null);
    const block = node.closest<HTMLElement>('[data-block-id]');
    // Pointer clicks in the unused part of a row cell should not reselect its block.
    if (block && 'clientX' in event && event.detail > 0) {
      const content = block.querySelector<HTMLElement>(
        'img, [data-email-button], [data-email-text]',
      );
      const bounds = content?.getBoundingClientRect();
      if (
        bounds &&
        (event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom)
      )
        return;
    }
    if (!node.closest('[data-email-text]'))
      block
        ?.querySelector<HTMLElement>('[data-email-text]')
        ?.focus({ preventScroll: true });
    setSelection({
      columnId: column.dataset.columnId!,
      blockId: block?.dataset.blockId,
    });
    setColumnsOpen(false);
  };

  const addSection = () => {
    closePanels();
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
    setInsertion(null);
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
    if (!insertion) return;
    const { columnId, beforeId } = insertion;
    const id = crypto.randomUUID();
    setSelection({ columnId, blockId: id });
    closePanels();
    onChange((current) =>
      insertion.beside
        ? placeEmailBlockBeside(
            current,
            columnId,
            insertion.beside.anchorId,
            { id, type },
            insertion.beside.side,
            crypto.randomUUID(),
            insertion.beside.anchorWidthPercent,
            insertion.beside.freeSpace,
          )
        : {
            ...current,
            sections: current.sections.map((section) => ({
              ...section,
              columns: section.columns.map((column) => {
                if (column.id !== columnId) return column;
                const index = beforeId
                  ? column.blocks.findIndex((block) => block.id === beforeId)
                  : column.blocks.length;
                if (index < 0) return column;
                const blocks = [...column.blocks];
                blocks.splice(index, 0, { id, type });
                return { ...column, blocks };
              }),
            })),
          },
    );
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
  const selectedText = (expandLink = false) => {
    const editor = Array.from(
      canvas.current?.querySelectorAll<HTMLElement>('[data-email-text]') ?? [],
    ).find(
      (node) =>
        node.closest<HTMLElement>('[data-block-id]')?.dataset.blockId ===
        selectedBlock?.id,
    );
    const selection = window.getSelection();
    const range = selection?.rangeCount
      ? selection.getRangeAt(0).cloneRange()
      : null;
    if (
      !editor ||
      !range ||
      !editor.contains(range.startContainer) ||
      !editor.contains(range.endContainer)
    )
      return null;
    if (expandLink && range.collapsed) {
      const startNode =
        range.startContainer.nodeType === Node.ELEMENT_NODE
          ? (range.startContainer as Element)
          : range.startContainer.parentElement;
      const anchor = startNode?.closest('a');
      if (anchor && editor.contains(anchor)) range.selectNodeContents(anchor);
    }
    const prefix = range.cloneRange();
    prefix.selectNodeContents(editor);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = readEmailText(prefix.cloneContents()).text.length;
    return {
      editor,
      start,
      end: start + readEmailText(range.cloneContents()).text.length,
    };
  };
  const rememberTextSelection = () => {
    const selection = selectedText();
    setTextSelection(
      selection ? { start: selection.start, end: selection.end } : null,
    );
  };
  const openTextSettings = (mode: 'style' | 'link') => {
    if (mode === 'link') {
      const selection = selectedText(true);
      setTextSelection(
        selection ? { start: selection.start, end: selection.end } : null,
      );
    }
    editingText.current = null;
    setTextSettingsOpen(mode);
  };
  const toggleBold = () => {
    const selection = selectedText();
    if (!selection || selection.start === selection.end || !selectedBlock)
      return;
    const { editor, start, end } = selection;
    const content = toggleEmailTextBold(readEmailText(editor), { start, end });
    editor.innerHTML = emailTextHtml(content, document.appearance.linkColor);
    selectEmailText(editor, start, end);
    editingText.current = editor;
    setTextSelection({ start, end });
    updateContent(selectedBlock.id, locale, content);
  };

  const updateInlineText = (node: HTMLElement) => {
    const id = node.closest<HTMLElement>('[data-block-id]')?.dataset.blockId;
    if (!id) return;
    editingText.current = node;
    updateContent(id, locale, readEmailText(node));
  };
  const confirmRemoval = (
    ids: string[],
    name: string,
    contentName: string,
    confirm: () => void,
  ) => {
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
    if (filled) setRemoval({ name, contentName, confirm });
    else confirm();
  };
  const deleteSection = (id: string) => {
    const section = document.sections.find((section) => section.id === id)!;
    const ids = section.columns.flatMap((column) =>
      column.blocks.map((block) => block.id),
    );
    confirmRemoval(ids, 'секцию', 'Секция и её содержимое', () => {
      closePanels();
      setSelection(null);
      onChange((current) => ({
        ...current,
        sections: current.sections.filter((section) => section.id !== id),
        versions: removeContent(current, ids),
      }));
    });
  };
  const deleteColumn = (id: string) => {
    const owner = document.sections.find((section) =>
      section.columns.some((column) => column.id === id),
    )!;
    const column = owner.columns.find((column) => column.id === id)!;
    const ids = column.blocks.map((block) => block.id);
    confirmRemoval(ids, 'колонку', 'Колонка и её содержимое', () => {
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
    });
  };
  const deleteBlock = (id: string) => {
    confirmRemoval([id], 'блок', 'Блок и его содержимое', () => {
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
    });
  };
  return (
    <div
      className={`${e.builder} ${settingsVisible ? e.withSettings : ''}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') closeSettings();
      }}
    >
      <div
        ref={surface}
        className={e.surface}
        data-manipulating={manipulating || undefined}
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
            <button
              type="button"
              className={e.empty}
              onClick={addSection}
              aria-label="+ Добавить секцию"
            >
              <span aria-hidden="true">＋</span>
              <strong>Добавьте первую секцию</strong>
              <span className={e.emptyHelp}>
                Текст, картинки и кнопки можно добавить внутри секции.
              </span>
            </button>
          ) : (
            <div
              ref={canvas}
              className={e.canvas}
              onClick={selectFromCanvas}
              onKeyDown={selectFromCanvas}
              onFocus={(event) => {
                const node = (event.target as HTMLElement).closest<HTMLElement>(
                  '[data-email-text]',
                );
                if (node) {
                  editingText.current = node;
                  node.closest<HTMLElement>('[data-block-id]')!.draggable =
                    false;
                }
              }}
              onSelect={rememberTextSelection}
              onInput={(event) => {
                const node = (event.target as HTMLElement).closest<HTMLElement>(
                  '[data-email-text]',
                );
                if (node) updateInlineText(node);
              }}
              onBlur={(event) => {
                const node = (event.target as HTMLElement).closest<HTMLElement>(
                  '[data-email-text]',
                );
                if (node)
                  node.closest<HTMLElement>('[data-block-id]')!.draggable =
                    true;
                editingText.current = null;
              }}
              onPaste={(event) => {
                const node = (event.target as HTMLElement).closest<HTMLElement>(
                  '[data-email-text]',
                );
                if (!node) return;
                event.preventDefault();
                const selection = window.getSelection();
                if (
                  !selection?.rangeCount ||
                  !node.contains(selection.anchorNode)
                )
                  return;
                const range = selection.getRangeAt(0);
                range.deleteContents();
                const text = window.document.createTextNode(
                  event.clipboardData.getData('text/plain'),
                );
                range.insertNode(text);
                range.setStartAfter(text);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                updateInlineText(node);
              }}
            />
          )}
        </div>
        {selection &&
          position &&
          (selectedBlock || columnsOpen || insertion) && (
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
        <EmailCanvasControls
          document={document}
          settingsOpen={settingsVisible}
          canvas={canvas}
          surface={surface}
          columnId={selection?.columnId}
          blockId={columnsOpen ? undefined : selectedBlock?.id}
          onChange={onChange}
          onOpenSection={(id) => {
            const section = document.sections.find(
              (section) => section.id === id,
            );
            if (!section) return;
            setInsertion(null);
            setSelection({ columnId: section.columns[0].id });
            setColumnsOpen(true);
          }}
          onDeleteSection={deleteSection}
          onDeleteBlock={deleteBlock}
          onOpenTextSettings={openTextSettings}
          onToggleBold={toggleBold}
          textBold={
            selectedContent?.type === 'text' &&
            isEmailTextBold(selectedContent, textSelection)
          }
          onAddBeside={(
            columnId,
            anchorId,
            side,
            button,
            anchorWidthPercent,
            freeSpace,
          ) => {
            if (!surface.current) return;
            const host = surface.current.getBoundingClientRect();
            const rect = button.getBoundingClientRect();
            insertionTrigger.current = button;
            setInsertion({
              columnId,
              beside: { anchorId, side, anchorWidthPercent, freeSpace },
              top: rect.bottom - host.top + 8,
              left: Math.max(
                0,
                Math.min(rect.left - host.left, host.width - 256),
              ),
            });
            setSelection({ columnId });
            setColumnsOpen(false);
          }}
          onInteractionChange={(active) => {
            setManipulating(active);
            if (active) {
              editingText.current?.blur();
              editingText.current = null;
              setInsertion(null);
            }
          }}
          onSelect={(columnId, blockId) => {
            closePanels();
            setSelection({ columnId, blockId });
          }}
        />
        {insertion && !manipulating && (
          <div
            ref={insertionMenu}
            className={`${e.popover} ${e.insertMenu}`}
            role="dialog"
            aria-label="Добавить блок"
            style={{ top: insertion.top, left: insertion.left }}
          >
            <div className={e.popoverHead}>
              <strong>Добавить блок</strong>
              <button
                type="button"
                aria-label="Закрыть выбор блока"
                onClick={closeSettings}
              >
                <X size={16} strokeWidth={1.7} aria-hidden="true" />
              </button>
            </div>
            <div className={e.insertChoices}>
              {(
                [
                  { type: 'text', Icon: Type },
                  { type: 'image', Icon: ImageIcon },
                  { type: 'button', Icon: MousePointer2 },
                ] as const
              ).map(({ type, Icon }) => (
                <button
                  type="button"
                  key={type}
                  data-block-type={type}
                  onClick={() => addBlock(type)}
                >
                  <Icon size={16} strokeWidth={1.7} aria-hidden="true" />
                  <span>{labels[type]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {document.sections.length > 0 && (
          <button type="button" className={e.addSection} onClick={addSection}>
            + Добавить секцию
          </button>
        )}
      </div>
      {settingsVisible && target && (
        <div
          ref={popover}
          className={e.settingsPanel}
          role="dialog"
          aria-label={
            columnsOpen
              ? 'Настройки секции'
              : selectedBlock?.type === 'text'
                ? textSettingsOpen === 'link'
                  ? 'Ссылка в тексте'
                  : 'Оформление текста'
                : `Настройки блока ${labels[selectedBlock!.type].toLowerCase()}`
          }
        >
          <div className={e.popoverHead}>
            <strong>
              {columnsOpen
                ? `Секция ${document.sections.indexOf(target.section) + 1}`
                : selectedBlock?.type === 'text'
                  ? textSettingsOpen === 'link'
                    ? 'Ссылка'
                    : 'Оформление текста'
                  : labels[selectedBlock!.type]}
            </strong>
            <button
              type="button"
              aria-label="Закрыть настройки"
              onClick={closeSettings}
            >
              <X size={16} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </div>
          {columnsOpen ? (
            <div className={e.columnSettings} key={target.section.id}>
              <details
                className={e.sectionGroup}
                name={`section-settings-${target.section.id}`}
                open
              >
                <summary>Фон и цвета</summary>
                <div className={e.fields}>
                  <AppearanceColor
                    label="Фон"
                    icon={
                      <ImageIcon
                        size={16}
                        strokeWidth={1.7}
                        aria-hidden="true"
                      />
                    }
                    value={
                      target.section.background ??
                      document.appearance.background
                    }
                    onChange={(background) => updateSection({ background })}
                  />
                  <AppearanceBackgroundImage
                    key={target.section.id}
                    label="Фон"
                    compact
                    value={target.section.backgroundImage ?? ''}
                    onChange={(backgroundImage) =>
                      updateSection({ backgroundImage })
                    }
                  />
                  <p
                    className={e.imageHint}
                    title="Изображение заполняет фон; края могут обрезаться."
                  >
                    <Info size={14} strokeWidth={1.7} aria-hidden="true" />
                    PNG, JPG, GIF, WebP · до 15 МБ
                  </p>
                  <AppearanceColor
                    label="Текст"
                    icon={
                      <Type size={16} strokeWidth={1.7} aria-hidden="true" />
                    }
                    value={
                      target.section.textColor ?? document.appearance.textColor
                    }
                    onChange={(textColor) => updateSection({ textColor })}
                  />
                </div>
              </details>
              <details
                className={e.sectionGroup}
                name={`section-settings-${target.section.id}`}
              >
                <summary>Рамка и углы</summary>
                <div className={e.fields}>
                  <label className={e.sectionToggle}>
                    <input
                      type="checkbox"
                      checked={Boolean(target.section.borderColor)}
                      onChange={(event) =>
                        updateSection({
                          borderColor: event.target.checked
                            ? document.appearance.linkColor
                            : undefined,
                        })
                      }
                    />
                    Рамка
                  </label>
                  {target.section.borderColor && (
                    <AppearanceColor
                      label="Цвет рамки"
                      value={target.section.borderColor}
                      onChange={(borderColor) => updateSection({ borderColor })}
                    />
                  )}
                  <Field label="Закругление углов">
                    <input
                      type="range"
                      min={0}
                      max={48}
                      value={target.section.borderRadius ?? 0}
                      onChange={(event) =>
                        updateSection({
                          borderRadius: Number(event.target.value),
                        })
                      }
                    />
                  </Field>
                  <div className={e.rangeLabels}>
                    <span>Прямые</span>
                    <span>Закруглённые</span>
                  </div>
                </div>
              </details>
              <details
                className={e.sectionGroup}
                name={`section-settings-${target.section.id}`}
              >
                <summary>Колонки</summary>
                <div className={e.fields}>
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
                          <Trash2
                            size={16}
                            strokeWidth={1.7}
                            aria-hidden="true"
                            focusable="false"
                          />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className={e.addColumn}
                    onClick={() => addColumn(target.section.id)}
                  >
                    + Колонка справа
                  </button>
                </div>
              </details>
            </div>
          ) : (
            <>
              <BlockFields
                content={selectedContent!}
                inherited={inheritedImage}
                onResetImage={
                  canResetImage
                    ? () =>
                        updateContent(selectedBlock!.id, locale, {
                          type: 'image',
                          src: '',
                          alt:
                            ownContent?.type === 'image' ? ownContent.alt : '',
                        })
                    : undefined
                }
                onChange={(value) =>
                  updateContent(selectedBlock!.id, locale, value)
                }
              />
              {selectedBlock &&
                (selectedBlock.type !== 'text' ||
                  textSettingsOpen === 'style') && (
                  <div
                    className={e.imageAlignment}
                    role="group"
                    aria-label={
                      selectedBlock.type === 'image'
                        ? 'Расположение картинки'
                        : selectedBlock.type === 'button'
                          ? 'Расположение кнопки'
                          : 'Выравнивание текста'
                    }
                  >
                    {(['left', 'center', 'right'] as const).map(
                      (alignment, index) => (
                        <button
                          type="button"
                          key={alignment}
                          aria-pressed={
                            (selectedBlock.alignment ?? 'left') === alignment
                          }
                          onClick={() =>
                            onChange((current) =>
                              updateEmailBlock(
                                current,
                                selectedBlock.id,
                                (block) => ({
                                  ...block,
                                  alignment,
                                  ...(block.type === 'image'
                                    ? { offsetPercent: undefined }
                                    : block.type === 'button'
                                      ? { insetPercent: undefined }
                                      : {}),
                                }),
                              ),
                            )
                          }
                        >
                          {['Слева', 'По центру', 'Справа'][index]}
                        </button>
                      ),
                    )}
                  </div>
                )}
              {selectedBlock?.type === 'text' &&
                selectedContent?.type === 'text' && (
                  <TextBlockSettings
                    key={`${selectedBlock.id}-${locale}-${textSettingsOpen}`}
                    mode={textSettingsOpen === 'link' ? 'link' : 'style'}
                    block={selectedBlock}
                    content={selectedContent}
                    selection={textSelection}
                    textColor={
                      target.section.textColor ?? document.appearance.textColor
                    }
                    onStyle={(changes) =>
                      onChange((current) =>
                        updateEmailBlock(current, selectedBlock.id, (block) =>
                          block.type === 'text'
                            ? { ...block, ...changes }
                            : block,
                        ),
                      )
                    }
                    onContent={(content) =>
                      updateContent(selectedBlock.id, locale, content)
                    }
                  />
                )}
              {selectedBlock?.type === 'button' && (
                <div className={e.fields}>
                  <Field label="Вид кнопки">
                    <select
                      className="custom-input"
                      value={selectedBlock.variant ?? 'filled'}
                      onChange={(event) => {
                        const variant = event.target.value as
                          | 'filled'
                          | 'outline';
                        updateButtonStyle({ variant });
                      }}
                    >
                      <option value="filled">С заливкой</option>
                      <option value="outline">Только контур</option>
                    </select>
                  </Field>
                  <AppearanceColor
                    label={
                      selectedBlock.variant === 'outline'
                        ? 'Цвет контура кнопки'
                        : 'Фон кнопки'
                    }
                    value={
                      selectedBlock.background ?? document.appearance.linkColor
                    }
                    onChange={(background) => updateButtonStyle({ background })}
                  />
                  <AppearanceColor
                    label="Цвет текста кнопки"
                    value={
                      selectedBlock.color ??
                      (selectedBlock.variant === 'outline'
                        ? (selectedBlock.background ??
                          document.appearance.linkColor)
                        : '#ffffff')
                    }
                    onChange={(color) => updateButtonStyle({ color })}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
      {removal && (
        <CustomModal
          isOpen
          onClose={() => setRemoval(null)}
          title={`Удалить ${removal.name}?`}
          maxWidth="480px"
        >
          <p className={e.removalText}>
            {removal.contentName} будут удалены во всех языковых версиях.
          </p>
          <div className={e.removalActions}>
            <button type="button" onClick={() => setRemoval(null)}>
              Отмена
            </button>
            <button
              type="button"
              className={e.removalConfirm}
              onClick={() => {
                removal.confirm();
                setRemoval(null);
              }}
            >
              Удалить
            </button>
          </div>
        </CustomModal>
      )}
    </div>
  );
}

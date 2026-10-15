import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type SunEditorCore from 'suneditor/src/lib/core';
import {
  applyTextLayout,
  readTextLayout,
  selectedTextBlocks,
  applyParagraphBackground,
  applyTextSelection,
  selectedTextStyle,
  type TextStyle,
  type TextLayout,
} from '../../utils/textEditing';
import e from '../emailCampaign.module.css';
import { EMAIL_FONTS } from '../../utils/appearanceModel';

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36, 48, 72];
const LINE_HEIGHTS = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.5];
const SPACING = [0, 4, 8, 12, 16, 24, 32, 48, 64];
const colorValue = (value: string | undefined, fallback: string) => {
  if (value?.startsWith('#')) return value;
  const parts = value?.match(
    /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/,
  );
  return parts && parts[4] !== '0'
    ? '#' +
        parts
          .slice(1, 4)
          .map((part) => Number(part).toString(16).padStart(2, '0'))
          .join('')
    : fallback;
};
const choices = (values: number[], current: number) =>
  [...new Set([...values, current])].sort((a, b) => a - b);

export default function TextControls({
  editor,
  onChange,
}: {
  editor: SunEditorCore;
  onChange: (html: string) => void;
}) {
  const root = editor.core.context.element.wysiwyg as HTMLElement;
  const [selected, setSelected] = useState<HTMLElement | null>(null);
  const [layout, setLayout] = useState<TextLayout | null>(null);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const savedRange = useRef<Range | null>(null);
  const [inline, setInline] = useState<TextStyle | null>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const selecting = useRef(false);
  const usingToolbar = useRef(false);
  const [blocks, setBlocks] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const select = () => {
      usingToolbar.current = false;
      selecting.current = true;
      savedRange.current = null;
      setInline(null);
      setSelected(null);
      setBlocks([]);
    };
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !root.contains(event.target) &&
        !toolbar.current?.contains(event.target)
      )
        setSelected(null);
    };
    const key = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !(
          event.target instanceof Element &&
          event.target.closest('select,input')
        )
      ) {
        setSelected(null);
        savedRange.current = null;
        setInline(null);
      }
    };
    const selectionChanged = () => {
      if (
        selecting.current ||
        usingToolbar.current ||
        toolbar.current?.contains(document.activeElement)
      )
        return;
      const selection = root.ownerDocument.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      if (
        !range ||
        range.collapsed ||
        !root.contains(range.startContainer) ||
        !root.contains(range.endContainer)
      ) {
        return;
      }
      const nextBlocks = selectedTextBlocks(root, range);
      if (!nextBlocks.length || !range.toString().trim()) return;
      const block = nextBlocks[0];
      setBlocks(nextBlocks);
      savedRange.current = range.cloneRange();
      setSelected(block);
      setInline(selectedTextStyle(range));
    };
    const finishSelection = () => {
      if (!selecting.current) return;
      selecting.current = false;
      selectionChanged();
    };
    document.addEventListener('pointerup', finishSelection);
    document.addEventListener('pointercancel', finishSelection);
    document.addEventListener('selectionchange', selectionChanged);
    root.addEventListener('pointerdown', select);
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerup', finishSelection);
      document.removeEventListener('pointercancel', finishSelection);
      document.removeEventListener('selectionchange', selectionChanged);
      root.removeEventListener('pointerdown', select);
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', key);
    };
  }, [root]);

  useEffect(() => {
    const update = () => {
      if (
        !selected ||
        !root.contains(selected) ||
        !root.getClientRects().length
      ) {
        setPosition(null);
        return;
      }
      const boxes = blocks
        .filter((block) => root.contains(block))
        .map((block) => block.getBoundingClientRect());
      if (!boxes.length) {
        setPosition(null);
        return;
      }
      const box = {
        left: Math.min(...boxes.map((box) => box.left)),
        top: Math.min(...boxes.map((box) => box.top)),
        bottom: Math.max(...boxes.map((box) => box.bottom)),
        width:
          Math.max(...boxes.map((box) => box.right)) -
          Math.min(...boxes.map((box) => box.left)),
        height:
          Math.max(...boxes.map((box) => box.bottom)) -
          Math.min(...boxes.map((box) => box.top)),
      };
      const area = root.getBoundingClientRect();
      if (box.bottom < area.top || box.top > area.bottom) {
        setPosition(null);
        return;
      }
      setLayout(readTextLayout(selected));
      setPosition({
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
      });
    };
    update();
    const resize = new ResizeObserver(update);
    resize.observe(root);
    if (selected) resize.observe(selected);
    const mutation = new MutationObserver(update);
    mutation.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    document.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      resize.disconnect();
      mutation.disconnect();
      document.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [root, selected, blocks]);

  const apply = (patch: Partial<TextLayout>) => {
    if (!selected || !root.contains(selected)) return;
    usingToolbar.current = true;
    editor.core.history.push(false);
    for (const block of blocks) applyTextLayout(root, block, patch);
    usingToolbar.current = true;
    editor.core.history.push(false);
    setLayout(readTextLayout(selected));
    onChange(editor.getContents(false));
  };
  const applyInline = (patch: Partial<TextStyle>) => {
    const range = savedRange.current;
    if (!range) return;
    usingToolbar.current = true;
    editor.core.history.push(false);
    const updated = applyTextSelection(root, range, patch);
    if (!updated) return;
    savedRange.current = updated;
    setInline(selectedTextStyle(updated));
    usingToolbar.current = true;
    editor.core.history.push(false);
    onChange(editor.getContents(false));
  };
  const background = (value: string) => {
    if (!selected) return;
    usingToolbar.current = true;
    editor.core.history.push(false);
    applyParagraphBackground(
      blocks.filter((block) => root.contains(block)),
      value,
    );
    usingToolbar.current = true;
    editor.core.history.push(false);
    onChange(editor.getContents(false));
  };
  if (!position || !selected || !layout) return null;
  return createPortal(
    <>
      <div className={e.textSelection} aria-hidden="true" style={position} />
      <div
        ref={toolbar}
        className={e.textFloatingTools}
        role="group"
        aria-label="Оформление текста"
        onPointerDown={(event) => {
          usingToolbar.current = true;
          event.stopPropagation();
        }}
        style={{
          left: Math.max(8, Math.min(position.left, window.innerWidth - 348)),
          top: Math.max(
            8,
            Math.min(
              position.top + position.height + 8,
              window.innerHeight - 330,
            ),
          ),
        }}
      >
        <div className={e.textAlignButtons}>
          {(['link', 'button'] as const).map((kind) => (
            <button
              type="button"
              key={kind}
              onClick={() => {
                if (savedRange.current)
                  root.dispatchEvent(
                    new CustomEvent('email-link-edit', {
                      detail: { kind, range: savedRange.current.cloneRange() },
                    }),
                  );
              }}
            >
              {kind === 'link' ? 'Ссылка' : 'Кнопка'}
            </button>
          ))}
        </div>
        <strong>
          {inline
            ? 'Выделенный текст'
            : selected.tagName === 'P'
              ? 'Абзац'
              : 'Заголовок'}
        </strong>
        <label>
          Шрифт
          <select
            aria-label="Шрифт выделенного текста"
            disabled={!inline}
            value={inline?.fontFamily || ''}
            onChange={(event) =>
              applyInline({ fontFamily: event.target.value })
            }
          >
            <option value="" disabled>
              Выделите текст
            </option>
            {Array.from(
              new Set([
                ...EMAIL_FONTS,
                ...(inline?.fontFamily ? [inline.fontFamily] : []),
              ]),
            ).map((font) => (
              <option key={font}>{font}</option>
            ))}
          </select>
        </label>
        <label>
          Размер
          <select
            aria-label="Размер текста блока"
            value={inline?.fontSize ?? layout.fontSize}
            onChange={(event) =>
              inline
                ? applyInline({ fontSize: Number(event.target.value) })
                : apply({ fontSize: Number(event.target.value) })
            }
          >
            {choices(FONT_SIZES, inline?.fontSize ?? layout.fontSize).map(
              (size) => (
                <option key={size} value={size}>
                  {size} px
                </option>
              ),
            )}
          </select>
        </label>
        <div
          className={e.textAlignButtons}
          role="group"
          aria-label="Начертание выделенного текста"
        >
          <button
            type="button"
            disabled={!inline}
            aria-label="Жирный текст"
            aria-pressed={
              inline?.fontWeight === 'bold' || Number(inline?.fontWeight) >= 600
            }
            onClick={() =>
              applyInline({
                fontWeight:
                  inline?.fontWeight === 'bold' ||
                  Number(inline?.fontWeight) >= 600
                    ? 'normal'
                    : 'bold',
              })
            }
          >
            <b>Ж</b>
          </button>
          <button
            type="button"
            disabled={!inline}
            aria-label="Курсив"
            aria-pressed={inline?.fontStyle === 'italic'}
            onClick={() =>
              applyInline({
                fontStyle: inline?.fontStyle === 'italic' ? 'normal' : 'italic',
              })
            }
          >
            <i>К</i>
          </button>
        </div>
        <label>
          Цвет текста{' '}
          <input
            type="color"
            aria-label="Цвет выделенного текста"
            disabled={!inline}
            value={colorValue(inline?.color, '#20252b')}
            onInput={(event) =>
              applyInline({ color: event.currentTarget.value })
            }
          />
        </label>
        <label>
          Маркер{' '}
          <input
            type="color"
            aria-label="Подсветка выделенного текста"
            disabled={!inline}
            value={colorValue(inline?.backgroundColor, '#ffff00')}
            onInput={(event) =>
              applyInline({ backgroundColor: event.currentTarget.value })
            }
          />
        </label>
        <button
          type="button"
          disabled={!inline}
          onClick={() => applyInline({ backgroundColor: 'transparent' })}
        >
          Убрать подсветку
        </button>
        <strong>
          {blocks.length > 1
            ? `Выделенные абзацы: ${blocks.length}`
            : 'Выделенный абзац'}
          : весь блок
        </strong>
        <div
          className={e.textAlignButtons}
          role="group"
          aria-label="Выравнивание текста"
        >
          {(['left', 'center', 'right', 'justify'] as const).map(
            (alignment, index) => (
              <button
                key={alignment}
                type="button"
                title={['Слева', 'По центру', 'Справа', 'По ширине'][index]}
                aria-label={
                  [
                    'Текст слева',
                    'Текст по центру',
                    'Текст справа',
                    'Текст по ширине',
                  ][index]
                }
                aria-pressed={layout.alignment === alignment}
                onClick={() => apply({ alignment })}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  aria-hidden="true"
                >
                  {[3, 7, 11, 15].map((y, line) => {
                    const short = line % 2 === 1 && alignment !== 'justify';
                    const width = short ? 9 : 15;
                    const x =
                      alignment === 'right'
                        ? 17 - width
                        : alignment === 'center'
                          ? (18 - width) / 2
                          : 1;
                    return (
                      <path
                        key={y}
                        d={`M${x} ${y}h${width}`}
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    );
                  })}
                </svg>
              </button>
            ),
          )}
        </div>
        <label>
          Межстрочный
          <select
            aria-label="Межстрочный интервал блока"
            value={layout.lineHeight}
            onChange={(event) =>
              apply({ lineHeight: Number(event.target.value) })
            }
          >
            {choices(LINE_HEIGHTS, layout.lineHeight).map((height) => (
              <option key={height}>{height}</option>
            ))}
          </select>
        </label>
        <label>
          Фон абзаца{' '}
          <input
            type="color"
            aria-label="Фон абзаца"
            value={colorValue(selected.style.backgroundColor, '#ffffff')}
            onInput={(event) => background(event.currentTarget.value)}
          />
        </label>
        <button type="button" onClick={() => background('transparent')}>
          Убрать фон
        </button>
        <label>
          После абзаца
          <select
            aria-label="Интервал после блока"
            value={layout.spaceAfter}
            onChange={(event) =>
              apply({ spaceAfter: Number(event.target.value) })
            }
          >
            {choices(SPACING, layout.spaceAfter).map((space) => (
              <option key={space} value={space}>
                {space} px
              </option>
            ))}
          </select>
        </label>
      </div>
    </>,
    root.ownerDocument.body,
  );
}

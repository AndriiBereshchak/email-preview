import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { EmailDocument } from '../../utils/emailDocument';
import {
  moveEmailBlock,
  moveEmailSection,
  emailBlockRows,
  placeEmailBlockBeside,
  resizeEmailImage,
  updateEmailBlock,
} from '../../utils/emailDocumentLayout';
import e from './emailBuilder.module.css';
import { SlidersHorizontal, Trash2 } from 'lucide-react';

type Box = {
  image?: boolean;
  button?: boolean;
  cellLeft?: number;
  cellWidth?: number;
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
};
type Dragged = { type: 'section' | 'block'; id: string; grabX?: number };
type Drop = Dragged & {
  horizontalOffset?: number;
  beside?: {
    anchorId: string;
    side: 'left' | 'right';
    anchorWidthPercent?: number;
  };
  buttonInset?: number;
  height?: number;
  beforeId?: string;
  columnId?: string;
  top: number;
  left: number;
  width: number;
};
type Resize = { pointerId: number; startX: number; width: number } & (
  | {
      type: 'image';
      id: string;
      columnWidth: number;
      original?: number;
      startY: number;
      height: number;
    }
  | {
      type: 'button';
      id: string;
      startY: number;
      minimumWidth: number;
      availableWidth: number;
      paddingY: number;
      originalWidth?: number;
      originalPaddingY?: number;
    }
  | {
      type: 'columns';
      leftId: string;
      rightId: string;
      leftWeight: number;
      rightWeight: number;
    }
);

export default function EmailCanvasControls({
  document,
  canvas,
  surface,
  columnId,
  blockId,
  onChange,
  onSelect,
  onInteractionChange,
  onOpenSection,
  onDeleteSection,
  onDeleteBlock,
  onAddBeside,
}: {
  document: EmailDocument;
  canvas: RefObject<HTMLDivElement | null>;
  surface: RefObject<HTMLDivElement | null>;
  columnId?: string;
  blockId?: string;
  onChange: Dispatch<SetStateAction<EmailDocument>>;
  onSelect: (columnId: string, blockId?: string) => void;
  onInteractionChange: (active: boolean) => void;
  onOpenSection: (id: string) => void;
  onDeleteSection: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onAddBeside: (
    columnId: string,
    anchorId: string,
    side: 'left' | 'right',
    button: HTMLButtonElement,
    anchorWidthPercent?: number,
  ) => void;
}) {
  const [boxes, setBoxes] = useState<{
    sections: Box[];
    columns: Box[];
    blocks: Box[];
  }>({ sections: [], columns: [], blocks: [] });
  const [drop, setDrop] = useState<Drop | null>(null);
  const [resizing, setResizing] = useState(false);
  const dragged = useRef<Dragged | null>(null);
  const resizingRef = useRef<Resize | null>(null);
  const dropRef = useRef<Drop | null>(null);
  const activeSection = document.sections.find((section) =>
    section.columns.some((column) => column.id === columnId),
  );
  const selectedBlock = activeSection?.columns
    .flatMap((column) => column.blocks)
    .find((block) => block.id === blockId);

  useEffect(() => {
    const host = surface.current;
    const content = canvas.current;
    if (!host || !content) {
      setBoxes({ sections: [], columns: [], blocks: [] });
      return;
    }
    const measure = () => {
      const origin = host.getBoundingClientRect();
      const read = (attribute: string, image = false): Box[] =>
        Array.from(content.querySelectorAll<HTMLElement>(`[${attribute}]`)).map(
          (cell) => {
            const node = image
              ? (cell.querySelector('img, [data-email-button]') ?? cell)
              : cell;
            const rect = node.getBoundingClientRect();
            const cellRect = cell.getBoundingClientRect();
            return {
              image: image && node.tagName === 'IMG',
              button: image && node.hasAttribute('data-email-button'),
              cellLeft: cellRect.left - origin.left,
              cellWidth: cellRect.width,
              id: cell.getAttribute(attribute)!,
              top: rect.top - origin.top,
              left: rect.left - origin.left,
              width: rect.width,
              height: rect.height,
            };
          },
        );
      setBoxes({
        sections: read('data-section-id'),
        columns: read('data-column-id'),
        blocks: read('data-block-id', true),
      });
    };
    measure();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(content);
    host.addEventListener('load', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      host.removeEventListener('load', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [document, canvas, surface]);

  useEffect(() => {
    const host = surface.current;
    if (!host) return;
    const clear = () => {
      onInteractionChange(false);
      dragged.current = null;
      dropRef.current = null;
      setDrop(null);
    };
    const startBlock = (event: DragEvent) => {
      if (!(event.target instanceof HTMLElement)) return;
      const element = event.target.closest<HTMLElement>(
        'img, [data-email-button]',
      );
      if (!element) return;
      const cell = element.closest<HTMLElement>('[data-block-id]');
      const column = cell?.closest<HTMLElement>('[data-column-id]');
      if (!cell || !column || !canvas.current?.contains(cell)) return;
      dragged.current = {
        type: 'block',
        id: cell.dataset.blockId!,
        grabX: event.clientX - element.getBoundingClientRect().left,
      };
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', cell.dataset.blockId!);
      }
      onSelect(column.dataset.columnId!, cell.dataset.blockId);
      onInteractionChange(true);
    };
    const over = (event: DragEvent) => {
      const moving = dragged.current;
      if (!moving || !(event.target instanceof HTMLElement)) return;
      const node = event.target;
      const sidePoint = node.closest<HTMLElement>('[data-beside-anchor]');
      if (
        moving.type === 'block' &&
        sidePoint &&
        sidePoint.dataset.besideAnchor !== moving.id
      ) {
        event.preventDefault();
        const origin = host.getBoundingClientRect();
        const bounds = sidePoint.getBoundingClientRect();
        const destination: Drop = {
          ...moving,
          columnId: sidePoint.dataset.columnId!,
          beside: {
            anchorId: sidePoint.dataset.besideAnchor!,
            side: sidePoint.dataset.side as 'left' | 'right',
            anchorWidthPercent:
              Number(sidePoint.dataset.anchorWidth) || undefined,
          },
          top: bounds.top - origin.top,
          left: bounds.left - origin.left + bounds.width / 2,
          width: 3,
          height: bounds.height,
        };
        dropRef.current = destination;
        setDrop(destination);
        return;
      }
      if (!canvas.current?.contains(node)) {
        dropRef.current = null;
        setDrop(null);
        return;
      }
      const origin = host.getBoundingClientRect();
      let destination: Drop | null = null;
      if (moving.type === 'section') {
        const section = node.closest<HTMLElement>('[data-section-id]');
        const box = boxes.sections.find(
          (item) => item.id === section?.dataset.sectionId,
        );
        if (box) {
          const after = event.clientY - origin.top >= box.top + box.height / 2;
          const index = document.sections.findIndex(
            (item) => item.id === box.id,
          );
          destination = {
            ...moving,
            beforeId: after ? document.sections[index + 1]?.id : box.id,
            top: box.top + (after ? box.height : 0),
            left: box.left,
            width: box.width,
          };
        }
      } else {
        const column = node.closest<HTMLElement>('[data-column-id]');
        const columnBox = boxes.columns.find(
          (item) => item.id === column?.dataset.columnId,
        );
        const targetColumn = document.sections
          .flatMap((section) => section.columns)
          .find((item) => item.id === columnBox?.id);
        if (columnBox && targetColumn) {
          const insertion = node.closest<HTMLElement>('[data-add-column-id]');
          const beforeId = insertion?.dataset.beforeBlockId;
          const cell = node.closest<HTMLElement>('[data-block-id]');
          const box = boxes.blocks.find(
            (item) => item.id === (beforeId ?? cell?.dataset.blockId),
          );
          const after = insertion
            ? !beforeId
            : box
              ? event.clientY - origin.top >= box.top + box.height / 2
              : true;
          const index = targetColumn.blocks.findIndex(
            (item) => item.id === box?.id,
          );
          destination = {
            ...moving,
            columnId: columnBox.id,
            beforeId: box
              ? after
                ? targetColumn.blocks[index + 1]?.id
                : box.id
              : undefined,
            top: box
              ? box.top + (after ? box.height : 0)
              : columnBox.top + columnBox.height,
            left: columnBox.left + 8,
            width: Math.max(0, columnBox.width - 16),
          };
          const movingBlock = targetColumn.blocks.find(
            (block) => block.id === moving.id,
          );
          const rowNode = cell?.closest<HTMLElement>('[data-row-id]');
          const group = emailBlockRows(targetColumn.blocks).find((row) =>
            row.some((block) => block.id === box?.id),
          );
          if (rowNode && group && group.length > 1) {
            const bounds = rowNode.getBoundingClientRect();
            const afterRow = event.clientY >= bounds.top + bounds.height / 2;
            const lastIndex = targetColumn.blocks.indexOf(group.at(-1)!);
            destination.beforeId = afterRow
              ? targetColumn.blocks[lastIndex + 1]?.id
              : group[0].id;
            destination.top =
              bounds.top - origin.top + (afterRow ? bounds.height : 0);
            if (!insertion && group.some((block) => block.id === moving.id)) {
              if (box?.id === moving.id) destination.beforeId = moving.id;
              else if (box) {
                destination.beside = {
                  anchorId: box.id,
                  side:
                    event.clientX - origin.left < box.left + box.width / 2
                      ? 'left'
                      : 'right',
                };
              }
            }
          } else if (
            box?.id === moving.id &&
            (movingBlock?.type === 'image' || movingBlock?.type === 'button')
          ) {
            const spare = Math.max(0, columnBox.width - 16 - box.width);
            const desired =
              event.clientX -
              origin.left -
              columnBox.left -
              8 -
              (moving.grabX ?? box.width / 2);
            const offset = spare
              ? Math.max(0, Math.min(100, (desired / spare) * 100))
              : 0;
            destination.horizontalOffset = Math.round(offset * 10) / 10;
            if (movingBlock.type === 'button')
              destination.buttonInset =
                Math.round(
                  ((spare * offset) / Math.max(1, columnBox.width - 16)) * 10,
                ) / 10;
            destination.left = columnBox.left + 8 + (spare * offset) / 100;
            destination.width = box.width;
          }
        }
      }
      if (destination) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      }
      dropRef.current = destination;
      setDrop(destination);
    };
    const finish = (event: DragEvent) => {
      const destination = dropRef.current;
      if (!dragged.current || !destination) return;
      event.preventDefault();
      if (destination.type === 'section') {
        onChange((current) =>
          moveEmailSection(current, destination.id, destination.beforeId),
        );
      } else if (destination.columnId) {
        if (destination.beside) {
          onChange((current) => {
            const block = current.sections
              .flatMap((section) => section.columns)
              .flatMap((column) => column.blocks)
              .find((block) => block.id === destination.id);
            return block
              ? placeEmailBlockBeside(
                  current,
                  destination.columnId!,
                  destination.beside!.anchorId,
                  block,
                  destination.beside!.side,
                  crypto.randomUUID(),
                  destination.beside!.anchorWidthPercent,
                )
              : current;
          });
        } else if (destination.horizontalOffset !== undefined) {
          onChange((current) =>
            updateEmailBlock(current, destination.id, (block) =>
              block.type === 'image' || block.type === 'button'
                ? {
                    ...block,
                    alignment:
                      destination.horizontalOffset === 0
                        ? 'left'
                        : destination.horizontalOffset === 100
                          ? 'right'
                          : 'center',
                    ...(block.type === 'image'
                      ? { offsetPercent: destination.horizontalOffset }
                      : { insetPercent: destination.buttonInset }),
                  }
                : block,
            ),
          );
        } else {
          onChange((current) =>
            moveEmailBlock(
              current,
              destination.id,
              destination.columnId!,
              destination.beforeId,
            ),
          );
        }
        onSelect(destination.columnId, destination.id);
      }
      clear();
    };
    const leave = (event: DragEvent) => {
      if (
        !(event.relatedTarget instanceof Node) ||
        !host.contains(event.relatedTarget)
      ) {
        dropRef.current = null;
        setDrop(null);
      }
    };
    host.addEventListener('dragstart', startBlock);
    host.addEventListener('dragover', over);
    host.addEventListener('drop', finish);
    host.addEventListener('dragleave', leave);
    window.addEventListener('dragend', clear);
    return () => {
      host.removeEventListener('dragstart', startBlock);
      host.removeEventListener('dragover', over);
      host.removeEventListener('drop', finish);
      host.removeEventListener('dragleave', leave);
      window.removeEventListener('dragend', clear);
    };
  }, [
    boxes,
    document,
    onChange,
    onSelect,
    onInteractionChange,
    canvas,
    surface,
  ]);

  const imageWidth = (id: string, widthPercent?: number) =>
    onChange((current) => resizeEmailImage(current, id, widthPercent));
  const buttonSize = (id: string, buttonWidth?: number, paddingY?: number) =>
    onChange((current) =>
      updateEmailBlock(current, id, (block) =>
        block.type === 'button' ? { ...block, buttonWidth, paddingY } : block,
      ),
    );
  const columnWeights = (
    leftId: string,
    rightId: string,
    leftWeight: number,
    rightWeight: number,
  ) =>
    onChange((current) => ({
      ...current,
      sections: current.sections.map((section) => ({
        ...section,
        columns: section.columns.map((column) =>
          column.id === leftId
            ? { ...column, weight: leftWeight }
            : column.id === rightId
              ? { ...column, weight: rightWeight }
              : column,
        ),
      })),
    }));
  const capture = (
    event: ReactPointerEvent<HTMLButtonElement>,
    resize: Resize,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.focus();
    resizingRef.current = resize;
    setResizing(true);
    onInteractionChange(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const stopResize = (cancel: boolean) => {
    const current = resizingRef.current;
    if (!current) return;
    if (cancel) {
      if (current.type === 'image') imageWidth(current.id, current.original);
      else if (current.type === 'button')
        buttonSize(current.id, current.originalWidth, current.originalPaddingY);
      else
        columnWeights(
          current.leftId,
          current.rightId,
          current.leftWeight,
          current.rightWeight,
        );
    }
    resizingRef.current = null;
    setResizing(false);
    onInteractionChange(false);
  };
  const blockBox = boxes.blocks.find((box) => box.id === blockId);
  return (
    <div
      className={e.canvasControls}
      data-resizing={resizing || undefined}
      onPointerMove={(event) => {
        const current = resizingRef.current;
        if (!current || event.pointerId !== current.pointerId) return;
        const delta = event.clientX - current.startX;
        if (current.type === 'button') {
          buttonSize(
            current.id,
            Math.min(
              current.availableWidth,
              Math.max(current.minimumWidth, current.width + delta),
            ),
            Math.max(
              0,
              Math.round(
                current.paddingY + (event.clientY - current.startY) / 2,
              ),
            ),
          );
        } else if (current.type === 'image') {
          const verticalDelta =
            ((event.clientY - current.startY) * current.width) /
            Math.max(1, current.height);
          const imageDelta =
            Math.abs(verticalDelta) > Math.abs(delta) ? verticalDelta : delta;
          imageWidth(
            current.id,
            Math.round(
              Math.max(
                1,
                Math.min(
                  100,
                  ((current.width + imageDelta) / current.columnWidth) * 100,
                ),
              ) * 10,
            ) / 10,
          );
        } else {
          const total = current.leftWeight + current.rightWeight;
          const minimum = total * Math.min(32 / current.width, 0.25);
          const left = Math.max(
            minimum,
            Math.min(
              total - minimum,
              current.leftWeight + (delta / current.width) * total,
            ),
          );
          columnWeights(current.leftId, current.rightId, left, total - left);
        }
      }}
      onPointerUp={() => stopResize(false)}
      onPointerCancel={() => stopResize(true)}
      onLostPointerCapture={() => stopResize(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          stopResize(true);
        }
      }}
    >
      {boxes.sections.map((box, index) => (
        <div
          key={box.id}
          className={e.sectionTools}
          style={{ top: box.top - 8, left: box.left, width: box.width }}
        >
          <button
            type="button"
            className={e.sectionDrag}
            style={{ top: 8, left: -22 }}
            draggable
            aria-label={`Переместить секцию ${index + 1}`}
            title="Перетащите секцию"
            onDragStart={(event) => {
              onInteractionChange(true);
              dragged.current = { type: 'section', id: box.id };
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', box.id);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              const next = event.key === 'ArrowUp' ? index - 1 : index + 1;
              if (next < 0 || next >= document.sections.length) return;
              onChange((current) =>
                moveEmailSection(
                  current,
                  box.id,
                  document.sections[event.key === 'ArrowUp' ? next : next + 1]
                    ?.id,
                ),
              );
            }}
          >
            ⠿
          </button>
          <button
            className={e.sectionSettings}
            type="button"
            title="Настройки секции"
            aria-label={`Настройки секции ${index + 1}`}
            onClick={() => onOpenSection(box.id)}
          >
            <SlidersHorizontal
              size={16}
              strokeWidth={1.7}
              aria-hidden="true"
              focusable="false"
            />
          </button>
          <button
            className={e.sectionDelete}
            type="button"
            title="Удалить секцию"
            aria-label={`Удалить секцию ${index + 1}`}
            onClick={() => onDeleteSection(box.id)}
          >
            <Trash2
              size={16}
              strokeWidth={1.7}
              aria-hidden="true"
              focusable="false"
            />
          </button>
        </div>
      ))}
      {!resizing &&
        boxes.blocks
          .filter((box) => box.image || box.button)
          .flatMap((box) => {
            const column = document.sections
              .flatMap((section) => section.columns)
              .find((column) =>
                column.blocks.some((block) => block.id === box.id),
              );
            const columnBox = boxes.columns.find(
              (item) => item.id === column?.id,
            );
            if (!column || !columnBox) return [];
            const row = emailBlockRows(column.blocks).find((row) =>
              row.some((block) => block.id === box.id),
            )!;
            const grouped = row.length > 1;
            const anchorWidthPercent =
              box.button && !grouped
                ? Math.min(
                    98,
                    ((box.width + 8) / Math.max(1, columnBox.width - 16)) * 100,
                  )
                : undefined;
            const freeLeft = grouped ? box.cellLeft! : columnBox.left + 8;
            const freeRight = grouped
              ? box.cellLeft! + box.cellWidth!
              : columnBox.left + columnBox.width - 8;
            return (['left', 'right'] as const).flatMap((side) => {
              const space =
                side === 'left'
                  ? box.left - freeLeft
                  : freeRight - box.left - box.width;
              if (space < 48) return [];
              return (
                <button
                  key={`${box.id}-${side}`}
                  type="button"
                  className={e.besideArea}
                  style={{
                    left: side === 'left' ? freeLeft : box.left + box.width,
                    top: box.top,
                    width: space,
                    height: Math.max(24, box.height),
                  }}
                  data-beside-anchor={box.id}
                  data-column-id={column.id}
                  data-side={side}
                  data-anchor-width={anchorWidthPercent}
                  aria-label={`Добавить ${side === 'left' ? 'слева' : 'справа'} от ${box.button ? 'кнопки' : 'картинки'}`}
                  title={`Добавить блок ${side === 'left' ? 'слева' : 'справа'}`}
                  onClick={(event) =>
                    onAddBeside(
                      column.id,
                      box.id,
                      side,
                      event.currentTarget,
                      anchorWidthPercent,
                    )
                  }
                >
                  <span className={e.besideAdd} aria-hidden="true">
                    +
                  </span>
                </button>
              );
            });
          })}
      {blockBox && selectedBlock && (
        <>
          <button
            type="button"
            className={e.blockDrag}
            style={{ top: blockBox.top - 22, left: blockBox.left }}
            draggable
            aria-label="Переместить блок"
            title="Перетащите блок"
            onDragStart={(event) => {
              onInteractionChange(true);
              dragged.current = { type: 'block', id: blockBox.id };
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', blockBox.id);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
              event.preventDefault();
              const column = activeSection?.columns.find(
                (item) => item.id === columnId,
              );
              if (!column) return;
              const index = column.blocks.findIndex(
                (item) => item.id === blockId,
              );
              const next = event.key === 'ArrowUp' ? index - 1 : index + 1;
              if (next < 0 || next >= column.blocks.length) return;
              onChange((current) =>
                moveEmailBlock(
                  current,
                  blockId!,
                  column.id,
                  column.blocks[event.key === 'ArrowUp' ? next : next + 1]?.id,
                ),
              );
            }}
          >
            ⠿
          </button>
          {selectedBlock.type === 'text' && (
            <button
              type="button"
              className={e.textDelete}
              style={{
                top: blockBox.top - 28,
                left: blockBox.left + blockBox.width - 28,
              }}
              aria-label="Удалить блок текст"
              title="Удалить блок"
              onClick={() => onDeleteBlock(selectedBlock.id)}
            >
              <Trash2
                size={16}
                strokeWidth={1.7}
                aria-hidden="true"
                focusable="false"
              />
            </button>
          )}
          {selectedBlock.type === 'button' && blockBox.button && (
            <button
              type="button"
              className={e.imageResize}
              style={{
                top: blockBox.top + blockBox.height - 6,
                left: blockBox.left + blockBox.width - 6,
              }}
              aria-label="Изменить размер кнопки"
              title="Потяните, чтобы изменить размер"
              onPointerDown={(event) => {
                const cell = Array.from(
                  canvas.current!.querySelectorAll<HTMLElement>(
                    '[data-block-id]',
                  ),
                ).find((node) => node.dataset.blockId === blockId)!;
                const button = cell.querySelector<HTMLElement>(
                  '[data-email-button]',
                )!;
                const style = window.getComputedStyle(button);
                const cellStyle = window.getComputedStyle(cell);
                const range = window.document.createRange();
                range.selectNodeContents(button);
                const textWidth = range.getBoundingClientRect().width;
                const availableWidth =
                  cell.getBoundingClientRect().width -
                  parseFloat(cellStyle.paddingLeft || '0') -
                  parseFloat(cellStyle.paddingRight || '0');
                capture(event, {
                  type: 'button',
                  id: blockId!,
                  pointerId: event.pointerId,
                  startX: event.clientX,
                  startY: event.clientY,
                  width: blockBox.width,
                  minimumWidth:
                    textWidth +
                    parseFloat(style.paddingLeft) +
                    parseFloat(style.paddingRight),
                  availableWidth,
                  paddingY: selectedBlock.paddingY ?? 12,
                  originalWidth: selectedBlock.buttonWidth,
                  originalPaddingY: selectedBlock.paddingY,
                });
              }}
            />
          )}
          {selectedBlock.type === 'image' && blockBox.image && (
            <button
              type="button"
              className={e.imageResize}
              style={{
                top: blockBox.top + blockBox.height - 6,
                left: blockBox.left + blockBox.width - 6,
              }}
              aria-label="Изменить размер картинки"
              title="Потяните, чтобы изменить размер"
              onPointerDown={(event) => {
                const cell = Array.from(
                  canvas.current!.querySelectorAll<HTMLElement>(
                    '[data-block-id]',
                  ),
                ).find((node) => node.dataset.blockId === blockId)!;
                const row = cell.closest<HTMLElement>('[data-row-id]');
                const width = (row ?? cell).getBoundingClientRect().width;
                if (!width) return;
                capture(event, {
                  type: 'image',
                  pointerId: event.pointerId,
                  id: blockId!,
                  startX: event.clientX,
                  width: row
                    ? (width * (selectedBlock.widthPercent ?? 100)) / 100
                    : blockBox.width,
                  height: blockBox.height,
                  startY: event.clientY,
                  original: selectedBlock.widthPercent,
                  columnWidth: width,
                });
              }}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                  return;
                event.preventDefault();
                imageWidth(
                  blockId!,
                  Math.max(
                    1,
                    Math.min(
                      100,
                      (selectedBlock.widthPercent ?? 100) +
                        (event.key === 'ArrowLeft' ? -2 : 2),
                    ),
                  ),
                );
              }}
            />
          )}
        </>
      )}
      {activeSection?.columns.slice(0, -1).map((column, index) => {
        const right = activeSection.columns[index + 1];
        const leftBox = boxes.columns.find((box) => box.id === column.id);
        const rightBox = boxes.columns.find((box) => box.id === right.id);
        if (!leftBox || !rightBox || Math.abs(leftBox.top - rightBox.top) > 2)
          return null;
        return (
          <button
            key={column.id}
            type="button"
            role="separator"
            aria-orientation="vertical"
            aria-label={`Изменить ширину колонок ${index + 1} и ${index + 2}`}
            aria-valuenow={Math.round(
              ((column.weight ?? 1) /
                ((column.weight ?? 1) + (right.weight ?? 1))) *
                100,
            )}
            className={e.columnResize}
            style={{
              top: leftBox.top,
              left: rightBox.left - 5,
              height: Math.max(32, leftBox.height, rightBox.height),
            }}
            title="Потяните границу колонок"
            onPointerDown={(event) =>
              capture(event, {
                type: 'columns',
                pointerId: event.pointerId,
                startX: event.clientX,
                width: leftBox.width + rightBox.width,
                leftId: column.id,
                rightId: right.id,
                leftWeight: column.weight ?? 1,
                rightWeight: right.weight ?? 1,
              })
            }
            onKeyDown={(event) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')
                return;
              event.preventDefault();
              const total = (column.weight ?? 1) + (right.weight ?? 1);
              const left = Math.max(
                total * 0.05,
                Math.min(
                  total * 0.95,
                  (column.weight ?? 1) +
                    total * (event.key === 'ArrowLeft' ? -0.02 : 0.02),
                ),
              );
              columnWeights(column.id, right.id, left, total - left);
            }}
          />
        );
      })}
      {drop && (
        <div
          className={e.dropLine}
          style={{ top: drop.top, left: drop.left, width: drop.width }}
        />
      )}
    </div>
  );
}

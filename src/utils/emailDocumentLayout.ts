import type { EmailBlock, EmailDocument } from './emailDocument';

export function updateEmailBlock(
  document: EmailDocument,
  id: string,
  update: (block: EmailBlock) => EmailBlock,
): EmailDocument {
  return {
    ...document,
    sections: document.sections.map((section) => ({
      ...section,
      columns: section.columns.map((column) => ({
        ...column,
        blocks: column.blocks.map((block) =>
          block.id === id ? update(block) : block,
        ),
      })),
    })),
  };
}

export function moveEmailSection(
  document: EmailDocument,
  id: string,
  beforeId?: string,
): EmailDocument {
  if (id === beforeId) return document;
  const section = document.sections.find((item) => item.id === id);
  if (
    !section ||
    (beforeId && !document.sections.some((item) => item.id === beforeId))
  )
    return document;
  const sections = document.sections.filter((item) => item.id !== id);
  const index = beforeId
    ? sections.findIndex((item) => item.id === beforeId)
    : sections.length;
  sections.splice(index, 0, section);
  return { ...document, sections };
}

export function moveEmailBlock(
  document: EmailDocument,
  id: string,
  columnId: string,
  beforeId?: string,
): EmailDocument {
  if (id === beforeId) return document;
  const columns = document.sections.flatMap((section) => section.columns);
  const block = columns
    .flatMap((column) => column.blocks)
    .find((item) => item.id === id);
  const destination = columns.find((column) => column.id === columnId);
  if (
    !block ||
    !destination ||
    (beforeId && !destination.blocks.some((item) => item.id === beforeId))
  )
    return document;
  return {
    ...document,
    sections: document.sections.map((section) => ({
      ...section,
      columns: section.columns.map((column) => {
        const blocks = column.blocks.filter((item) => item.id !== id);
        if (column.id === columnId) {
          const index = beforeId
            ? blocks.findIndex((item) => item.id === beforeId)
            : blocks.length;
          blocks.splice(index, 0, { ...block, rowId: undefined });
        }
        return { ...column, blocks };
      }),
    })),
  };
}

export function emailBlockRows(blocks: EmailBlock[]) {
  const rows: EmailBlock[][] = [];
  for (const block of blocks) {
    const last = rows.at(-1);
    if (block.rowId && last?.[0].rowId === block.rowId) last.push(block);
    else rows.push([block]);
  }
  return rows;
}

export interface EmailBlockFreeSpace {
  cellWidth: number;
  contentWidth: number;
  offset: number;
  freeWidth: number;
}

export function placeEmailBlockBeside(
  document: EmailDocument,
  columnId: string,
  anchorId: string,
  block: EmailBlock,
  side: 'left' | 'right',
  rowId: string,
  anchorWidthPercent?: number,
  freeSpace?: EmailBlockFreeSpace,
): EmailDocument {
  if (block.id === anchorId) return document;
  const destination = document.sections
    .flatMap((section) => section.columns)
    .find((column) => column.id === columnId);
  if (!destination?.blocks.some((item) => item.id === anchorId))
    return document;
  const originalRow = emailBlockRows(destination.blocks).find((row) =>
    row.some((item) => item.id === anchorId),
  )!;
  if (
    originalRow.length > 1 &&
    originalRow.some((item) => item.id === block.id)
  ) {
    const reordered = originalRow.filter((item) => item.id !== block.id);
    const index = reordered.findIndex((item) => item.id === anchorId);
    reordered.splice(index + (side === 'right' ? 1 : 0), 0, block);
    const start = destination.blocks.indexOf(originalRow[0]);
    return {
      ...document,
      sections: document.sections.map((section) => ({
        ...section,
        columns: section.columns.map((column) =>
          column.id === columnId
            ? {
                ...column,
                blocks: [
                  ...column.blocks.slice(0, start),
                  ...reordered,
                  ...column.blocks.slice(start + originalRow.length),
                ],
              }
            : column,
        ),
      })),
    };
  }

  return {
    ...document,
    sections: document.sections.map((section) => ({
      ...section,
      columns: section.columns.map((column) => {
        const blocks = column.blocks.filter((item) => item.id !== block.id);
        if (column.id !== columnId) return { ...column, blocks };
        const row = emailBlockRows(blocks).find((items) =>
          items.some((item) => item.id === anchorId),
        )!;
        const anchor = row.find((item) => item.id === anchorId)!;
        const groupId = row.length > 1 ? row[0].rowId! : rowId;
        const start = blocks.findIndex((item) => item.id === row[0].id);
        const sum = row.reduce(
          (total, item) => total + (item.widthPercent ?? 1),
          0,
        );
        const standaloneWidth =
          anchorWidthPercent ??
          (anchor.widthPercent && anchor.widthPercent < 99
            ? anchor.widthPercent
            : 50);
        const widths = row.map((item) =>
          row.length === 1
            ? Math.max(1, Math.min(98, standaloneWidth))
            : ((item.widthPercent ?? 1) / sum) * 100,
        );
        const anchorIndex = row.indexOf(anchor);
        const candidates = row
          .map((item, index) => ({ item, index }))
          .filter(({ item }) => item.type !== 'image');
        const available = row.length > 1 ? freeSpace : undefined;
        const donor = available
          ? anchorIndex
          : (candidates.length
              ? candidates
              : row.map((item, index) => ({ item, index }))
            ).reduce((largest, candidate) =>
              widths[candidate.index] > widths[largest.index]
                ? candidate
                : largest,
            ).index;
        const newWidth = available
          ? (widths[anchorIndex] * available.freeWidth) / available.cellWidth
          : row.length === 1
            ? 100 - widths[0]
            : widths[donor] / 2;
        // Inline cells have 4px of padding on each side.
        const contentSpace = available
          ? available.cellWidth - available.freeWidth - 8
          : 0;
        const offset = available
          ? Math.max(
              0,
              available.offset - (side === 'left' ? available.freeWidth : 0),
            )
          : 0;
        const items = row.map((item, index) => ({
          ...item,
          ...(row.length === 1
            ? item.type === 'button'
              ? { insetPercent: undefined }
              : { offsetPercent: undefined }
            : {}),
          ...(available && index === anchorIndex
            ? item.type === 'button'
              ? {
                  buttonWidth: available.contentWidth,
                  insetPercent: (offset / contentSpace) * 100,
                }
              : {
                  contentWidthPercent: Math.min(
                    100,
                    (available.contentWidth / contentSpace) * 100,
                  ),
                  offsetPercent:
                    contentSpace > available.contentWidth
                      ? (offset / (contentSpace - available.contentWidth)) * 100
                      : 0,
                }
            : {}),
          rowId: groupId,
          widthPercent:
            row.length === 1 || index !== donor
              ? widths[index]
              : widths[index] - newWidth,
        }));
        items.splice(anchorIndex + (side === 'right' ? 1 : 0), 0, {
          ...block,
          ...(block.type === 'button'
            ? { insetPercent: undefined }
            : { offsetPercent: undefined }),
          rowId: groupId,
          widthPercent: newWidth,
        });
        return {
          ...column,
          blocks: [
            ...blocks.slice(0, start),
            ...items,
            ...blocks.slice(start + row.length),
          ],
        };
      }),
    })),
  };
}

export function resizeEmailBlockWidth(
  document: EmailDocument,
  id: string,
  widthPercent?: number,
): EmailDocument {
  return {
    ...document,
    sections: document.sections.map((section) => ({
      ...section,
      columns: section.columns.map((column) => {
        const row = emailBlockRows(column.blocks).find((items) =>
          items.some(
            (item) =>
              item.id === id && (item.type === 'image' || item.type === 'text'),
          ),
        );
        if (!row) return column;
        const width =
          widthPercent === undefined
            ? undefined
            : Math.max(1, Math.min(100, widthPercent));
        return {
          ...column,
          blocks: column.blocks.map((block) =>
            block.id === id
              ? row.length > 1
                ? { ...block, contentWidthPercent: width }
                : {
                    ...block,
                    widthPercent: width,
                    contentWidthPercent: undefined,
                  }
              : block,
          ),
        };
      }),
    })),
  };
}

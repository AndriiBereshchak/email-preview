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

export function placeEmailBlockBeside(
  document: EmailDocument,
  columnId: string,
  anchorId: string,
  block: EmailBlock,
  side: 'left' | 'right',
  rowId: string,
  anchorWidthPercent?: number,
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
        const donor = (
          candidates.length
            ? candidates
            : row.map((item, index) => ({ item, index }))
        ).reduce((largest, candidate) =>
          widths[candidate.index] > widths[largest.index] ? candidate : largest,
        ).index;
        const newWidth = row.length === 1 ? 100 - widths[0] : widths[donor] / 2;
        const items = row.map((item, index) => ({
          ...item,
          rowId: groupId,
          widthPercent:
            row.length === 1 || index !== donor
              ? widths[index]
              : widths[index] - newWidth,
        }));
        items.splice(anchorIndex + (side === 'right' ? 1 : 0), 0, {
          ...block,
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

export function resizeEmailImage(
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
          items.some((item) => item.id === id && item.type === 'image'),
        );
        if (!row) return column;
        const minimum = Math.min(1, 50 / row.length);
        const width =
          widthPercent === undefined
            ? undefined
            : Math.max(
                minimum,
                Math.min(100 - minimum * (row.length - 1), widthPercent),
              );
        const otherWidth = row.reduce(
          (total, item) =>
            total + (item.id === id ? 0 : (item.widthPercent ?? 1)),
          0,
        );
        return {
          ...column,
          blocks: column.blocks.map((block) => {
            if (block.id === id) return { ...block, widthPercent: width };
            if (row.length > 1 && row.includes(block) && width !== undefined)
              return {
                ...block,
                widthPercent:
                  ((block.widthPercent ?? 1) / otherWidth) * (100 - width),
              };
            return block;
          }),
        };
      }),
    })),
  };
}

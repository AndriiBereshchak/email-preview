export interface TableColumn {
  key: string;
  label: string;
  locked?: boolean;
}
export interface ColumnLayout {
  order: string[];
  hidden: string[];
}

export function normalizeLayout(
  value: unknown,
  columns: readonly TableColumn[],
): ColumnLayout {
  const candidate =
    value && typeof value === 'object' ? (value as Partial<ColumnLayout>) : {};
  const keys = columns.map((column) => column.key);
  const saved = Array.isArray(candidate.order)
    ? candidate.order.filter(
        (key): key is string => typeof key === 'string' && keys.includes(key),
      )
    : [];
  const order = [...new Set([...saved, ...keys])];
  const locked = columns
    .filter((column) => column.locked)
    .map((column) => column.key);
  return {
    order: [...locked, ...order.filter((key) => !locked.includes(key))],
    hidden: Array.isArray(candidate.hidden)
      ? [
          ...new Set(
            candidate.hidden.filter(
              (key): key is string =>
                typeof key === 'string' &&
                keys.includes(key) &&
                !locked.includes(key),
            ),
          ),
        ]
      : [],
  };
}

export function moveColumn(
  layout: ColumnLayout,
  key: string,
  offset: -1 | 1,
  columns: readonly TableColumn[],
): ColumnLayout {
  const order = [...layout.order];
  const index = order.indexOf(key);
  const next = index + offset;
  if (
    index < 0 ||
    next < 0 ||
    next >= order.length ||
    columns.some(
      (column) =>
        column.locked && (column.key === key || column.key === order[next]),
    )
  )
    return layout;
  [order[index], order[next]] = [order[next], order[index]];
  return { ...layout, order };
}

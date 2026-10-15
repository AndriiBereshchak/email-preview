import { useEffect, useState } from 'react';
import {
  normalizeLayout,
  type ColumnLayout,
  type TableColumn,
} from './tableColumns';

export function useTableColumns(
  tableKey: string,
  columns: readonly TableColumn[],
) {
  const storageKey = `table-columns:${tableKey}`;
  const [layout, setLayout] = useState<ColumnLayout>(() => {
    try {
      return normalizeLayout(
        JSON.parse(localStorage.getItem(storageKey) ?? 'null'),
        columns,
      );
    } catch {
      return normalizeLayout(null, columns);
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(layout));
    } catch {
      /* The current layout still works when browser storage is unavailable. */
    }
  }, [storageKey, layout]);
  const visibleKeys = layout.order.filter(
    (key) => !layout.hidden.includes(key),
  );
  return { layout, setLayout, visibleKeys };
}

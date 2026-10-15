import { useDismissDetails } from '../../hooks/useDismissDetails';
import {
  moveColumn,
  normalizeLayout,
  type ColumnLayout,
  type TableColumn,
} from './tableColumns';
import s from '../tableControls.module.css';

export function TableViewsSlot({
  columns,
  layout,
  onChange,
}: {
  columns: readonly TableColumn[];
  layout: ColumnLayout;
  onChange: (layout: ColumnLayout) => void;
}) {
  const ref = useDismissDetails();
  return (
    <details ref={ref} className={s.control}>
      <summary className={s.trigger}>Колонки</summary>
      <div className={s.popover}>
        <strong>Настройка колонок</strong>
        <ul className={s.columns}>
          {layout.order.map((key, index) => {
            const column = columns.find((item) => item.key === key)!;
            return (
              <li key={key} className={s.column}>
                <label>
                  <input
                    type="checkbox"
                    checked={!layout.hidden.includes(key)}
                    disabled={column.locked}
                    onChange={(event) =>
                      onChange({
                        ...layout,
                        hidden: event.target.checked
                          ? layout.hidden.filter((item) => item !== key)
                          : [...layout.hidden, key],
                      })
                    }
                  />
                  {column.label}
                </label>
                <div className={s.arrows}>
                  <button
                    type="button"
                    aria-label={`Переместить «${column.label}» выше`}
                    disabled={
                      column.locked ||
                      index === 0 ||
                      columns.some(
                        (item) =>
                          item.key === layout.order[index - 1] && item.locked,
                      )
                    }
                    onClick={() =>
                      onChange(moveColumn(layout, key, -1, columns))
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Переместить «${column.label}» ниже`}
                    disabled={
                      column.locked || index === layout.order.length - 1
                    }
                    onClick={() =>
                      onChange(moveColumn(layout, key, 1, columns))
                    }
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className={s.actions}>
          <button
            type="button"
            onClick={() => onChange(normalizeLayout(null, columns))}
          >
            Сбросить
          </button>
          <button
            type="button"
            onClick={() => {
              if (ref.current) ref.current.open = false;
            }}
          >
            Готово
          </button>
        </div>
      </div>
    </details>
  );
}

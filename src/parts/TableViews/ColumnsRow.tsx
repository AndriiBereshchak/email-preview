import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type ComponentProps,
  type ReactElement,
} from 'react';

export const TableColumnsContext = createContext<string[] | null>(null);

export function ColumnsRow({ children, ...props }: ComponentProps<'tr'>) {
  const order = useContext(TableColumnsContext);
  const cells = Children.toArray(children);
  if (order === null) return <tr {...props}>{cells}</tr>;
  const byColumn = new Map(
    cells.filter(isValidElement).map((cell) => {
      const element = cell as ReactElement<{ 'data-col'?: string }>;
      return [element.props['data-col'], element];
    }),
  );
  return <tr {...props}>{order.map((key) => byColumn.get(key))}</tr>;
}

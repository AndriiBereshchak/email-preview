import { type ReactNode, useId } from 'react';
import { cx as clsx } from '../utils/localModel';
import e from './emailCampaign.module.css';

export function FilterField({
  label,
  hint,
  wide,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className={clsx(e.field, wide && e.fieldWide)}
    >
      <span id={id} className={e.fieldLabel}>
        {label}
      </span>
      {children}
      {hint && <p className={e.fieldHint}>{hint}</p>}
    </div>
  );
}

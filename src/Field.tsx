import type { ReactNode } from 'react';
import e from './emailCampaign.module.css';

export const Field = ({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) => (
  <label className={e.field}>
    <span className={e.fieldLabel}>{label}</span>
    {children}
  </label>
);

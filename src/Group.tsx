import { type ReactNode, useId } from 'react';
import e from './emailCampaign.module.css';

export const Group = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className={e.group}>
      <span id={id} className={e.groupTitle}>
        {title}
      </span>
      <div className={e.groupFields}>{children}</div>
    </div>
  );
};

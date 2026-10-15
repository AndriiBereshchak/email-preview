import type { InputHTMLAttributes } from 'react';

export const Switch = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input type="checkbox" className="audience-switch" {...props} />
);

import type { InputHTMLAttributes } from 'react';

export const CustomInput = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input className="custom-input" {...props} />
);

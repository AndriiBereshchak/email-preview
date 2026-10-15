import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_APPEARANCE } from '../../utils/appearanceModel';
import LetterHeader from './LetterHeader';

vi.mock('./VersionEditor', () => ({
  default: ({
    label,
    initialHtml,
    onChange,
  }: {
    label: string;
    initialHtml: string;
    onChange: (html: string) => void;
  }) => (
    <textarea
      aria-label={label}
      defaultValue={initialHtml}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const appearance = {
  ...DEFAULT_APPEARANCE,
  headerEnabled: true,
  logoSrc: 'data:image/png;base64,AAAA',
};

it('edits header text without changing the logo or other appearance fields', () => {
  const onChange = vi.fn();
  const page = render(
    <LetterHeader appearance={appearance} onChange={onChange} />,
  );
  fireEvent.change(page.getByLabelText('Текст шапки'), {
    target: { value: '<p>Hello</p>' },
  });
  expect(onChange).toHaveBeenCalledWith({
    ...appearance,
    headerText: '<p>Hello</p>',
  });
});
describe('header pointer resizing', () => {
  it('resizes the logo width and the header height through separate handles', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 160,
      height: 120,
    } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640);
    const onChange = vi.fn();
    const page = render(
      <LetterHeader appearance={appearance} onChange={onChange} />,
    );
    fireEvent.click(page.getByRole('img', { name: 'Логотип' }));
    const logoHandle = page.getByRole('button', {
      name: 'Изменить размер логотипа',
    });
    logoHandle.setPointerCapture = vi.fn();
    fireEvent(
      logoHandle,
      new MouseEvent('pointerdown', { bubbles: true, clientX: 10 }),
    );
    fireEvent(
      logoHandle,
      new MouseEvent('pointermove', { bubbles: true, clientX: 90 }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      ...appearance,
      logoWidth: 240,
    });
    fireEvent(logoHandle, new MouseEvent('pointerup', { bubbles: true }));
    onChange.mockClear();
    fireEvent(
      logoHandle,
      new MouseEvent('pointermove', { bubbles: true, clientX: 200 }),
    );
    expect(onChange).not.toHaveBeenCalled();
    const heightHandle = page.getByRole('button', {
      name: 'Изменить высоту шапки',
    });
    heightHandle.setPointerCapture = vi.fn();
    fireEvent(
      heightHandle,
      new MouseEvent('pointerdown', { bubbles: true, clientY: 20 }),
    );
    fireEvent(
      heightHandle,
      new MouseEvent('pointermove', { bubbles: true, clientY: 100 }),
    );
    expect(onChange).toHaveBeenLastCalledWith({
      ...appearance,
      headerHeight: 200,
    });
  });
});

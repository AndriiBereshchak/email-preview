import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { useEmailDocument } from './useEmailDocument';

afterEach(cleanup);
it('invalidates only edited translations, all shared layouts, and re-added languages', () => {
  const { result } = renderHook(useEmailDocument);
  const update = (fn: Parameters<typeof result.current.setDocument>[0]) =>
    act(() => result.current.setDocument(fn));
  update((d) => ({
    ...d,
    versions: {
      ...d.versions,
      uk: { subject: 'UK', preheader: '', blocks: {} },
    },
  }));
  const before = result.current.revisions;
  update((d) => ({
    ...d,
    versions: { ...d.versions, ru: { ...d.versions.ru!, subject: 'RU' } },
  }));
  expect(result.current.revisions.ru).toBeGreaterThan(before.ru);
  expect(result.current.revisions.uk).toBe(before.uk);
  const edited = result.current.revisions;
  update((d) => ({
    ...d,
    appearance: { ...d.appearance, textColor: '#123456' },
  }));
  expect(result.current.revisions.ru).toBeGreaterThan(edited.ru);
  expect(result.current.revisions.uk).toBeGreaterThan(edited.uk);
  const shared = result.current.revisions;
  update((d) => ({
    ...d,
    sections: [{ id: 'section', columns: [{ id: 'column', blocks: [] }] }],
  }));
  expect(result.current.revisions.uk).toBeGreaterThan(shared.uk);
  const removed = result.current.revisions.uk;
  update((d) => ({ ...d, versions: { ru: d.versions.ru } }));
  update((d) => ({
    ...d,
    versions: {
      ...d.versions,
      uk: { subject: 'UK', preheader: '', blocks: {} },
    },
  }));
  expect(result.current.revisions.uk).toBeGreaterThan(removed);
  const unchanged = result.current;
  update((d) => d);
  expect(result.current).toBe(unchanged);
});

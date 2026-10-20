import { renderHook, cleanup } from '@testing-library/react';
import { expect, it } from 'vitest';
import { readAppearanceImage } from './appearanceImage';

it('rejects unsupported and oversized uploads before reading them', async () => {
  await expect(
    readAppearanceImage(
      new File(['svg'], 'background.svg', { type: 'image/svg+xml' }),
    ),
  ).rejects.toThrow('Выберите PNG');
  const file = new File(['image'], 'background.png', { type: 'image/png' });
  Object.defineProperty(file, 'size', { value: 16 * 1024 * 1024 });
  await expect(readAppearanceImage(file)).rejects.toThrow('до 15 МБ');
});

it('keeps original files as local URLs and embeds each referenced image only once', async () => {
  const { vi } = await import('vitest');
  const {
    embedEmailImages,
    emailImageUrl,
    releaseEmailImage,
    normalizeBackgroundImage,
  } = await import('./appearanceImage');
  const create = vi.fn(() => 'blob:http://localhost/image-original');
  const revoke = vi.fn();
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, {
      createObjectURL: create,
      revokeObjectURL: revoke,
    }),
  );
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        if (value) queueMicrotask(() => this.onload?.());
      }
    },
  );
  const read = vi.spyOn(FileReader.prototype, 'readAsDataURL');
  let src = '';
  try {
    const file = new File(['original animated bytes'], 'image.gif', {
      type: 'image/gif',
    });
    src = await readAppearanceImage(file);
    expect(create).toHaveBeenCalledWith(file);
    expect(read).not.toHaveBeenCalled();
    expect(emailImageUrl(src)).toBe(src);
    expect(normalizeBackgroundImage(src)).toBe(src);
    const html = `<img src="${src}"><div style="background-image:url('${src}')"></div>`;
    const embedded = await embedEmailImages(html);
    expect(embedded).not.toContain('blob:');
    expect(embedded.match(/data:image\/gif;base64,/g)).toHaveLength(2);
    expect(await embedEmailImages(html)).toBe(embedded);
    expect(read).toHaveBeenCalledTimes(1);
    releaseEmailImage(src);
    expect(revoke).toHaveBeenCalledWith(src);
    expect(emailImageUrl(src)).toBe('');
  } finally {
    releaseEmailImage(src);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  }
});

it('releases an uploaded file only after all document references disappear, and on unmount', async () => {
  const { vi } = await import('vitest');
  const { createEmailDocument } = await import('./emailDocument');
  const { useEmailImageResources } =
    await import('../hooks/useEmailImageResources');
  const { releaseEmailImage } = await import('./appearanceImage');
  let id = 0;
  const revoke = vi.fn();
  vi.stubGlobal(
    'URL',
    Object.assign(class extends URL {}, {
      createObjectURL: () => `blob:http://localhost/image-${++id}`,
      revokeObjectURL: revoke,
    }),
  );
  vi.stubGlobal(
    'Image',
    class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(value: string) {
        if (value) queueMicrotask(() => this.onload?.());
      }
    },
  );
  const src = await readAppearanceImage(
    new File(['bytes'], 'image.png', { type: 'image/png' }),
  );
  try {
    const document = createEmailDocument(['ru', 'uk']);
    document.versions.ru!.blocks.image = { type: 'image', src, alt: '' };
    document.versions.uk!.blocks.image = { type: 'image', src, alt: '' };
    const { rerender, unmount } = renderHook(
      ({ document }) => useEmailImageResources(document),
      { initialProps: { document } },
    );
    rerender({
      document: {
        ...document,
        versions: {
          ru: { ...document.versions.ru!, blocks: {} },
          uk: document.versions.uk,
        },
      },
    });
    expect(revoke).not.toHaveBeenCalled();
    rerender({
      document: {
        ...document,
        versions: { ru: { ...document.versions.ru!, blocks: {} } },
      },
    });
    expect(revoke).toHaveBeenCalledTimes(1);
    const next = await readAppearanceImage(
      new File(['next'], 'next.png', { type: 'image/png' }),
    );
    rerender({
      document: {
        ...document,
        appearance: { ...document.appearance, backgroundImage: next },
        versions: {},
      },
    });
    unmount();
    expect(revoke).toHaveBeenCalledWith(next);
  } finally {
    cleanup();
    releaseEmailImage(src);
    vi.unstubAllGlobals();
  }
});

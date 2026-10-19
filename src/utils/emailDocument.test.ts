import { letterImageHtml } from './emailHtml';
import { linkValue, saveLetterLink } from './letterLink';
import { renderLocalPreview } from './localModel';
import { describe, expect, it } from 'vitest';
import { createEmailDocument, type EmailDocument } from './emailDocument';
import { renderEmailDocument } from './renderEmailDocument';

function fixture(): EmailDocument {
  const document = createEmailDocument(['uk', 'en']);
  document.sections = [
    {
      id: 'card',
      background: '#202536',
      borderColor: '#2e7a55',
      borderRadius: 12,
      columns: [
        {
          id: 'copy',
          weight: 3,
          blocks: [
            { id: 'title', type: 'text', variant: 'heading' },
            { id: 'description', type: 'text' },
            { id: 'cta', type: 'button', alignment: 'center' },
          ],
        },
        { id: 'picture', weight: 1, blocks: [{ id: 'art', type: 'image' }] },
      ],
    },
  ];
  document.versions.uk = {
    subject: 'Пропозиція',
    preheader: 'Умови акції',
    blocks: {
      title: { type: 'text', text: 'Заголовок' },
      description: { type: 'text', text: 'Перший рядок\nДругий рядок' },
      cta: {
        type: 'button',
        text: 'Почати',
        href: 'https://example.test/uk?a=1&b=2',
      },
      art: {
        type: 'image',
        src: 'https://example.test/uk.png',
        alt: 'Ілюстрація',
        href: 'https://example.test/uk',
      },
    },
  };
  document.versions.en = {
    subject: 'Offer',
    preheader: 'Promotion details',
    blocks: {
      title: { type: 'text', text: 'Heading' },
      description: { type: 'text', text: 'Description' },
      cta: { type: 'button', text: 'Start', href: 'https://example.test/en' },
      art: {
        type: 'image',
        src: 'https://example.test/en.png',
        alt: 'Illustration',
      },
    },
  };
  return document;
}

describe('email document model', () => {
  it('creates independent empty drafts', () => {
    const first = createEmailDocument(['uk', 'en']);
    const second = createEmailDocument(['uk']);
    first.versions.uk!.subject = 'Changed';
    first.appearance.background = '#112233';
    expect(second.versions.uk!.subject).toBe('');
    expect(second.appearance.background).toBe('#ffffff');
    expect(first.sections).toEqual([]);
  });

  it('supports any number of sections, columns and blocks without a two-column cap', () => {
    const document = createEmailDocument(['uk']);
    document.sections = Array.from({ length: 25 }, (_, section) => ({
      id: `section-${section}`,
      columns: Array.from({ length: 7 }, (_, column) => ({
        id: `column-${section}-${column}`,
        blocks: Array.from({ length: 3 }, (_, block) => ({
          id: `block-${section}-${column}-${block}`,
          type: 'text' as const,
        })),
      })),
    }));
    expect(document.sections).toHaveLength(25);
    expect(document.sections[24].columns).toHaveLength(7);
    expect(
      renderEmailDocument(document, 'uk').html.match(/data-column-id=/g),
    ).toHaveLength(175);
  });

  it('keeps inherited object keys from corrupting content maps', () => {
    const document = fixture();
    document.sections[0].columns[0].blocks[0].id = '__proto__';
    document.versions.uk!.blocks = JSON.parse(
      JSON.stringify(document.versions.uk!.blocks).replace(
        '"title":',
        '"__proto__":',
      ),
    );
    document.versions.en!.blocks = JSON.parse(
      JSON.stringify(document.versions.en!.blocks).replace(
        '"title":',
        '"__proto__":',
      ),
    );
    expect(renderEmailDocument(document, 'uk').text).toContain('Заголовок');
  });
});

describe('email document renderer', () => {
  it('renders each language using the shared structure without modifying the draft', () => {
    const document = fixture();
    const saved = JSON.stringify(document);
    const uk = renderEmailDocument(document, 'uk');
    const en = renderEmailDocument(document, 'en');
    expect(uk.subject).toBe('Пропозиція');
    expect(en.subject).toBe('Offer');
    for (const preview of [uk, en]) {
      expect(preview.html).toContain('data-section-id="card"');
      expect(preview.html).toContain('border:1px solid #2e7a55');
      expect(preview.html).toContain('border-radius:12px');
      expect(preview.html).toContain('data-column-id="picture"');
      expect(preview.width).toBe(672);
      expect(preview.notes).toEqual([]);
    }
    expect(uk.html).toContain('https://example.test/uk.png');
    expect(en.html).toContain('https://example.test/en.png');
    expect(en.html).not.toContain('Заголовок');
    expect(uk.text).toBe(
      'Заголовок\n\nПерший рядок\nДругий рядок\n\nПочати — https://example.test/uk?a=1&b=2\n\nІлюстрація — https://example.test/uk',
    );
    expect(JSON.stringify(document)).toBe(saved);
  });

  it('uses column proportions and emits mobile stacking plus Outlook table fallbacks', () => {
    const document = fixture();
    document.sections[0].borderColor = undefined;
    const preview = renderEmailDocument(document, 'uk');
    expect(preview.html).toContain('max-width:420.0000px');
    expect(preview.html).toContain('max-width:140.0000px');
    expect(preview.html).toContain('@media only screen and (max-width:600px)');
    expect(preview.html).toContain(
      'display:block!important;width:100%!important;max-width:100%!important;',
    );
    expect(preview.html).toContain('<!--[if mso]><td width="420.00"');
    expect(preview.html).not.toContain('sun-editor');
    expect(preview.html).not.toContain('email-header');
    expect(preview.html).not.toContain('email-footer');
  });

  it('normalizes large weights without overflowing widths', () => {
    const document = fixture();
    document.sections[0].columns.forEach((column) => {
      column.weight = Number.MAX_VALUE;
    });
    const html = renderEmailDocument(document, 'uk').html;
    expect(html).not.toMatch(/NaN|Infinity/);
    expect(html).toContain('max-width:279.0000px');
  });

  it('escapes text, metadata, image descriptions and link attributes', () => {
    const document = fixture();
    document.versions.uk!.subject = '</title><script>alert(1)</script>';
    document.versions.uk!.preheader = '<img src=x onerror=alert(1)>';
    document.versions.uk!.blocks.title = {
      type: 'text',
      text: '<script>alert(1)</script> & text',
    };
    document.versions.uk!.blocks.art = {
      type: 'image',
      src: 'https://example.test/p.png',
      alt: '\" onerror=\"alert(1)',
    };
    const preview = renderEmailDocument(document, 'uk');
    expect(preview.html).not.toContain('<script>');
    expect(preview.html).toContain(
      '&lt;script&gt;alert(1)&lt;/script&gt; &amp; text',
    );
    expect(preview.html).toContain(
      'href="https://example.test/uk?a=1&amp;b=2"',
    );
    expect(preview.html).toContain('alt="&quot; onerror=&quot;alert(1)"');
    expect(preview.text).toContain('<script>alert(1)</script> & text');
  });

  it('renders incomplete content silently without borrowing text from another language', () => {
    const document = fixture();
    delete document.versions.uk!.blocks.title;
    document.versions.uk!.blocks.cta = { type: 'button', text: '', href: '' };
    const preview = renderEmailDocument(document, 'uk');
    expect(preview.notes).toEqual([]);
    expect(preview.html).not.toContain('Heading');
    expect(preview.html).not.toContain('href=""');
    delete document.versions.en;
    expect(() => renderEmailDocument(document, 'en')).toThrow(
      'Missing email document version',
    );
  });

  it('renders global and section backgrounds, including text above a section image', () => {
    const document = fixture();
    document.appearance.pageBackgroundImage = 'data:image/png;base64,YQ==';
    document.appearance.backgroundImage = 'data:image/jpeg;base64,Yg==';
    document.sections[0].backgroundImage = 'https://example.test/banner.png';
    const preview = renderEmailDocument(document, 'uk');
    expect(preview.html).toContain('data:image/png;base64,YQ==');
    expect(preview.html).toContain('data:image/jpeg;base64,Yg==');
    expect(preview.html).toContain(
      'background-image:url(&#39;https://example.test/banner.png&#39;)',
    );
    expect(preview.html).toContain('Заголовок');
    expect(preview.notes).toEqual([]);
  });

  it('renders a valid empty draft and accepts unfinished image blocks', () => {
    const draft = createEmailDocument(['uk', 'en']);
    for (const locale of ['uk', 'en'] as const) {
      const empty = renderEmailDocument(draft, locale);
      expect(empty.text).toBe('');
      expect(empty.html).toContain('<!doctype html>');
      expect(empty.notes).toEqual([]);
    }
    const document = fixture();
    document.versions.uk!.blocks.art = { type: 'image', src: '', alt: '' };
    const preview = renderEmailDocument(document, 'uk');
    expect(preview.notes).toEqual([]);
    expect(preview.html).not.toContain('src=""');
  });

  it('uses the same envelope as the existing HTML preview', () => {
    const document = fixture();
    document.appearance.background = '#ffeedd';
    document.appearance.pageBackgroundImage = 'data:image/png;base64,YQ==';
    const generated = renderEmailDocument(document, 'uk');
    const generatedDom = new DOMParser().parseFromString(
      generated.html,
      'text/html',
    );
    const legacy = renderLocalPreview(
      {
        locale: 'uk',
        subject: document.versions.uk!.subject,
        preheader: document.versions.uk!.preheader,
        html: generatedDom.querySelector('.email-body')!.innerHTML,
      },
      document.appearance,
    );
    const legacyDom = new DOMParser().parseFromString(legacy.html, 'text/html');
    expect(
      generatedDom.querySelector('.email-sheet')?.getAttribute('style'),
    ).toBe(legacyDom.querySelector('.email-sheet')?.getAttribute('style'));
    expect(
      generatedDom.querySelector('.email-body')?.getAttribute('style'),
    ).toBe(legacyDom.querySelector('.email-body')?.getAttribute('style'));
    expect(generatedDom.title).toBe(legacyDom.title);
    expect(generated.width).toBe(legacy.width);
    expect(legacyDom.querySelector('.email-body')?.innerHTML).toBe(
      generatedDom.querySelector('.email-body')?.innerHTML,
    );
  });

  it('omits unsafe links and image URLs, while keeping the rest of the draft', () => {
    const document = fixture();
    document.versions.uk!.blocks.cta = {
      type: 'button',
      text: 'Start',
      href: 'javascript:alert(1)',
    };
    document.versions.uk!.blocks.art = {
      type: 'image',
      src: 'data:image/svg+xml;base64,AAAA',
      alt: 'Unsafe',
    };
    document.sections[0].backgroundImage =
      "https://example.test/img');color:red";
    document.sections[0].background = 'red;display:none';
    const preview = renderEmailDocument(document, 'uk');
    expect(preview.html).not.toContain('javascript:');
    expect(preview.html).not.toContain('data:image/svg');
    expect(preview.html).not.toContain('red;display:none');
    expect(preview.html).not.toContain("img');color:red");
    expect(preview.text).toContain('Заголовок');
    expect(preview.notes).toEqual([]);
    expect(preview.text).not.toContain('javascript:');
  });

  it('handles unfinished column weights without invalid CSS', () => {
    const document = fixture();
    for (const invalid of [0, -1, NaN, Infinity]) {
      document.sections[0].columns[0].weight = invalid;
      const html = renderEmailDocument(document, 'uk').html;
      expect(html).not.toMatch(/NaN|Infinity/);
      expect(html).toContain('max-width:279.0000px');
    }
  });
});

it('keeps button layout consistent between the existing editor and block renderer', () => {
  const letter = fixture();
  const root = document.createElement('div');
  const editorButton = saveLetterLink(
    root,
    {
      ...linkValue(null, 'button', 'Start', letter.appearance.linkColor),
      url: 'https://example.test',
    },
    null,
    null,
  );
  const preview = renderEmailDocument(letter, 'en');
  const html = new DOMParser().parseFromString(preview.html, 'text/html');
  const blockButton = html.querySelector<HTMLAnchorElement>('.email-body a')!;
  for (const property of [
    'display',
    'background-color',
    'border-radius',
    'font-size',
    'padding',
    'max-width',
    'box-sizing',
    'overflow-wrap',
    'line-height',
  ]) {
    expect(blockButton.style.getPropertyValue(property)).toBe(
      editorButton.style.getPropertyValue(property),
    );
  }
});

it('uses the existing image HTML for gallery insertion and full-width blocks', () => {
  const letter = fixture();
  const editorImage = new DOMParser()
    .parseFromString(
      letterImageHtml({
        url: 'https://example.test/en.png',
        name: 'Illustration',
      }),
      'text/html',
    )
    .querySelector('img')!;
  const blockImage = new DOMParser()
    .parseFromString(renderEmailDocument(letter, 'en').html, 'text/html')
    .querySelector('img')!;
  expect(blockImage.getAttribute('src')).toBe(editorImage.getAttribute('src'));
  expect(blockImage.getAttribute('alt')).toBe(editorImage.getAttribute('alt'));
  expect(blockImage.style.maxWidth).toBe(editorImage.style.maxWidth);
  expect(blockImage.style.height).toBe(editorImage.style.height);
  expect(blockImage.style.width).toBe('100%');
});

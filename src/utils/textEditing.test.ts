import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyTextLayout,
  applyTextSelection,
  selectedTextBlocks,
  applyParagraphBackground,
  readTextLayout,
  textBlock,
} from './textEditing';
import { previewKey, renderLocalPreview } from './localModel';
let root: HTMLDivElement;
beforeEach(() => {
  root = document.createElement('div');
  root.innerHTML =
    '<h2>Заголовок</h2><p><strong>Текст</strong> <a href="https://example.test"><span style="font-size:12px;color:red">посилання</span></a></p><p>Сусідній абзац</p><div class="se-component"><figure><img src="x"><figcaption><p>Підпис</p></figcaption></figure></div>';
  document.body.append(root);
});
afterEach(() => root.remove());
describe('text block appearance', () => {
  it('targets a heading or paragraph from nested text but excludes image captions', () => {
    expect(textBlock(root, root.querySelector('span')!)).toBe(root.children[1]);
    expect(textBlock(root, root.querySelector('h2')!)).toBe(root.children[0]);
    expect(textBlock(root, root.querySelector('figcaption p')!)).toBeNull();
    expect(textBlock(root, document.createElement('p'))).toBeNull();
  });
  it('formats only the chosen paragraph and keeps its text, link and emphasis', () => {
    const block = root.children[1] as HTMLElement;
    const sibling = root.children[2].outerHTML;
    applyTextLayout(root, block, {
      fontSize: 24,
      alignment: 'center',
      lineHeight: 1.8,
      spaceAfter: 32,
    });
    expect(block.style.fontSize).toBe('24px');
    expect(block.style.textAlign).toBe('center');
    expect(block.style.lineHeight).toBe('1.8');
    expect(block.style.marginBottom).toBe('32px');
    expect(block.querySelector<HTMLElement>('span')?.style.fontSize).toBe('');
    expect(block.querySelector<HTMLElement>('span')?.style.color).toBe('red');
    expect(block.querySelector('a')?.href).toBe('https://example.test/');
    expect(block.querySelector('strong')?.textContent).toBe('Текст');
    expect(root.children[2].outerHTML).toBe(sibling);
    expect(readTextLayout(block)).toEqual({
      fontSize: 24,
      alignment: 'center',
      lineHeight: 1.8,
      spaceAfter: 32,
    });
  });
  it('preserves text formatting in preview and changes the review key', () => {
    const draft = {
      locale: 'uk' as const,
      subject: 'Тема',
      preheader: '',
      html: root.innerHTML,
    };
    const key = previewKey('TRADER', draft);
    applyTextLayout(root, root.querySelector('h2')!, {
      fontSize: 36,
      alignment: 'right',
      spaceAfter: 24,
    });
    const updated = { ...draft, html: root.innerHTML };
    const doc = new DOMParser().parseFromString(
      renderLocalPreview(updated).html,
      'text/html',
    );
    expect(doc.querySelector('h2')?.style.fontSize).toBe('36px');
    expect(doc.querySelector('h2')?.style.textAlign).toBe('right');
    expect(doc.querySelector('h2')?.style.marginBottom).toBe('24px');
    expect(previewKey('TRADER', updated)).not.toBe(key);
  });
  it('rejects invalid values and elements outside the editor without modifying content', () => {
    const block = root.querySelector('p')!;
    const before = root.innerHTML;
    for (const patch of [
      { fontSize: NaN },
      { fontSize: -1 },
      { lineHeight: 0 },
      { spaceAfter: -10 },
    ]) {
      expect(applyTextLayout(root, block, patch)).toBe(false);
      expect(root.innerHTML).toBe(before);
    }
    expect(
      applyTextLayout(root, document.createElement('p'), { fontSize: 20 }),
    ).toBe(false);
  });
});

describe('selected text appearance', () => {
  it('formats part of a word without changing adjacent text', () => {
    root.innerHTML = '<p>Hello world again</p>';
    const text = root.querySelector('p')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 6);
    range.setEnd(text, 11);
    const result = applyTextSelection(root, range, {
      fontFamily: 'Georgia',
      fontSize: 24,
      backgroundColor: '#ffff00',
      color: '#ff0000',
    });
    expect(result?.toString()).toBe('world');
    const span = root.querySelector('span')!;
    expect(span.textContent).toBe('world');
    expect(span.style.fontSize).toBe('24px');
    expect(span.style.backgroundColor).toBe('rgb(255, 255, 0)');
    expect(root.querySelector('p')!.style.fontSize).toBe('');
    expect(root.textContent).toBe('Hello world again');
    applyTextSelection(root, result!, { fontWeight: 'bold' });
    expect(root.querySelector('span')!.textContent).toBe('world');
    expect(root.querySelector('span')!.style.fontWeight).toBe('bold');
  });
  it('preserves links and paragraphs across a selection and in preview', () => {
    root.innerHTML =
      '<p>First <a href="https://example.test">link</a></p><p>Second end</p>';
    const range = document.createRange();
    range.setStart(root.querySelector('p')!.firstChild!, 2);
    range.setEnd(root.querySelectorAll('p')[1].firstChild!, 6);
    applyTextSelection(root, range, {
      fontStyle: 'italic',
      backgroundColor: '#ffff00',
    });
    expect(root.querySelectorAll('p')).toHaveLength(2);
    expect(root.querySelector('a')!.href).toBe('https://example.test/');
    expect(root.querySelector('a span')!.textContent).toBe('link');
    const html = renderLocalPreview({
      locale: 'uk',
      subject: 'Test',
      preheader: '',
      html: root.innerHTML,
    }).html;
    expect(html).toContain('background-color: rgb(255, 255, 0)');
    expect(html).toContain('font-style: italic');
  });
  it('ignores collapsed and outside ranges', () => {
    const range = document.createRange();
    range.selectNodeContents(root.querySelector('p')!);
    range.collapse(true);
    const before = root.innerHTML;
    expect(applyTextSelection(root, range, { fontSize: 20 })).toBeNull();
    range.selectNodeContents(document.body);
    expect(applyTextSelection(root, range, { fontSize: 20 })).toBeNull();
    expect(root.innerHTML).toBe(before);
  });
});

it('removes highlighting from only the selected words', () => {
  root.innerHTML =
    '<p><span style="background-color:yellow;color:red">Hello world again</span></p>';
  const text = root.querySelector('span')!.firstChild!;
  const range = document.createRange();
  range.setStart(text, 6);
  range.setEnd(text, 11);
  applyTextSelection(root, range, { backgroundColor: 'transparent' });
  const spans = Array.from(root.querySelectorAll('span'));
  expect(spans.map((span) => span.textContent)).toEqual([
    'Hello ',
    'world',
    ' again',
  ]);
  expect(spans[0].style.backgroundColor).toBe('yellow');
  expect(spans[1].style.backgroundColor).toBe('transparent');
  expect(spans[1].style.color).toBe('red');
  expect(spans[2].style.backgroundColor).toBe('yellow');
});

it('applies paragraph settings and full-width background to all selected paragraphs', () => {
  root.innerHTML = '<p>First</p><p>Second</p><p>Third</p>';
  const paragraphs = root.querySelectorAll('p');
  const range = document.createRange();
  range.setStart(paragraphs[0].firstChild!, 2);
  range.setEnd(paragraphs[2].firstChild!, 0);
  const blocks = selectedTextBlocks(root, range);
  expect(blocks).toEqual([paragraphs[0], paragraphs[1]]);
  blocks.forEach((block) =>
    applyTextLayout(root, block, {
      alignment: 'center',
      lineHeight: 2,
      spaceAfter: 24,
    }),
  );
  applyParagraphBackground(blocks, '#ff0000');
  expect(paragraphs[0].style.textAlign).toBe('center');
  expect(paragraphs[1].style.lineHeight).toBe('2');
  expect(paragraphs[1].style.padding).toContain('24px');
  expect(paragraphs[1].style.marginLeft).toContain('--email-content-padding');
  expect(paragraphs[1].style.padding).toContain('--email-content-padding');
  expect(paragraphs[2].getAttribute('style')).toBeNull();
  const preview = renderLocalPreview({
    locale: 'uk',
    subject: 'Test',
    preheader: '',
    html: root.innerHTML,
  }).html;
  expect(preview).toContain('--email-content-padding:24px');
  expect(preview).toContain(
    'margin-left: calc(-1 * var(--email-content-padding, 0px))',
  );
  applyParagraphBackground(blocks, 'transparent');
  expect(paragraphs[1].style.marginLeft).toBe('');
  expect(paragraphs[1].style.paddingLeft).toBe('');
  expect(paragraphs[1].style.marginBottom).toBe('24px');
});

it('paints spacing between colored paragraphs and preserves editable spacing', () => {
  root.innerHTML =
    '<p style="margin-bottom:16px">First</p><p style="margin-top:8px;margin-bottom:24px">Second</p><p>Third</p>';
  const blocks = Array.from(root.querySelectorAll('p')).slice(0, 2);
  applyParagraphBackground(blocks, '#ff0000');
  expect(blocks[0].style.marginBottom).toBe('0px');
  expect(blocks[0].style.padding).toContain('16px');
  expect(blocks[1].style.marginTop).toBe('0px');
  expect(blocks[1].style.padding).toMatch(/^8px /);
  expect(readTextLayout(blocks[0]).spaceAfter).toBe(16);
  applyTextLayout(root, blocks[0], { spaceAfter: 32 });
  expect(blocks[0].style.marginBottom).toBe('0px');
  expect(blocks[0].style.padding).toContain('32px');
  applyParagraphBackground(blocks, '#00ff00');
  expect(blocks[0].style.padding).toContain('32px');
  const draft = {
    locale: 'uk' as const,
    subject: 'Test',
    preheader: '',
    html: root.innerHTML,
  };
  const preview = new DOMParser().parseFromString(
    renderLocalPreview(draft).html,
    'text/html',
  );
  expect(
    (preview.querySelector('.email-body p') as HTMLElement).style.padding,
  ).toContain('32px');
  applyParagraphBackground(blocks, 'transparent');
  expect(blocks[0].style.marginBottom).toBe('32px');
  expect(blocks[0].style.paddingBottom).toBe('');
  expect(blocks[1].style.marginTop).toBe('8px');
  expect(blocks[1].style.marginBottom).toBe('24px');
  expect(root.querySelectorAll('p')[2].getAttribute('style')).toBeNull();
});

import { expect, it } from 'vitest';
import { createEmailDocument } from './emailDocument';
import {
  emailBlockRows,
  moveEmailBlock,
  placeEmailBlockBeside,
  resizeEmailBlockWidth,
} from './emailDocumentLayout';
import { renderEmailDocument } from './renderEmailDocument';

function fixture() {
  const document = createEmailDocument(['ru', 'uk']);
  document.sections = [
    {
      id: 's',
      columns: [
        {
          id: 'col',
          blocks: [
            { id: 'heading', type: 'text' },
            { id: 'image', type: 'image', widthPercent: 20 },
            { id: 'tail', type: 'text' },
          ],
        },
      ],
    },
  ];
  for (const locale of ['ru', 'uk'] as const)
    document.versions[locale]!.blocks = {
      heading: { type: 'text', text: 'Above' },
      image: {
        type: 'image',
        src: 'https://example.test/image.png',
        alt: 'Image',
      },
      tail: { type: 'text', text: 'Below' },
    };
  return document;
}

it('places content in the space beside a small image without moving the blocks above or below', () => {
  const document = fixture();
  const next = placeEmailBlockBeside(
    document,
    'col',
    'image',
    { id: 'copy', type: 'text' },
    'left',
    'row',
  );
  expect(next.versions).toBe(document.versions);
  expect(
    emailBlockRows(next.sections[0].columns[0].blocks).map((row) =>
      row.map((block) => block.id),
    ),
  ).toEqual([['heading'], ['copy', 'image'], ['tail']]);
  expect(
    next.sections[0].columns[0].blocks.find((block) => block.id === 'copy')
      ?.widthPercent,
  ).toBe(80);
  expect(
    next.sections[0].columns[0].blocks.find((block) => block.id === 'image')
      ?.widthPercent,
  ).toBe(20);
});

it('adds several neighbors without duplicating block IDs or translations', () => {
  let document = fixture();
  const versions = document.versions;
  document = placeEmailBlockBeside(
    document,
    'col',
    'image',
    { id: 'copy', type: 'text' },
    'left',
    'row',
  );
  document = placeEmailBlockBeside(
    document,
    'col',
    'image',
    { id: 'cta', type: 'button' },
    'right',
    'ignored-new-row',
  );
  const row = emailBlockRows(document.sections[0].columns[0].blocks)[1];
  expect(row.map((block) => block.id)).toEqual(['copy', 'image', 'cta']);
  expect(row.find((block) => block.id === 'image')!.widthPercent).toBe(20);
  expect(row.find((block) => block.id === 'cta')!.widthPercent).toBe(40);
  expect(row.reduce((sum, block) => sum + block.widthPercent!, 0)).toBeCloseTo(
    100,
  );
  expect(document.versions).toBe(versions);
  document = placeEmailBlockBeside(
    document,
    'col',
    'image',
    document.sections[0].columns[0].blocks[0],
    'left',
    'unused',
  );
  expect(
    document.sections[0].columns[0].blocks.filter(
      (block) => block.id === 'heading',
    ),
  ).toHaveLength(1);
});

it('resizes image content within its row cell without changing neighboring widths', () => {
  let document = placeEmailBlockBeside(
    fixture(),
    'col',
    'image',
    { id: 'copy', type: 'text' },
    'left',
    'row',
  );
  const original = emailBlockRows(document.sections[0].columns[0].blocks)[1];
  const widths = original.map((block) => block.widthPercent);
  document = resizeEmailBlockWidth(document, 'image', 35);
  const row = emailBlockRows(document.sections[0].columns[0].blocks)[1];
  expect(row.map((block) => block.widthPercent)).toEqual(widths);
  expect(row.find((block) => block.id === 'image')!.contentWidthPercent).toBe(
    35,
  );
  expect(row.find((block) => block.id === 'copy')).toBe(
    original.find((block) => block.id === 'copy'),
  );
  document = resizeEmailBlockWidth(document, 'image', 1000);
  expect(
    emailBlockRows(document.sections[0].columns[0].blocks)[1].every(
      (block) => block.widthPercent! > 0,
    ),
  ).toBe(true);
  expect(
    emailBlockRows(document.sections[0].columns[0].blocks)[1].reduce(
      (sum, block) => sum + block.widthPercent!,
      0,
    ),
  ).toBeCloseTo(100);
});

it('renders a shared row in email HTML and stacks its cells on mobile', () => {
  const document = placeEmailBlockBeside(
    fixture(),
    'col',
    'image',
    { id: 'copy', type: 'text' },
    'left',
    'row',
  );
  document.versions.ru!.blocks.copy = { type: 'text', text: 'Beside' };
  const html = renderEmailDocument(document, 'ru').html;
  expect(html).toContain('data-row-id="row"');
  expect(html).toMatch(/width="80(?:\.0+)?%"/);
  expect(html).toMatch(/width="20(?:\.0+)?%"/);
  expect(html).toContain('.email-inline-cell{display:block!important;');
  expect(html.indexOf('Above')).toBeLessThan(html.indexOf('Beside'));
  expect(html.indexOf('Beside')).toBeLessThan(html.indexOf('Below'));
  expect(html).not.toContain('data-add-column-id');
  expect(renderEmailDocument(document, 'uk').html).toContain(
    'https://example.test/image.png',
  );
});

it('moves a block out of a shared row without leaving it attached to another row', () => {
  let document = placeEmailBlockBeside(
    fixture(),
    'col',
    'image',
    { id: 'copy', type: 'text' },
    'left',
    'row',
  );
  document = moveEmailBlock(document, 'copy', 'col');
  expect(document.sections[0].columns[0].blocks.at(-1)).toMatchObject({
    id: 'copy',
    rowId: undefined,
  });
  expect(
    emailBlockRows(document.sections[0].columns[0].blocks).every(
      (row) => row.length === 1,
    ),
  ).toBe(true);
});

it('exports button dimensions and uses row layout when a neighbor is added', () => {
  const document = fixture();
  document.sections[0].columns[0].blocks = [
    {
      id: 'cta',
      type: 'button',
      insetPercent: 12.5,
      buttonWidth: 160,
      paddingY: 20,
    },
  ];
  document.versions.ru!.blocks.cta = {
    type: 'button',
    text: 'Next',
    href: 'https://example.test',
  };
  const html = renderEmailDocument(document, 'ru').html;
  expect(html).toContain('padding-left:12.5%;text-align:left;');
  expect(html).toContain('width:160px;');
  expect(html).toContain('padding-top:20px;padding-bottom:20px;');
  expect(html).not.toContain('draggable');
  const shared = placeEmailBlockBeside(
    document,
    'col',
    'cta',
    { id: 'text', type: 'text' },
    'right',
    'row',
    23,
  );
  expect(
    shared.sections[0].columns[0].blocks.map((block) => block.widthPercent),
  ).toEqual([23, 77]);
  expect(renderEmailDocument(shared, 'ru').html).not.toContain(
    'padding-left:12.5%',
  );
});

it('keeps a shared-row image within its desktop width when the row stacks on mobile', () => {
  const document = placeEmailBlockBeside(
    fixture(),
    'col',
    'image',
    { id: 'copy', type: 'text' },
    'right',
    'row',
  );
  document.versions.ru!.blocks.copy = { type: 'text', text: 'Beside' };
  const html = renderEmailDocument(document, 'ru').html;
  const image = html.match(/<img[^>]+alt="Image"[^>]*>/)![0];
  const maxWidth = Number(image.match(/max-width:([\d.]+)px/)![1]);
  expect(maxWidth).toBeCloseTo((640 - 48 - 32 - 16) * 0.2 - 8);
  expect(image).toContain('width:100%');
});

it('exports independent text and image widths inside unchanged row cells', () => {
  let doc = placeEmailBlockBeside(
    fixture(),
    'col',
    'image',
    { id: 'copy', type: 'text' },
    'right',
    'pair',
  );
  doc.versions.ru!.blocks.copy = { type: 'text', text: 'Independent text' };
  const widths = emailBlockRows(doc.sections[0].columns[0].blocks)[1].map(
    (block) => block.widthPercent,
  );
  doc = resizeEmailBlockWidth(doc, 'image', 40);
  doc = resizeEmailBlockWidth(doc, 'copy', 60);
  const html = new DOMParser().parseFromString(
    renderEmailDocument(doc, 'ru').html,
    'text/html',
  );
  const cells = Array.from(
    html.querySelectorAll<HTMLElement>('.email-inline-cell'),
  );
  expect(cells.map((cell) => parseFloat(cell.style.width))).toEqual(widths);
  expect(cells[0].querySelector('img')!.style.width).toBe('40%');
  expect(cells[1].querySelector('p')!.style.width).toBe('60%');
  doc = resizeEmailBlockWidth(doc, 'copy');
  expect(
    doc.sections[0].columns[0].blocks.find((block) => block.id === 'copy')!
      .contentWidthPercent,
  ).toBeUndefined();
});

it.each(['text', 'image', 'button'] as const)(
  'preserves a %s and its neighbor when inserting into free cell space',
  (type) => {
    for (const side of ['left', 'right'] as const) {
      const doc = fixture();
      doc.sections[0].columns[0].blocks = [
        {
          id: 'anchor',
          type,
          rowId: 'pair',
          widthPercent: 50,
          contentWidthPercent: 50,
        },
        { id: 'neighbor', type: 'text', rowId: 'pair', widthPercent: 50 },
      ];
      const neighbor = doc.sections[0].columns[0].blocks[1];
      const versions = doc.versions;
      const result = placeEmailBlockBeside(
        doc,
        'col',
        'anchor',
        { id: 'new', type: 'text' },
        side,
        'unused',
        undefined,
        {
          cellWidth: 208,
          contentWidth: 100,
          offset: side === 'left' ? 80 : 20,
          freeWidth: 80,
        },
      );
      const blocks = result.sections[0].columns[0].blocks;
      const anchor = blocks.find((block) => block.id === 'anchor')!;
      const unchanged = blocks.find((block) => block.id === 'neighbor')!;
      const newCellWidth = (anchor.widthPercent! / 100) * 416;
      expect(unchanged.widthPercent).toBe(neighbor.widthPercent);
      if (anchor.type === 'button') {
        expect(anchor.buttonWidth).toBe(100);
        expect((anchor.insetPercent! / 100) * (newCellWidth - 8)).toBeCloseTo(
          side === 'left' ? 0 : 20,
        );
      } else {
        expect(
          (anchor.contentWidthPercent! / 100) * (newCellWidth - 8),
        ).toBeCloseTo(100);
        expect(
          (anchor.offsetPercent! / 100) * (newCellWidth - 8 - 100),
        ).toBeCloseTo(side === 'left' ? 0 : 20);
      }
      expect(
        blocks.reduce((sum, block) => sum + block.widthPercent!, 0),
      ).toBeCloseTo(100);
      expect(result.versions).toBe(versions);
    }
  },
);

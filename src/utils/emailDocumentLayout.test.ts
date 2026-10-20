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

it('resizes the image within a shared row while the neighbors fill the remaining width', () => {
  let document = placeEmailBlockBeside(
    fixture(),
    'col',
    'image',
    { id: 'copy', type: 'text' },
    'left',
    'row',
  );
  document = resizeEmailBlockWidth(document, 'image', 35);
  const row = emailBlockRows(document.sections[0].columns[0].blocks)[1];
  expect(row.map((block) => block.widthPercent)).toEqual([65, 35]);
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

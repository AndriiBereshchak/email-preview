import { describe, expect, it, vi } from 'vitest';
import {
  EMPTY_TRADER_FILTERS,
  EMPTY_PARTNER_FILTERS,
  countAudience,
} from '../utils/audienceModel';
import {
  campaignStore,
  createCampaignStore,
  type LaunchInput,
} from './campaignStore';

const makeInput = () =>
  ({
    key: 'campaign-a',
    target: 'TRADER',
    filters: structuredClone(EMPTY_TRADER_FILTERS),
    letters: [
      {
        locale: 'ru',
        subject: 'Test RU',
        preheader: 'Preview',
        html: '<p>Hello</p>',
      },
      {
        locale: 'uk',
        subject: 'Test UK',
        preheader: '',
        html: '<p>Привіт</p>',
      },
    ],
    defaultLocale: 'ru',
    expectedRecipients: 24,
    everyoneConfirmed: true,
  }) satisfies LaunchInput;

describe('createCampaignStore', () => {
  it('starts a campaign only once for the same launch key', () => {
    const store = createCampaignStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const input = makeInput();
    const id = store.start(input);

    expect(store.start(input)).toBe(id);
    expect(store.getSnapshot()).toHaveLength(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('assigns recipients without their own version to the default language', () => {
    const store = createCampaignStore();
    store.start(makeInput());
    const campaign = store.getSnapshot()[0];

    expect(campaign.numbers.total).toBe(24);
    expect(
      campaign.versions.map((version) => [
        version.locale,
        version.numbers.total,
      ]),
    ).toEqual([
      ['ru', 16],
      ['uk', 8],
    ]);
  });

  it('keeps a copy of the launched letter and audience filters', () => {
    const store = createCampaignStore();
    const input = makeInput();
    store.start(input);
    input.letters[0].subject = 'Changed after launch';
    input.filters.countryCodes.push('UA');

    const campaign = store.getSnapshot()[0];
    expect(campaign.letters[0].subject).toBe('Test RU');
    expect(campaign.audience.filters.countryCodes).toEqual([]);
  });

  it('advances sending without changing earlier snapshots', () => {
    const store = createCampaignStore();
    store.start(makeInput());
    const initial = store.getSnapshot()[0];
    store.advance();
    const sending = store.getSnapshot()[0];

    expect(sending.phase).toBe('sending');
    expect(sending.numbers.sent).toBeGreaterThan(0);
    expect(sending.numbers.sent + sending.numbers.queued).toBe(24);
    expect(initial.numbers.sent).toBe(0);
    expect(initial.numbers.queued).toBe(24);
  });

  it('cancels the remaining queue and never resumes a stopped campaign', () => {
    const store = createCampaignStore();
    const id = store.start(makeInput());
    store.advance();
    const sentBeforeStop = store.getSnapshot()[0].numbers.sent;
    store.stop(id);
    const stopped = store.getSnapshot();

    expect(stopped[0].phase).toBe('cancelled');
    expect(stopped[0].numbers.queued).toBe(0);
    expect(stopped[0].numbers.sent).toBe(sentBeforeStop);
    expect(stopped[0].numbers.cancelled).toBe(24 - sentBeforeStop);
    store.advance();
    store.stop(id);
    expect(store.getSnapshot()).toBe(stopped);
  });

  it('finishes sending and leaves completed campaigns unchanged', () => {
    const store = createCampaignStore();
    const id = store.start(makeInput());
    for (let tick = 0; tick < 30; tick++) store.advance();
    const completed = store.getSnapshot();

    expect(completed[0].phase).toBe('done');
    expect(completed[0].numbers.sent).toBe(24);
    expect(completed[0].numbers.queued).toBe(0);
    expect(completed[0].numbers.cancelled).toBe(0);
    store.advance();
    store.stop(id);
    expect(store.getSnapshot()).toBe(completed);
  });

  const invalidInputs: Array<[string, Partial<LaunchInput>]> = [
    ['a stale recipient count', { expectedRecipients: 1 }],
    ['a missing default language version', { defaultLocale: 'en' }],
    ['no letters', { letters: [] }],
    ['no confirmation for the entire audience', { everyoneConfirmed: false }],
    [
      'an empty audience',
      {
        filters: { ...EMPTY_TRADER_FILTERS, countryCodes: ['XX'] },
        expectedRecipients: 0,
      },
    ],
  ];

  it.each(invalidInputs)(
    'rejects %s without creating a campaign',
    (_label, patch) => {
      const store = createCampaignStore();
      expect(() => store.start({ ...makeInput(), ...patch })).toThrow();
      expect(store.getSnapshot()).toHaveLength(0);
    },
  );

  it('notifies subscribers of changes until they unsubscribe', () => {
    const store = createCampaignStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const id = store.start(makeInput());
    store.advance();
    store.stop(id);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    store.start({ ...makeInput(), key: 'campaign-b' });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

describe('campaign fixtures', () => {
  it('provides a completed trader campaign and a stopped partner campaign', () => {
    expect(campaignStore.getSnapshot()).toHaveLength(2);
    expect(campaignStore.getSnapshot()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: 'TRADER', phase: 'done' }),
        expect.objectContaining({ target: 'PARTNER', phase: 'cancelled' }),
      ]),
    );
  });
});

describe('local email engagement preference', () => {
  it.each(['TRADER', 'PARTNER'] as const)(
    'excludes unengaged %s recipients only when requested',
    (target) => {
      const filters =
        target === 'TRADER' ? EMPTY_TRADER_FILTERS : EMPTY_PARTNER_FILTERS;
      const audience = countAudience(target, filters);
      const store = createCampaignStore();
      const input = {
        ...makeInput(),
        target,
        filters,
        expectedRecipients: audience.count,
      };
      store.start(input);
      store.start({ ...input, key: 'skip-unengaged', skipUnengaged: true });
      const [skipping, all] = store.getSnapshot();
      expect(all.numbers.total).toBe(audience.count);
      expect(all.skipped).toBe(0);
      expect(skipping.skipUnengaged).toBe(true);
      expect(skipping.skipped).toBeGreaterThan(0);
      expect(skipping.expectedRecipients).toBe(audience.count);
      expect(skipping.numbers.total + skipping.skipped).toBe(audience.count);
      expect(
        skipping.versions.reduce(
          (sum, version) => sum + version.numbers.total,
          0,
        ),
      ).toBe(skipping.numbers.total);
      for (let tick = 0; tick < 30; tick++) store.advance();
      const done = store
        .getSnapshot()
        .find((campaign) => campaign.key === 'skip-unengaged')!;
      expect(done.numbers.sent + done.skipped).toBe(audience.count);
    },
  );

  it('completes an empty queue when every matching recipient is skipped', () => {
    const filters = { ...EMPTY_PARTNER_FILTERS, countryCodes: ['UA'] };
    const store = createCampaignStore();
    const count = countAudience('PARTNER', filters).count;
    expect(count).toBeGreaterThan(0);
    store.start({
      ...makeInput(),
      target: 'PARTNER',
      filters,
      expectedRecipients: count,
      skipUnengaged: true,
    });
    const campaign = store.getSnapshot()[0];
    expect(campaign.phase).toBe('done');
    expect(campaign.skipped).toBe(count);
    expect(campaign.numbers.total).toBe(0);
    expect(campaign.numbers.sent).toBe(0);
  });
});

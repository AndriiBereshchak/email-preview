import DesignStep from './Composer/DesignStep';
import {
  DEFAULT_APPEARANCE,
  type EmailAppearance,
} from '../utils/appearanceModel';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  EMPTY_PARTNER_FILTERS,
  EMPTY_TRADER_FILTERS,
  filtersSummary,
  formatCount,
  languagesWord,
  partnerFiltersProblem,
  targetLabel,
  traderFiltersProblem,
  versionReach,
  type CampaignTarget,
  type PartnerFilterState,
  type TraderFilterState,
} from '../utils/audienceModel';
import {
  cx as clsx,
  draftProblem,
  emptyDraft,
  previewKey,
  type LetterDraft,
  type LetterLocale,
} from '../utils/localModel';
import { DEMO_AUDIENCE } from '../mocks/audience';
import AudienceStep from './Composer/AudienceStep';
import ConfirmLaunch from './Composer/ConfirmLaunch';
import LetterStep from './Composer/LetterStep';
import ReviewStep, { type PreviewState } from './Composer/ReviewStep';
import SummaryAside from './Composer/SummaryAside';
import e from './emailCampaign.module.css';

type Step = 1 | 2 | 3 | 4;

const ComposerPage = () => {
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState<Step>(1);
  const [target, setTarget] = useState<CampaignTarget>(
    searchParams.get('audience') === 'partners' ? 'PARTNER' : 'TRADER',
  );
  const [traderFilters, setTraderFilters] =
    useState<TraderFilterState>(EMPTY_TRADER_FILTERS);
  const [partnerFilters, setPartnerFilters] = useState<PartnerFilterState>(
    EMPTY_PARTNER_FILTERS,
  );
  const [drafts, setDrafts] = useState<LetterDraft[]>([emptyDraft('ru')]);
  const [defaultLocale, setDefaultLocale] = useState<LetterLocale>('ru');
  const [activeLocale, setActiveLocale] = useState<LetterLocale>('ru');
  const [appearance, setAppearance] = useState<EmailAppearance>({
    ...DEFAULT_APPEARANCE,
  });
  const [skipUnengaged, setSkipUnengaged] = useState(false);
  const [previews, setPreviews] = useState<Record<string, PreviewState>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filters = target === 'TRADER' ? traderFilters : partnerFilters;
  const filtersProblem =
    target === 'TRADER'
      ? traderFiltersProblem(traderFilters)
      : partnerFiltersProblem(partnerFilters);
  const audience = DEMO_AUDIENCE[target];
  const count = filtersProblem ? null : audience.count;
  const byLanguage = filtersProblem ? [] : audience.byLanguage;
  const everyone = audience.everyone;
  const filterLines = filtersSummary(target, filters);
  const audienceProblem =
    filtersProblem ?? (count === 0 ? 'Под эти фильтры никто не попал' : null);
  const audienceReady = count !== null && count > 0 && !audienceProblem;

  const letters = drafts;
  const locales = drafts.map((draft) => draft.locale);
  const reach = versionReach(byLanguage, locales, defaultLocale);
  const problems: Record<string, string | null> = Object.fromEntries(
    drafts.map((draft) => [draft.locale, draftProblem(draft)]),
  );
  const lettersReady = drafts.every((draft) => !problems[draft.locale]);
  const isPreviewed = (locale: string): boolean => {
    const letter = letters.find((item) => item.locale === locale);
    return (
      Boolean(letter) &&
      previews[locale]?.key === previewKey(target, letter!, appearance)
    );
  };
  const allPreviewed = letters.every((letter) => isPreviewed(letter.locale));

  const launchBlocker = !audienceReady
    ? 'Сначала настройте получателей'
    : !lettersReady
      ? 'Заполните все версии письма'
      : !allPreviewed
        ? 'Откройте предпросмотр каждой версии'
        : null;

  const updateDraft = (locale: LetterLocale, patch: Partial<LetterDraft>) =>
    setDrafts((all) =>
      all.map((draft) =>
        draft.locale === locale ? { ...draft, ...patch } : draft,
      ),
    );

  const addDraft = (locale: LetterLocale) => {
    setDrafts((all) => {
      if (all.some((draft) => draft.locale === locale)) return all;
      const main = all.find((draft) => draft.locale === defaultLocale);
      return [...all, { ...emptyDraft(locale), html: main?.html ?? '' }];
    });
    setActiveLocale(locale);
  };

  const removeDraft = (locale: LetterLocale) => {
    const rest = drafts.filter((draft) => draft.locale !== locale);
    if (rest.length === 0) return;
    setDrafts(rest);
    if (defaultLocale === locale) setDefaultLocale(rest[0]!.locale);
    if (activeLocale === locale) setActiveLocale(rest[0]!.locale);
  };

  const steps: Array<{
    n: Step;
    title: string;
    detail: string;
    done: boolean;
    available: boolean;
  }> = [
    {
      n: 1,
      title: 'Кому',
      detail:
        count !== null
          ? `${targetLabel(target)} · до ${formatCount(count)}`
          : targetLabel(target),
      done: audienceReady,
      available: true,
    },
    {
      n: 2,
      title: 'Письмо',
      detail: `${drafts.length} ${languagesWord(drafts.length)}${lettersReady ? '' : ' · не заполнено'}`,
      done: lettersReady,
      available: audienceReady,
    },
    {
      n: 3,
      title: 'Оформление',
      detail: 'стиль и расположение',
      done: false,
      available: audienceReady && lettersReady,
    },
    {
      n: 4,
      title: 'Проверка и отправка',
      detail: launchBlocker ? 'предпросмотр и тест' : 'готово к запуску',
      done: false,
      available: audienceReady && lettersReady,
    },
  ];

  return (
    <div className={e.page}>
      <header className={e.pageHead}>
        <div>
          <Link to="/admin/distribution" className={e.back}>
            ← Все рассылки
          </Link>
          <h2 className={e.pageTitle}>Новая рассылка</h2>
        </div>
      </header>

      <div className={clsx(e.composer, step === 3 && e.designComposer)}>
        <div className={e.main}>
          <ol className={e.stepper}>
            {steps.map((item) => (
              <li key={item.n}>
                <button
                  type="button"
                  className={clsx(
                    e.stepButton,
                    step === item.n && e.stepCurrent,
                    item.done && step !== item.n && e.stepDone,
                  )}
                  disabled={!item.available}
                  aria-current={step === item.n ? 'step' : undefined}
                  onClick={() => setStep(item.n)}
                >
                  <span className={e.stepNum}>
                    {item.done && step !== item.n ? '✓' : item.n}
                  </span>
                  <span className={e.stepText}>
                    <span className={e.stepTitle}>{item.title}</span>
                    <span className={e.stepDetail}>{item.detail}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          {step === 1 && (
            <AudienceStep
              target={target}
              onTarget={setTarget}
              traderFilters={traderFilters}
              onTraderFilters={setTraderFilters}
              partnerFilters={partnerFilters}
              onPartnerFilters={setPartnerFilters}
              count={count}
              problem={audienceProblem}
              onNext={() => setStep(2)}
            />
          )}

          <div hidden={step !== 2}>
            <LetterStep
              drafts={drafts}
              activeLocale={activeLocale}
              defaultLocale={defaultLocale}
              byLanguage={byLanguage}
              reach={reach}
              problems={problems}
              onActive={setActiveLocale}
              onChange={updateDraft}
              onAdd={addDraft}
              onRemove={removeDraft}
              onMakeDefault={setDefaultLocale}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          </div>

          <div hidden={step !== 3}>
            <DesignStep
              drafts={drafts}
              activeLocale={activeLocale}
              defaultLocale={defaultLocale}
              appearance={appearance}
              onActive={setActiveLocale}
              onAppearance={setAppearance}
              onChange={(locale, html) => updateDraft(locale, { html })}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          </div>

          {step === 4 && (
            <ReviewStep
              target={target}
              count={count}
              letters={letters}
              appearance={appearance}
              defaultLocale={defaultLocale}
              activeLocale={activeLocale}
              onActive={setActiveLocale}
              previews={previews}
              onPreviewed={(locale, state) =>
                setPreviews((all) => ({ ...all, [locale]: state }))
              }
              skipUnengaged={skipUnengaged}
              onSkipUnengaged={setSkipUnengaged}
              launchBlocker={launchBlocker}
              launching={false}
              onBack={() => setStep(3)}
              onLaunch={() => setConfirmOpen(true)}
            />
          )}
        </div>

        {step !== 3 && (
          <SummaryAside
            target={target}
            count={count}
            everyone={everyone}
            problem={audienceProblem}
            filterLines={filterLines}
            byLanguage={byLanguage}
            drafts={drafts}
            defaultLocale={defaultLocale}
            problems={problems}
            isPreviewed={isPreviewed}
          />
        )}
      </div>

      <ConfirmLaunch
        isOpen={confirmOpen}
        busy={false}
        onClose={() => setConfirmOpen(false)}
        target={target}
        count={count ?? 0}
        everyone={everyone}
        reach={reach}
        letters={letters}
        defaultLocale={defaultLocale}
        filterLines={filterLines}
        skipUnengaged={skipUnengaged}
      />
    </div>
  );
};

export default ComposerPage;

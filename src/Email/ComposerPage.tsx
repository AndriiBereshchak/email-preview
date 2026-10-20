import DesignStep from './Composer/DesignStep';
import { useMemo, useState } from 'react';
import { emailVersionProblem } from '../utils/emailDocument';
import { useEmailDocument } from '../hooks/useEmailDocument';
import { useEmailImageResources } from '../hooks/useEmailImageResources';
import type { EmailAppearance } from '../utils/appearanceModel';
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
  type LetterSummary,
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
  const { document, setDocument, revisions } = useEmailDocument();
  useEmailImageResources(document);
  const drafts = useMemo<LetterSummary[]>(
    () =>
      Object.entries(document.versions).map(([locale, version]) => ({
        locale: locale as LetterLocale,
        subject: version!.subject,
        preheader: version!.preheader,
      })),
    [document.versions],
  );
  const [defaultLocale, setDefaultLocale] = useState<LetterLocale>('ru');
  const [activeLocale, setActiveLocale] = useState<LetterLocale>('ru');
  const appearance = document.appearance;
  const setAppearance = (value: EmailAppearance) =>
    setDocument((current) => ({ ...current, appearance: value }));
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
    drafts.map((draft) => [
      draft.locale,
      emailVersionProblem(document, draft.locale),
    ]),
  );
  const subjectProblems = Object.fromEntries(
    drafts.map((draft) => [
      draft.locale,
      draft.subject.trim() ? null : 'заполните тему',
    ]),
  );
  const subjectsReady = drafts.every((draft) => !subjectProblems[draft.locale]);
  const lettersReady = drafts.every((draft) => !problems[draft.locale]);
  const isPreviewed = (locale: string): boolean => {
    const letter = letters.find((item) => item.locale === locale);
    return (
      Boolean(letter) &&
      previews[locale]?.key === `${target}:${revisions[locale]}`
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

  const updateDraft = (
    locale: LetterLocale,
    patch: Partial<Pick<LetterSummary, 'subject' | 'preheader'>>,
  ) =>
    setDocument((current) => ({
      ...current,
      versions: {
        ...current.versions,
        [locale]: { ...current.versions[locale]!, ...patch },
      },
    }));

  const addDraft = (locale: LetterLocale) => {
    setDocument((current) =>
      current.versions[locale]
        ? current
        : {
            ...current,
            versions: {
              ...current.versions,
              [locale]: { subject: '', preheader: '', blocks: {} },
            },
          },
    );
    setActiveLocale(locale);
  };
  const removeDraft = (locale: LetterLocale) => {
    const rest = drafts.filter((draft) => draft.locale !== locale);
    if (!rest.length) return;
    setDocument((current) => {
      const versions = { ...current.versions };
      delete versions[locale];
      return { ...current, versions };
    });
    if (defaultLocale === locale) setDefaultLocale(rest[0].locale);
    if (activeLocale === locale) setActiveLocale(rest[0].locale);
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
      detail: `${drafts.length} ${languagesWord(drafts.length)}${subjectsReady ? '' : ' · не заполнено'}`,
      done: subjectsReady,
      available: audienceReady,
    },
    {
      n: 3,
      title: 'Оформление',
      detail: 'стиль и расположение',
      done: false,
      available: audienceReady && subjectsReady,
    },
    {
      n: 4,
      title: 'Проверка и отправка',
      detail: launchBlocker ? 'предпросмотр и тест' : 'готово к запуску',
      done: false,
      available: audienceReady && subjectsReady,
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
              problems={subjectProblems}
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
              document={document}
              activeLocale={activeLocale}
              defaultLocale={defaultLocale}
              onActive={setActiveLocale}
              onAppearance={setAppearance}
              onChange={setDocument}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          </div>

          {step === 4 && (
            <ReviewStep
              document={document}
              target={target}
              count={count}
              letters={letters}
              previewKeys={Object.fromEntries(
                locales.map((locale) => [
                  locale,
                  `${target}:${revisions[locale]}`,
                ]),
              )}
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
            problems={step === 4 ? problems : subjectProblems}
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

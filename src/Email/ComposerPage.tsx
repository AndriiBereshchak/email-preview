import AudienceStep from './Composer/AudienceStep';
import SummaryAside from './Composer/SummaryAside';
import {
  countAudience,
  EMPTY_TRADER_FILTERS,
  EMPTY_PARTNER_FILTERS,
  filtersSummary,
  partnerFiltersProblem,
  traderFiltersProblem,
  versionReach,
  targetLabel,
  formatCount,
  type CampaignTarget,
  type TraderFilterState,
  type PartnerFilterState,
} from '../utils/audienceModel';
import { languagesWord } from '../utils/copy';
import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmLaunch from './Composer/ConfirmLaunch';
import { campaignStore } from '../mocks/campaignStore';
import LetterStep from './Composer/LetterStep';
import LetterPreview from './LetterPreview';
import {
  cx,
  draftProblem,
  emptyDraft,
  languageName,
  renderLocalPreview,
  type LetterDraft,
  type LetterLocale,
} from '../utils/localModel';
import e from './emailCampaign.module.css';

export default function ComposerPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const launchKey = useRef(crypto.randomUUID());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [launchError, setLaunchError] = useState('');
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [target, setTarget] = useState<CampaignTarget>(
    params.get('audience') === 'partners' ? 'PARTNER' : 'TRADER',
  );
  const [traderFilters, setTraderFilters] =
    useState<TraderFilterState>(EMPTY_TRADER_FILTERS);
  const [partnerFilters, setPartnerFilters] = useState<PartnerFilterState>(
    EMPTY_PARTNER_FILTERS,
  );
  const [drafts, setDrafts] = useState<LetterDraft[]>([emptyDraft('ru')]);
  const [defaultLocale, setDefaultLocale] = useState<LetterLocale>('ru');
  const [activeLocale, setActiveLocale] = useState<LetterLocale>('ru');
  const [reviewed, setReviewed] = useState<Record<string, string>>({});
  const problems = Object.fromEntries(
    drafts.map((draft) => [draft.locale, draftProblem(draft)]),
  );
  const active =
    drafts.find((draft) => draft.locale === activeLocale) ?? drafts[0]!;

  const filters = target === 'TRADER' ? traderFilters : partnerFilters;
  const filtersProblem =
    target === 'TRADER'
      ? traderFiltersProblem(traderFilters)
      : partnerFiltersProblem(partnerFilters);
  const audience = countAudience(target, filters);
  const count = filtersProblem ? null : audience.count;
  const audienceProblem =
    filtersProblem ?? (count === 0 ? 'Под эти фильтры никто не попал' : null);
  const audienceReady = count !== null && count > 0 && !audienceProblem;
  const byLanguage = filtersProblem ? [] : audience.byLanguage;
  const reach = versionReach(
    byLanguage,
    drafts.map((draft) => draft.locale),
    defaultLocale,
  );
  const reviewKey = (draft: LetterDraft) => JSON.stringify([target, draft]);

  const addDraft = (locale: LetterLocale) => {
    setDrafts((all) =>
      all.some((draft) => draft.locale === locale)
        ? all
        : [
            ...all,
            {
              ...emptyDraft(locale),
              html:
                all.find((draft) => draft.locale === defaultLocale)?.html ?? '',
            },
          ],
    );
    setActiveLocale(locale);
  };
  const removeDraft = (locale: LetterLocale) => {
    const rest = drafts.filter((draft) => draft.locale !== locale);
    if (!rest.length) return;
    setDrafts(rest);
    if (defaultLocale === locale) setDefaultLocale(rest[0]!.locale);
    if (activeLocale === locale) setActiveLocale(rest[0]!.locale);
  };
  const review = () => {
    if (!audienceReady || drafts.some((draft) => draftProblem(draft))) return;
    setReviewed((current) => ({
      ...current,
      [active.locale]: reviewKey(active),
    }));
    setStep(3);
  };

  return (
    <>
      <div className={e.page}>
        <header className={e.pageHead}>
          <div>
            <Link to="/admin/distribution" className={e.back}>
              ← Все рассылки
            </Link>
            <h2 className={e.pageTitle}>Новая рассылка</h2>
          </div>
        </header>
        <div className={e.composer}>
          <div className={e.main}>
            <ol className={e.stepper}>
              {[
                {
                  n: 1,
                  title: 'Кому',
                  detail:
                    count !== null
                      ? `${targetLabel(target)} · до ${formatCount(count)}`
                      : targetLabel(target),
                },
                {
                  n: 2,
                  title: 'Письмо',
                  detail: `${drafts.length} ${languagesWord(drafts.length)}${drafts.some((draft) => draftProblem(draft)) ? ' · не заполнено' : ''}`,
                },
                {
                  n: 3,
                  title: 'Проверка и отправка',
                  detail: 'предпросмотр и тест',
                },
              ].map((item) => (
                <li key={item.n}>
                  <button
                    type="button"
                    className={cx(
                      e.stepButton,
                      step === item.n && e.stepCurrent,
                    )}
                    disabled={
                      (item.n !== 1 && !audienceReady) ||
                      (item.n === 3 &&
                        drafts.some((draft) => draftProblem(draft)))
                    }
                    aria-current={step === item.n ? 'step' : undefined}
                    onClick={() => {
                      if (item.n === 1) setStep(1);
                      else if (item.n === 2) setStep(2);
                      else review();
                    }}
                  >
                    <span className={e.stepNum}>{item.n}</span>
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
                onChange={(locale, patch) =>
                  setDrafts((all) =>
                    all.map((draft) =>
                      draft.locale === locale ? { ...draft, ...patch } : draft,
                    ),
                  )
                }
                onAdd={addDraft}
                onRemove={removeDraft}
                onMakeDefault={setDefaultLocale}
                onBack={() => setStep(1)}
                onNext={review}
              />
            </div>
            {step === 3 && (
              <section className={e.card} aria-labelledby="review-title">
                <div className={e.cardHead}>
                  <h3 id="review-title" className={e.cardTitle}>
                    Проверка и отправка
                  </h3>
                </div>
                {drafts.length > 1 && (
                  <div
                    className={e.versions}
                    role="tablist"
                    aria-label="Версии письма"
                  >
                    {drafts.map((draft) => (
                      <button
                        type="button"
                        key={draft.locale}
                        role="tab"
                        aria-selected={draft.locale === activeLocale}
                        className={cx(
                          e.version,
                          draft.locale === activeLocale && e.versionActive,
                        )}
                        onClick={() => {
                          setActiveLocale(draft.locale);
                          setReviewed((current) => ({
                            ...current,
                            [draft.locale]: reviewKey(draft),
                          }));
                        }}
                      >
                        {languageName(draft.locale)}
                        {draft.locale === defaultLocale && (
                          <span className={e.badge}>основная</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <LetterPreview
                  preview={renderLocalPreview(active)}
                  stale={false}
                />
                {launchError && (
                  <p className={e.alert} role="alert">
                    {launchError}
                  </p>
                )}
                <div className={e.stepFooter}>
                  <button
                    type="button"
                    className={cx(e.btn, e.btnGhost)}
                    onClick={() => setStep(2)}
                  >
                    Назад
                  </button>
                  <div className={e.footerEnd}>
                    <button
                      type="button"
                      className={cx(e.btn, e.btnPrimary)}
                      disabled={
                        !audienceReady ||
                        drafts.some(
                          (draft) =>
                            draftProblem(draft) ||
                            reviewed[draft.locale] !== reviewKey(draft),
                        )
                      }
                      onClick={() => {
                        setLaunchError('');
                        setConfirmOpen(true);
                      }}
                    >
                      Запустить рассылку
                    </button>
                  </div>
                </div>
              </section>
            )}
          </div>
          <SummaryAside
            target={target}
            count={count}
            everyone={audience.everyone}
            problem={audienceProblem}
            filterLines={filtersSummary(target, filters)}
            byLanguage={byLanguage}
            drafts={drafts}
            defaultLocale={defaultLocale}
            problems={problems}
            isPreviewed={(locale) => {
              const draft = drafts.find((item) => item.locale === locale);
              return Boolean(draft && reviewed[locale] === reviewKey(draft));
            }}
          />
        </div>
      </div>
      <ConfirmLaunch
        isOpen={confirmOpen}
        busy={false}
        onClose={() => setConfirmOpen(false)}
        target={target}
        count={count ?? 0}
        everyone={audience.everyone}
        reach={reach}
        letters={drafts}
        defaultLocale={defaultLocale}
        filterLines={filtersSummary(target, filters)}
        onConfirm={(everyoneConfirmed) => {
          if (
            !audienceReady ||
            drafts.some(
              (draft) =>
                draftProblem(draft) ||
                reviewed[draft.locale] !== reviewKey(draft),
            )
          ) {
            setConfirmOpen(false);
            setLaunchError('Проверьте аудиторию и все версии письма');
            return;
          }
          try {
            const id = campaignStore.start({
              key: launchKey.current,
              target,
              filters,
              letters: drafts,
              defaultLocale,
              expectedRecipients: count!,
              everyoneConfirmed,
            });
            navigate(`/admin/distribution/campaign/${id}`);
          } catch (error) {
            setConfirmOpen(false);
            setLaunchError(
              error instanceof Error
                ? error.message
                : 'Не удалось запустить рассылку',
            );
          }
        }}
      />
    </>
  );
}

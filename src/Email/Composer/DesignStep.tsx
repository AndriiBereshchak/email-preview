import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { embedEmailImages } from '../../utils/appearanceImage';
import { cx, languageName, type LetterLocale } from '../../utils/localModel';
import {
  backgroundImageStyle,
  type EmailAppearance,
} from '../../utils/appearanceModel';
import AppearanceSettings from './AppearanceSettings';
import EmailBuilder from './EmailBuilder';
import type { EmailDocument } from '../../utils/emailDocument';
import { renderEmailDocument } from '../../utils/renderEmailDocument';
import e from '../emailCampaign.module.css';
interface Props {
  document: EmailDocument;
  activeLocale: LetterLocale;
  defaultLocale: LetterLocale;
  onActive: (locale: LetterLocale) => void;
  onChange: Dispatch<SetStateAction<EmailDocument>>;
  onAppearance: (value: EmailAppearance) => void;
  onBack: () => void;
  onNext: () => void;
}
export default function DesignStep(props: Props) {
  const [view, setView] = useState<'desktop' | 'mobile'>('desktop');
  const appearance = props.document.appearance;
  const locales = Object.keys(props.document.versions) as LetterLocale[];
  const active = locales.includes(props.activeLocale)
    ? props.activeLocale
    : locales[0];
  return (
    <section className={e.card} aria-labelledby="design-title">
      <div className={e.cardHead}>
        <h3 id="design-title" className={e.cardTitle}>
          Оформление
        </h3>
        <p className={e.cardLead}>
          Добавляйте текст, картинки и кнопки. Макет общий для всех языков, а
          содержимое у каждого своё.
        </p>
      </div>
      <div className={e.designColumns}>
        <AppearanceSettings value={appearance} onChange={props.onAppearance} />
        <div className={e.designCanvas}>
          <div className={e.versions} role="tablist" aria-label="Язык макета">
            {locales.map((locale) => (
              <button
                type="button"
                key={locale}
                role="tab"
                aria-selected={locale === active}
                className={cx(e.version, locale === active && e.versionActive)}
                onClick={() => props.onActive(locale)}
              >
                {languageName(locale)}
                {locale === props.defaultLocale && (
                  <span className={e.badge}>основная</span>
                )}
              </button>
            ))}
          </div>
          <div
            className={e.segmented}
            role="tablist"
            aria-label="Размер макета"
          >
            {(['desktop', 'mobile'] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                role="tab"
                aria-selected={view === mode}
                className={cx(e.segment, view === mode && e.segmentActive)}
                onClick={() => setView(mode)}
              >
                {mode === 'desktop' ? 'Редактор' : 'На телефоне'}
              </button>
            ))}
          </div>
          <div
            className={e.designStage}
            role="region"
            aria-label="Макет письма"
            style={{
              backgroundColor: appearance.pageBackground,
              ...backgroundImageStyle(appearance.pageBackgroundImage),
            }}
          >
            <div
              style={{
                width: view === 'mobile' ? 375 : '100%',
                maxWidth: '100%',
                margin: '0 auto',
              }}
            >
              {view === 'desktop' ? (
                <EmailBuilder
                  document={props.document}
                  locale={active}
                  onChange={props.onChange}
                />
              ) : (
                <MobilePreview document={props.document} locale={active} />
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={e.stepFooter}>
        <button
          type="button"
          className={cx(e.btn, e.btnGhost)}
          onClick={props.onBack}
        >
          Назад: письмо
        </button>
        <button
          type="button"
          className={cx(e.btn, e.btnPrimary)}
          onClick={props.onNext}
        >
          Далее: проверка
        </button>
      </div>
    </section>
  );
}

function MobilePreview({
  document,
  locale,
}: {
  document: EmailDocument;
  locale: LetterLocale;
}) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    let cancelled = false;
    embedEmailImages(renderEmailDocument(document, locale).html).then(
      (value) => {
        if (!cancelled) setHtml(value);
      },
      () => {
        if (!cancelled) setHtml('');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [document, locale]);
  return (
    <iframe
      title="Письмо на телефоне"
      sandbox=""
      srcDoc={html}
      style={{
        width: 375,
        maxWidth: '100%',
        height: 640,
        border: 0,
        background: 'white',
      }}
    />
  );
}

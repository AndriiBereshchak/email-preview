import {
  cx as clsx,
  formatCount,
  languageName,
  type LetterDraft as CampaignLetter,
  type LetterLocale,
  type VersionReach,
} from './localModel';
import {
  recipientsWord,
  targetLabel,
  type CampaignTarget,
} from './audienceModel';
import { useEffect, useState } from 'react';
import CustomModal from './CustomModal';
import e from './emailCampaign.module.css';

interface Props {
  isOpen: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: (sendToEveryone: boolean) => void;
  target: CampaignTarget;
  count: number;
  everyone: boolean;
  reach: VersionReach[];
  letters: CampaignLetter[];
  defaultLocale: LetterLocale;
  filterLines: string[];
}

const ConfirmLaunch = (props: Props) => {
  const [checked, setChecked] = useState(false);
  const [everyoneConfirmed, setEveryoneConfirmed] = useState(false);

  useEffect(() => {
    if (!props.isOpen) {
      setChecked(false);
      setEveryoneConfirmed(false);
    }
  }, [props.isOpen]);

  return (
    <CustomModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title="Запустить рассылку?"
      maxWidth="640px"
      hideClose={props.busy}
    >
      <div className={e.confirm}>
        <p>
          {targetLabel(props.target)}: письмо получат до{' '}
          <strong>
            {formatCount(props.count)}{' '}
            {recipientsWord(props.target, props.count)}
          </strong>
          . Это локальная имитация: настоящие письма не отправляются.
        </p>

        {props.everyone && (
          <p className={e.warning}>
            Фильтры не сужают аудиторию — письмо получат все{' '}
            {props.target === 'TRADER'
              ? 'трейдеры'
              : 'партнёры с выбранным статусом'}
            . Если нужна часть из них, вернитесь к шагу «Кому».
          </p>
        )}

        <table className={e.confirmTable}>
          <thead>
            <tr>
              <th>Язык</th>
              <th>Тема</th>
              <th>Получат</th>
            </tr>
          </thead>
          <tbody>
            {props.reach.map((row) => (
              <tr key={row.locale}>
                <td>
                  {languageName(row.locale)}
                  {row.locale === props.defaultLocale ? ' · основная' : ''}
                </td>
                <td>
                  {
                    props.letters.find((letter) => letter.locale === row.locale)
                      ?.subject
                  }
                </td>
                <td>до {formatCount(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {props.filterLines.length > 0 && (
          <ul className={e.filterList} aria-label="Фильтры">
            {props.filterLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        <label className={e.checkRow}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
          />
          <span>Я проверил письмо на всех языках и список получателей</span>
        </label>

        {props.everyone && (
          <label className={e.checkRow}>
            <input
              type="checkbox"
              checked={everyoneConfirmed}
              onChange={(event) => setEveryoneConfirmed(event.target.checked)}
            />
            <span>
              Да, отправить всем{' '}
              {props.target === 'TRADER' ? 'трейдерам' : 'партнёрам'} — до{' '}
              {formatCount(props.count)}
            </span>
          </label>
        )}

        <div className={e.confirmActions}>
          <button
            type="button"
            className={clsx(e.btn, e.btnGhost)}
            disabled={props.busy}
            onClick={props.onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className={clsx(e.btn, e.btnPrimary)}
            disabled={
              !checked || (props.everyone && !everyoneConfirmed) || props.busy
            }
            onClick={() => props.onConfirm(props.everyone && everyoneConfirmed)}
          >
            {props.busy
              ? 'Запускаем…'
              : `Отправить до ${formatCount(props.count)}`}
          </button>
        </div>
      </div>
    </CustomModal>
  );
};

export default ConfirmLaunch;

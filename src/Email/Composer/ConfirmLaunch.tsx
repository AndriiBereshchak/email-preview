import {
  cx as clsx,
  formatCount,
  languageName,
  type LetterSummary,
  type LetterLocale,
  type VersionReach,
} from '../../utils/localModel';
import {
  recipientsWord,
  targetLabel,
  type CampaignTarget,
} from '../../utils/audienceModel';
import { useEffect, useState } from 'react';
import CustomModal from '../../parts/CustomModal/CustomModal';
import e from '../emailCampaign.module.css';

interface Props {
  isOpen: boolean;
  busy: boolean;
  onClose: () => void;
  target: CampaignTarget;
  count: number;
  everyone: boolean;
  reach: VersionReach[];
  letters: LetterSummary[];
  defaultLocale: LetterLocale;
  filterLines: string[];
  skipUnengaged: boolean;
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
          . Это демо: бекенд не подключён, письма не отправляются.
        </p>

        {props.everyone && (
          <p className={e.warning}>
            В демонстрационных данных выбрана вся аудитория. Реальный состав
            получателей определяется сервером.
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

        <ul className={e.confirmList}>
          <li>
            В подключённом почтовом сервисе сначала загружаются все адреса,
            затем начинается отправка. В демо этот этап не выполняется.
          </li>
          <li>
            В почтовом сервисе отписавшимся и адресам из стоп-листа письмо не
            уйдёт. В локальном режиме стоп-лист не подключён.
          </li>
          {props.skipUnengaged && (
            <li>
              Настройка пропуска неактивных получателей применяется на сервере.
            </li>
          )}
        </ul>

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

        <p className={e.footerNote}>
          Бекенд не подключён: запуск и отправка недоступны.
        </p>
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
            disabled
            title="Бекенд не подключён"
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

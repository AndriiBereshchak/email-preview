import { cx as clsx } from './localModel';
import type { PhaseView, Tone } from './campaignModel';
import e from './emailCampaign.module.css';

const TONE: Record<Tone, string> = {
  ok: e.pillOk,
  info: e.pillInfo,
  muted: e.pillMuted,
};

export const StatusPill = ({ view }: { view: PhaseView }) => (
  <span className={clsx(e.pill, TONE[view.tone])}>
    {view.tone === 'info' && <span className={e.pulse} aria-hidden="true" />}
    {view.label}
  </span>
);

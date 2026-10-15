import { useRef, useState, type PointerEvent } from 'react';
import type { EmailAppearance } from '../../utils/appearanceModel';
import VersionEditor from './VersionEditor';
import e from '../emailCampaign.module.css';

export default function LetterHeader({
  appearance,
  onChange,
}: {
  appearance: EmailAppearance;
  onChange: (value: EmailAppearance) => void;
}) {
  const [logoSelected, setLogoSelected] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLImageElement>(null);
  const latest = useRef({ appearance, onChange });
  latest.current = { appearance, onChange };
  const drag = useRef<{
    type: 'logo' | 'height';
    x: number;
    y: number;
    size: number;
  } | null>(null);
  const start = (
    event: PointerEvent<HTMLButtonElement>,
    type: 'logo' | 'height',
  ) => {
    event.preventDefault();
    event.stopPropagation();
    drag.current = {
      type,
      x: event.clientX,
      y: event.clientY,
      size:
        type === 'logo'
          ? logo.current!.getBoundingClientRect().width
          : container.current!.getBoundingClientRect().height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const resize = (event: PointerEvent<HTMLButtonElement>) => {
    const active = drag.current;
    if (!active) return;
    const { appearance: current, onChange: change } = latest.current;
    if (active.type === 'logo') {
      const max = Math.max(
        16,
        container.current!.clientWidth - current.padding * 2,
      );
      change({
        ...current,
        logoWidth: Math.round(
          Math.min(max, Math.max(16, active.size + event.clientX - active.x)),
        ),
      });
    } else
      change({
        ...current,
        headerHeight: Math.round(
          Math.min(1000, Math.max(48, active.size + event.clientY - active.y)),
        ),
      });
  };
  if (!appearance.headerEnabled) return null;
  return (
    <div
      ref={container}
      className={e.headerCanvas}
      style={{
        backgroundColor: appearance.headerBackground,
        padding: appearance.padding,
        minHeight: appearance.headerHeight,
      }}
    >
      {appearance.logoSrc && (
        <div className={e.headerLogo} style={{ width: appearance.logoWidth }}>
          <img
            ref={logo}
            src={appearance.logoSrc}
            alt="Логотип"
            draggable={false}
            onClick={() => setLogoSelected(true)}
          />
          {logoSelected && (
            <button
              type="button"
              className={e.logoResize}
              aria-label="Изменить размер логотипа"
              onPointerDown={(event) => start(event, 'logo')}
              onPointerMove={resize}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                  event.preventDefault();
                  onChange({
                    ...appearance,
                    logoWidth: Math.max(
                      16,
                      Math.min(
                        appearance.width - 2 * appearance.padding,
                        appearance.logoWidth +
                          (event.key === 'ArrowRight' ? 10 : -10),
                      ),
                    ),
                  });
                }
              }}
            />
          )}
        </div>
      )}
      <div onPointerDown={() => setLogoSelected(false)}>
        <VersionEditor
          mode="decoration"
          label="Текст шапки"
          initialHtml={appearance.headerText}
          appearance={{
            ...appearance,
            padding: 0,
            background: appearance.headerBackground,
            textColor: '#ffffff',
          }}
          onChange={(headerText) =>
            latest.current.onChange({
              ...latest.current.appearance,
              headerText,
            })
          }
        />
      </div>
      <button
        type="button"
        className={e.headerResize}
        aria-label="Изменить высоту шапки"
        onPointerDown={(event) => start(event, 'height')}
        onPointerMove={resize}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            onChange({
              ...appearance,
              headerHeight: Math.max(
                48,
                Math.min(
                  1000,
                  appearance.headerHeight +
                    (event.key === 'ArrowDown' ? 10 : -10),
                ),
              ),
            });
          }
        }}
      />
    </div>
  );
}

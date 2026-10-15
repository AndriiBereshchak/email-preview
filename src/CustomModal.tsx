import { useEffect, useId, useRef, type ReactNode } from 'react';
export default function CustomModal({
  isOpen,
  onClose,
  title,
  children,
  hideClose,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
  hideClose?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current!;
    if (isOpen && !dialog.open) dialog.showModal();
    else if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);
  return (
    <dialog
      ref={ref}
      className="campaign-modal"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        if (!hideClose) onClose();
      }}
    >
      <div className="campaign-modal-head">
        <h2 id={id}>{title}</h2>
        {!hideClose && (
          <button type="button" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        )}
      </div>
      {children}
    </dialog>
  );
}

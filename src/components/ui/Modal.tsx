import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AppIcon } from './AppIcon';

interface ModalProps {
  dismissible?: boolean;
  presentation?: 'dialog' | 'form';
  title: string;
  description?: string;
  children: ReactNode;
  close: () => void;
}

export function Modal({
  dismissible = true,
  title,
  description,
  children,
  close,
  presentation = 'dialog',
}: ModalProps) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={presentation === 'form' ? 'form-dialog' : 'sheet-dialog'}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) {
          close();
        }
      }}
      onClick={(e) => {
        if (dismissible && e.target === ref.current) {
          close();
        }
      }}
      aria-labelledby={titleId}
    >
      <div className="modal-inner">
        <div className="section-head">
          <h2 id={titleId}>{title}</h2>
          {dismissible && (
            <button
              className="icon-button"
              onClick={close}
              aria-label="Close dialog"
            >
              <AppIcon name="x" />
            </button>
          )}
        </div>
        {description && (
          <p className="muted modal-description">{description}</p>
        )}
        {children}
      </div>
    </dialog>
  );
}

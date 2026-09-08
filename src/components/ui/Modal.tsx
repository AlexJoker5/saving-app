import { useEffect, useRef, type ReactNode } from 'react';
import { AppIcon } from './AppIcon';

interface ModalProps {
  presentation?: 'dialog' | 'form';
  title: string;
  description?: string;
  children: ReactNode;
  close: () => void;
}

export function Modal({
  title,
  description,
  children,
  close,
  presentation = 'dialog',
}: ModalProps) {
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
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          close();
        }
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-inner">
        <div className="section-head">
          <h2 id="modal-title">{title}</h2>
          <button
            className="icon-button"
            onClick={close}
            aria-label="Close dialog"
          >
            <AppIcon name="x" />
          </button>
        </div>
        {description && (
          <p className="muted modal-description">{description}</p>
        )}
        {children}
      </div>
    </dialog>
  );
}

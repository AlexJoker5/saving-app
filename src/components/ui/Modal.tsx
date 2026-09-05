import { useEffect, useRef, type ReactNode } from 'react';
import { AppIcon } from './AppIcon';

interface ModalProps {
  title: string;
  description?: string;
  children: ReactNode;
  close: () => void;
}

export function Modal({ title, description, children, close }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
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

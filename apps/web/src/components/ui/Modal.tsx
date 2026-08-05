import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Set false to omit the built-in title bar entirely — for callers with
   * a fully custom branded header (their own close button included). The
   * focus trap, Escape handling, and backdrop still apply either way. */
  showHeader?: boolean;
  /** Accessible name for dialogs with a custom header (`showHeader={false}`). */
  ariaLabel?: string;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, footer, size = 'md', showHeader = true, ariaLabel }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const getFocusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []);
    (getFocusable()[0] ?? dialog)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.requestAnimationFrame(() => previouslyFocused?.focus?.());
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const backgroundNodes = Array.from(document.body.children).filter(node => node !== overlay);
    const previous = backgroundNodes.map(node => ({
      node,
      inert: node.getAttribute('inert'),
      ariaHidden: node.getAttribute('aria-hidden'),
    }));
    const previousOverflow = document.body.style.overflow;
    backgroundNodes.forEach(node => {
      node.setAttribute('inert', '');
      node.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = 'hidden';
    return () => {
      previous.forEach(({ node, inert, ariaHidden }) => {
        if (inert === null) node.removeAttribute('inert');
        else node.setAttribute('inert', inert);
        if (ariaHidden === null) node.removeAttribute('aria-hidden');
        else node.setAttribute('aria-hidden', ariaHidden);
      });
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal((
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title && showHeader ? titleId : undefined}
        aria-label={ariaLabel ?? (!showHeader ? title : undefined)}
        tabIndex={-1}
        onClick={e => e.stopPropagation()}
        className={`w-full ${SIZES[size]} rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl outline-none`}
      >
        {showHeader && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/60">
            <h2 id={titleId} className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            <button
              type="button"
              aria-label="Затвори"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className={showHeader ? 'px-5 py-4' : ''}>{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 dark:border-slate-700/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  ), document.body);
}

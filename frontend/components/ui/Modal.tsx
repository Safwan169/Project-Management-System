'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-6xl',
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof sizes;
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  // Close on ESC and lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Portals need the DOM; bail during SSR and when closed.
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      // items-end on mobile so the panel sits as a bottom sheet; centered
      // from sm up. Padding shrinks on small screens for more usable width.
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — clicking it closes the modal. */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className={cn(
          // Cap the panel at the viewport height and lay it out as a
          // column so the body can scroll while header/footer stay pinned.
          'relative flex max-h-[90vh] w-full flex-col bg-white shadow-xl',
          'rounded-t-xl sm:rounded-xl',
          sizes[size],
        )}
      >
        {title && (
          <div className="flex shrink-0 items-center justify-between border-b border-surface-border px-5 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Scrolls internally when the content is taller than the panel. */}
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-surface-border px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

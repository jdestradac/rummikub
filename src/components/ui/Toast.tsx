'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToastStore, type ToastMessage, type ToastVariant } from '@/store/toastStore';
import { TOAST_DURATION_MS } from '@/lib/constants';
import { cn } from '@/lib/cn';

const variantStyles: Record<ToastVariant, string> = {
  info: 'bg-app-surface border-app-border text-slate-100',
  success: 'bg-emerald-900/90 border-emerald-600 text-emerald-100',
  error: 'bg-red-900/90 border-red-600 text-red-100',
};

function ToastItem({ toast }: { toast: ToastMessage }) {
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 40, y: -8 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'pointer-events-auto min-w-[240px] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg',
        variantStyles[toast.variant],
      )}
      onClick={() => dismiss(toast.id)}
      role="status"
    >
      {toast.message}
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

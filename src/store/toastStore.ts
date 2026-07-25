import { create } from 'zustand';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastStoreState {
  toasts: ToastMessage[];
  push: (message: string, variant: ToastVariant) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],
  push: (message, variant) =>
    set((s) => ({
      toasts: [...s.toasts, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, message, variant }],
    })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (message: string) => useToastStore.getState().push(message, 'info'),
  success: (message: string) => useToastStore.getState().push(message, 'success'),
  error: (message: string) => useToastStore.getState().push(message, 'error'),
};

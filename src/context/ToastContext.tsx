/**
 * Toast context - global toast notifications
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { View } from 'react-native';
import { Toast } from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; visible: boolean; type: 'success' | 'error' | 'info' }>({
    message: '',
    visible: false,
    type: 'success',
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, visible: true, type });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      <View style={{ flex: 1 }}>
        {children}
        <Toast
          message={toast.message}
          visible={toast.visible}
          type={toast.type}
          onHide={hideToast}
        />
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (msg: string) => {
        if (typeof window !== 'undefined') (window as any).alert?.(msg);
      },
    };
  }
  return ctx;
}

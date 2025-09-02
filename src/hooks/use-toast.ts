// ===================================================
// 📁 Archivo: use-toast.ts
// 📌 Ubicación: src/hooks/use-toast.ts
// 🔧 Descripción: Hook personalizado para toast notifications compatible con sonner
//
// 🧠 Uso: Proporciona interfaz unificada para notificaciones toast
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import { toast as sonnerToast } from 'sonner'

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
  duration?: number
}

export function useToast() {
  const toast = ({
    title,
    description,
    variant = 'default',
    duration = 4000,
  }: ToastProps) => {
    const message = description || title || ''
    
    switch (variant) {
      case 'destructive':
        return sonnerToast.error(message, { duration })
      case 'success':
        return sonnerToast.success(message, { duration })
      default:
        return sonnerToast(message, { duration })
    }
  }

  // Métodos de conveniencia
  toast.success = (message: string, duration?: number) => {
    return sonnerToast.success(message, { duration: duration || 4000 })
  }

  toast.error = (message: string, duration?: number) => {
    return sonnerToast.error(message, { duration: duration || 4000 })
  }

  toast.info = (message: string, duration?: number) => {
    return sonnerToast(message, { duration: duration || 4000 })
  }

  return { toast }
}

// Export para compatibilidad
export { useToast as default }
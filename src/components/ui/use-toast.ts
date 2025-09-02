// ✅ Hook para gestionar notificaciones toast
// 📡 Basado en sonner para compatibilidad con shadcn/ui
// 🎨 Proporciona interfaz estándar para toast notifications

import { toast as sonnerToast } from 'sonner'

type ToastProps = {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'destructive'
}

type ToastActionElement = React.ReactElement<any>

interface Toast {
  id: string
  title?: string
  description?: string
  action?: ToastActionElement
  variant?: 'default' | 'destructive'
}

const toast = ({
  title,
  description,
  action,
  variant = 'default'
}: ToastProps) => {
  const message = title || description || ''
  
  if (variant === 'destructive') {
    return sonnerToast.error(message, {
      description: title && description ? description : undefined,
      action: action ? {
        label: action.label,
        onClick: action.onClick
      } : undefined
    })
  }
  
  return sonnerToast.success(message, {
    description: title && description ? description : undefined,
    action: action ? {
      label: action.label,
      onClick: action.onClick
    } : undefined
  })
}

const useToast = () => {
  return {
    toast,
    dismiss: sonnerToast.dismiss,
    toasts: [] as Toast[]
  }
}

export { useToast, toast }
export type { Toast, ToastProps, ToastActionElement }
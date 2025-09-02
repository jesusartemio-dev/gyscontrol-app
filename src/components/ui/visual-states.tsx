'use client'

import { motion } from 'framer-motion'
import { Loader2, AlertCircle, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ===================================================
// 🎨 Visual States Component
// 📌 Componente reutilizable para estados visuales mejorados
// ===================================================

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingState({ 
  message = 'Cargando...', 
  size = 'md',
  className 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('flex items-center justify-center gap-3 p-4', className)}
    >
      <Loader2 className={cn('animate-spin text-blue-600', sizeClasses[size])} />
      <span className="text-muted-foreground font-medium">{message}</span>
    </motion.div>
  )
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export function ErrorState({
  title = 'Error',
  message = 'Algo salió mal',
  onRetry,
  retryLabel = 'Reintentar',
  className
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('text-center p-6', className)}
    >
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="pt-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
          >
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          </motion.div>
          <h3 className="text-lg font-semibold text-destructive mb-2">{title}</h3>
          <p className="text-muted-foreground mb-4">{message}</p>
          {onRetry && (
            <Button 
              onClick={onRetry} 
              variant="outline" 
              className="hover:bg-destructive/10"
            >
              {retryLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon = AlertCircle,
  title = 'No hay datos',
  description = 'No se encontraron elementos para mostrar',
  action,
  className
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('text-center p-8', className)}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
      >
        <Icon className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
      </motion.div>
      <h3 className="text-lg font-semibold text-muted-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground/80 mb-6 max-w-md mx-auto">{description}</p>
      {action && (
        <Button onClick={action.onClick} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
          {action.label}
        </Button>
      )}
    </motion.div>
  )
}

interface SuccessStateProps {
  title?: string
  message?: string
  onContinue?: () => void
  continueLabel?: string
  className?: string
}

export function SuccessState({
  title = 'Éxito',
  message = 'Operación completada exitosamente',
  onContinue,
  continueLabel = 'Continuar',
  className
}: SuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('text-center p-6', className)}
    >
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
          >
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
          </motion.div>
          <h3 className="text-lg font-semibold text-green-800 mb-2">{title}</h3>
          <p className="text-green-700 mb-4">{message}</p>
          {onContinue && (
            <Button 
              onClick={onContinue} 
              className="bg-green-600 hover:bg-green-700"
            >
              {continueLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Status Badge Component with enhanced visuals
interface StatusBadgeProps {
  status: 'pending' | 'loading' | 'success' | 'error' | 'warning' | 'info'
  label: string
  pulse?: boolean
  className?: string
}

export function StatusBadge({ status, label, pulse = false, className }: StatusBadgeProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      variant: 'secondary' as const,
      className: 'bg-gray-100 text-gray-700 border-gray-200'
    },
    loading: {
      icon: Loader2,
      variant: 'secondary' as const,
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    },
    success: {
      icon: CheckCircle2,
      variant: 'secondary' as const,
      className: 'bg-green-100 text-green-700 border-green-200'
    },
    error: {
      icon: XCircle,
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-700 border-red-200'
    },
    warning: {
      icon: AlertCircle,
      variant: 'secondary' as const,
      className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    },
    info: {
      icon: Zap,
      variant: 'secondary' as const,
      className: 'bg-blue-100 text-blue-700 border-blue-200'
    }
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 font-medium border',
        config.className,
        pulse && 'animate-pulse',
        className
      )}
    >
      <Icon className={cn(
        'h-3.5 w-3.5',
        status === 'loading' && 'animate-spin'
      )} />
      {label}
    </Badge>
  )
}

// Form Field State Component
interface FormFieldStateProps {
  state: 'idle' | 'loading' | 'success' | 'error'
  message?: string
  className?: string
}

export function FormFieldState({ state, message, className }: FormFieldStateProps) {
  if (state === 'idle' || !message) return null

  const stateConfig = {
    loading: {
      icon: Loader2,
      className: 'text-blue-600'
    },
    success: {
      icon: CheckCircle2,
      className: 'text-green-600'
    },
    error: {
      icon: XCircle,
      className: 'text-red-600'
    }
  }

  const config = stateConfig[state]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex items-center gap-2 mt-1 text-sm', className)}
    >
      <Icon className={cn(
        'h-4 w-4',
        config.className,
        state === 'loading' && 'animate-spin'
      )} />
      <span className={config.className}>{message}</span>
    </motion.div>
  )
}

// Progress Indicator Component
interface ProgressIndicatorProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function ProgressIndicator({ steps, currentStep, className }: ProgressIndicatorProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isUpcoming = index > currentStep

        return (
          <div key={step} className="flex items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium',
                isCompleted && 'bg-green-600 border-green-600 text-white',
                isCurrent && 'bg-blue-600 border-blue-600 text-white animate-pulse',
                isUpcoming && 'bg-gray-100 border-gray-300 text-gray-500'
              )}
            >
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </motion.div>
            {index < steps.length - 1 && (
              <div className={cn(
                'w-12 h-0.5 mx-2',
                isCompleted ? 'bg-green-600' : 'bg-gray-300'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Skeleton Loader Component
interface SkeletonLoaderProps {
  lines?: number
  className?: string
}

export function SkeletonLoader({ lines = 3, className }: SkeletonLoaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className="h-4 bg-gray-200 rounded animate-pulse"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  )
}
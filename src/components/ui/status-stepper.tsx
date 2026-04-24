'use client'

import React from 'react'
import { Check, X, Loader2, Pause } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type StepStatus = 'completed' | 'current' | 'future' | 'cancelled' | 'rejected' | 'paused'

export interface StatusStep {
  key: string
  label: string
  status: StepStatus
  /** Texto descriptivo opcional — si se provee, aparece como tooltip al hover. */
  description?: string
}

function getLineColor(nextStatus: StepStatus): string {
  switch (nextStatus) {
    case 'completed': return 'bg-emerald-300'
    case 'current': return 'bg-blue-300'
    case 'cancelled':
    case 'rejected': return 'bg-red-300'
    case 'paused': return 'bg-orange-300'
    default: return 'bg-gray-200'
  }
}

function getStepIcon(status: StepStatus, loading?: boolean) {
  if (loading) return <Loader2 className="w-3 h-3 animate-spin" />

  switch (status) {
    case 'completed':
      return <Check className="w-3 h-3" strokeWidth={2.5} />
    case 'current':
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
        </svg>
      )
    case 'cancelled':
    case 'rejected':
      return <X className="w-3 h-3" strokeWidth={2.5} />
    case 'paused':
      return <Pause className="w-3 h-3" strokeWidth={2.5} />
    default:
      return null
  }
}

const statusClasses: Record<StepStatus, string> = {
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  current: 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200 font-bold',
  cancelled: 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-200 font-bold',
  rejected: 'bg-red-600 text-white border-red-600 shadow-sm shadow-red-200 font-bold',
  paused: 'bg-orange-600 text-white border-orange-600 shadow-sm shadow-orange-200 font-bold',
  future: 'bg-gray-50 text-gray-400 border-gray-200',
}

const interactiveHover: Partial<Record<StepStatus, string>> = {
  completed: 'cursor-pointer hover:bg-emerald-200 hover:border-emerald-300',
  current: 'cursor-pointer hover:bg-blue-700',
  future: 'cursor-pointer hover:bg-gray-100 hover:border-gray-300 hover:text-gray-600',
}

// Connecting line between steps
export function StepLine({ nextStatus }: { nextStatus: StepStatus }) {
  return <div className={cn('h-0.5 w-5 flex-shrink-0', getLineColor(nextStatus))} />
}

// Individual pill component
interface StepPillProps {
  label: string
  status: StepStatus
  interactive?: boolean
  loading?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

export function StepPill({ label, status, interactive, loading, disabled, onClick, className, children }: StepPillProps) {
  const base = 'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium border whitespace-nowrap transition-all'
  const canClick = interactive && !disabled

  return (
    <span
      className={cn(
        base,
        statusClasses[status],
        canClick && interactiveHover[status],
        className,
      )}
      onClick={canClick && onClick ? onClick : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={canClick ? 0 : undefined}
    >
      {getStepIcon(status, loading)}
      {label}
      {children}
    </span>
  )
}

// Full stepper for linear flows
interface StatusStepperProps {
  steps: StatusStep[]
  onStepClick?: (stepKey: string) => void
  loadingStep?: string | null
  disabled?: boolean
}

export default function StatusStepper({ steps, onStepClick, loadingStep, disabled }: StatusStepperProps) {
  const isInteractive = !!onStepClick
  const hasDescriptions = steps.some(s => s.description)

  const renderPill = (step: StatusStep) => {
    const pill = (
      <StepPill
        label={step.label}
        status={step.status}
        interactive={isInteractive}
        loading={loadingStep === step.key}
        disabled={disabled}
        onClick={() => onStepClick?.(step.key)}
      />
    )

    if (!step.description) return pill

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{pill}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {step.description}
        </TooltipContent>
      </Tooltip>
    )
  }

  const content = (
    <div className="flex items-center overflow-x-auto">
      {steps.map((step, index) => (
        <React.Fragment key={step.key}>
          {index > 0 && <StepLine nextStatus={step.status} />}
          {renderPill(step)}
        </React.Fragment>
      ))}
    </div>
  )

  if (!hasDescriptions) return content
  return <TooltipProvider delayDuration={150}>{content}</TooltipProvider>
}

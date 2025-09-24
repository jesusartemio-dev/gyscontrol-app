'use client'

import { useState, useCallback } from 'react'

interface HistoryAction {
  id: string
  type: 'move' | 'resize' | 'create' | 'delete' | 'dependency_add' | 'dependency_remove'
  itemId: string
  itemType: 'fase' | 'edt' | 'tarea' | 'subtarea' | 'dependency'
  previousData: any
  newData: any
  timestamp: Date
}

interface GanttHistoryState {
  past: HistoryAction[]
  present: any // Current state
  future: HistoryAction[]
}

export function useGanttHistory(initialState: any) {
  const [history, setHistory] = useState<GanttHistoryState>({
    past: [],
    present: initialState,
    future: []
  })

  const canUndo = history.past.length > 0
  const canRedo = history.future.length > 0

  const recordAction = useCallback((action: Omit<HistoryAction, 'id' | 'timestamp'>) => {
    const newAction: HistoryAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random()}`,
      timestamp: new Date()
    }

    setHistory(prev => ({
      past: [...prev.past, newAction],
      present: action.newData,
      future: [] // Clear future when new action is recorded
    }))
  }, [])

  const undo = useCallback(() => {
    if (!canUndo) return null

    setHistory(prev => {
      const lastAction = prev.past[prev.past.length - 1]
      const newPast = prev.past.slice(0, -1)

      return {
        past: newPast,
        present: lastAction.previousData,
        future: [lastAction, ...prev.future]
      }
    })

    return history.past[history.past.length - 1]
  }, [canUndo, history.past])

  const redo = useCallback(() => {
    if (!canRedo) return null

    setHistory(prev => {
      const nextAction = prev.future[0]
      const newFuture = prev.future.slice(1)

      return {
        past: [...prev.past, nextAction],
        present: nextAction.newData,
        future: newFuture
      }
    })

    return history.future[0]
  }, [canRedo, history.future])

  const clearHistory = useCallback(() => {
    setHistory({
      past: [],
      present: history.present,
      future: []
    })
  }, [history.present])

  return {
    state: history.present,
    canUndo,
    canRedo,
    recordAction,
    undo,
    redo,
    clearHistory,
    historySize: {
      past: history.past.length,
      future: history.future.length
    }
  }
}
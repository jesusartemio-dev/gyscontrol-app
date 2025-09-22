'use client'

/**
 * 🎯 ImportOptionsModal - Modal para seleccionar método de importación
 *
 * Modal que permite elegir entre 3 métodos de importación de tareas:
 * 1. Importación Rápida (automática)
 * 2. Importación Avanzada (paso a paso)
 * 3. Creación Manual (individual)
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Zap,
  Package,
  Plus,
  CheckCircle
} from 'lucide-react'

interface ImportOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectOption: (option: 'quick' | 'advanced' | 'manual') => void
}

export function ImportOptionsModal({
  isOpen,
  onClose,
  onSelectOption
}: ImportOptionsModalProps) {

  const options = [
    {
      id: 'quick' as const,
      title: 'Importación Rápida',
      icon: Zap,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      features: [
        '1 solo paso',
        'Valores automáticos',
        'Fechas secuenciales',
        'Sin dependencias',
        'Configuración posterior'
      ],
      recommended: 'Proyectos nuevos'
    },
    {
      id: 'advanced' as const,
      title: 'Importación Avanzada',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      features: [
        '3 pasos guiados',
        'Configuración individual',
        'Dependencias visuales',
        'Validación de ciclos',
        'Control total'
      ],
      recommended: 'Proyectos complejos'
    },
    {
      id: 'manual' as const,
      title: 'Creación Manual',
      icon: Plus,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      features: [
        'Control total',
        'Configuración individual',
        'Flexibilidad máxima',
        'Validación inmediata',
        'Ideal para casos especiales'
      ],
      recommended: 'Tareas específicas'
    }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Elegir Método de Importación de Tareas
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          {options.map((option) => {
            const IconComponent = option.icon

            return (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${option.borderColor} hover:border-opacity-100`}
                onClick={() => onSelectOption(option.id)}
              >
                <CardHeader className={`pb-3 ${option.bgColor}`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${option.bgColor} ${option.color}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    {option.recommended && (
                      <Badge variant="secondary" className="text-xs">
                        {option.recommended}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base">{option.title}</CardTitle>
                </CardHeader>

                <CardContent className="space-y-1">
                  {/* Características */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-medium text-muted-foreground">Características:</h4>
                    <ul className="space-y-0.5">
                      {option.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-xs">
                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Indicador de acción */}
                  <div className="text-center mt-3">
                    <span className="text-xs text-muted-foreground">Haz clic para seleccionar</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}
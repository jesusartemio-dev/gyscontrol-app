'use client'

/**
 * 🔍 CronogramaFilters - Filtros del cronograma
 *
 * Componente básico para filtros del cronograma comercial.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, Search, X } from 'lucide-react'

interface CronogramaFiltersProps {
  cotizacionId: string
  onFiltersChange: () => void
}

export function CronogramaFilters({
  cotizacionId,
  onFiltersChange
}: CronogramaFiltersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros del Cronograma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Buscar EDTs..."
                className="pl-8"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="categoria">Categoría</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {/* TODO: Cargar categorías reales */}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="estado">Estado</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="planificado">Planificado</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="completado">Completado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="responsable">Responsable</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Todos los responsables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {/* TODO: Cargar usuarios reales */}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Aplicar Filtros
          </Button>
          <Button variant="ghost" size="sm">
            <X className="h-4 w-4 mr-2" />
            Limpiar
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          Los filtros avanzados estarán disponibles próximamente.
        </div>
      </CardContent>
    </Card>
  )
}
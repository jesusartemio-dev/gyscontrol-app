"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Check, AlertTriangle, ChevronDown, Eye } from "lucide-react"
import { CotizacionProveedorItem } from "@/types/modelos"
import { cn } from "@/lib/utils"
import { seleccionarCotizacion } from "@/lib/services/cotizacionProveedorItem"
import { toast } from "sonner"
import { useState } from "react"

/**
 * ✅ Props del componente CotizacionInfo
 */
interface CotizacionInfoProps {
  /** Array de todas las cotizaciones disponibles para el item */
  cotizaciones: CotizacionProveedorItem[]
  /** ID de la cotización actualmente seleccionada */
  cotizacionSeleccionadaId?: string
  /** Mostrar en formato compacto */
  compact?: boolean
  /** Permitir selección interactiva */
  interactive?: boolean
  /** Callback cuando se selecciona una cotización */
  onSelectionChange?: (cotizacionId: string) => void
  /** ID del item de lista para actualizar la selección */
  listaEquipoItemId?: string
}

/**
 * ✅ Componente para mostrar información de cotizaciones de un item
 * Muestra todos los códigos de cotizaciones disponibles y resalta la seleccionada
 * Permite selección interactiva cuando está habilitada
 */
export function CotizacionInfo({
  cotizaciones,
  cotizacionSeleccionadaId,
  compact = false,
  interactive = false,
  onSelectionChange,
  listaEquipoItemId
}: CotizacionInfoProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // 🔄 Función para cambiar la cotización seleccionada
  const handleSelectionChange = async (cotizacionId: string) => {
    if (!interactive || !listaEquipoItemId || isLoading) return
    
    try {
      setIsLoading(true)
      await seleccionarCotizacion(listaEquipoItemId, cotizacionId)
      onSelectionChange?.(cotizacionId)
      setIsOpen(false)
      toast.success('Cotización seleccionada correctamente')
    } catch (error) {
      console.error('Error al seleccionar cotización:', error)
      toast.error('Error al seleccionar la cotización')
    } finally {
      setIsLoading(false)
    }
  }
  // 🔁 Si no hay cotizaciones, mostrar estado vacío
  if (!cotizaciones || cotizaciones.length === 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Sin cotizaciones
      </Badge>
    )
  }

  // 🔁 Encontrar la cotización seleccionada
  const selectedCotizacion = cotizaciones.find(c => c.id === cotizacionSeleccionadaId)

  // 🔁 Si no hay cotización seleccionada
  if (!cotizacionSeleccionadaId || !selectedCotizacion) {
    if (interactive) {
      // 🎯 Vista interactiva sin selección
      return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-6 px-2 text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
              disabled={isLoading}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              No seleccionada
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Seleccionar cotización:
              </p>
              {cotizaciones.map((cotizacion) => {
                const codigo = cotizacion.cotizacion?.codigo || "Sin código"
                const proveedor = cotizacion.cotizacion?.proveedor?.nombre || "Sin proveedor"
                return (
                  <Button
                    key={cotizacion.id}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-auto p-2 text-xs"
                    onClick={() => handleSelectionChange(cotizacion.id)}
                    disabled={isLoading}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{codigo}</span>
                      <span className="text-muted-foreground">{proveedor}</span>
                    </div>
                  </Button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      )
    }
    
    // 📊 Vista no interactiva sin selección
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {cotizaciones.map((cotizacion) => (
          <Badge 
            key={cotizacion.id}
            variant="outline" 
            className="text-xs text-muted-foreground"
          >
            {cotizacion.cotizacion?.codigo || "Sin código"}
          </Badge>
        ))}
        <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          No seleccionada
        </Badge>
      </div>
    )
  }

  if (compact) {
    // 📱 Vista compacta: solo mostrar la seleccionada + contador
    if (interactive) {
      return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-6 px-2 text-xs bg-green-500 hover:bg-green-600 text-white border-green-500"
              disabled={isLoading}
            >
              {selectedCotizacion?.cotizacion?.codigo || "Sin código"}
              <Check className="ml-1 h-3 w-3" />
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Cambiar cotización ({cotizaciones.length} disponibles):
              </p>
              {cotizaciones.map((cotizacion) => {
                const isSelected = cotizacionSeleccionadaId === cotizacion.id
                const codigo = cotizacion.cotizacion?.codigo || "Sin código"
                const proveedor = cotizacion.cotizacion?.proveedor?.nombre || "Sin proveedor"
                return (
                  <Button
                    key={cotizacion.id}
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start h-auto p-2 text-xs",
                      isSelected && "bg-green-500 hover:bg-green-600 text-white"
                    )}
                    onClick={() => !isSelected && handleSelectionChange(cotizacion.id)}
                    disabled={isLoading || isSelected}
                  >
                    <div className="flex flex-col items-start">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{codigo}</span>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <span className="text-muted-foreground">{proveedor}</span>
                    </div>
                  </Button>
                )
              })}
            </div>
          </PopoverContent>
        </Popover>
      )
    }
    
    return (
      <div className="flex items-center gap-2">
        <Badge 
          variant="default"
          className="bg-green-500 hover:bg-green-600 text-white text-xs"
        >
          {selectedCotizacion?.cotizacion?.codigo || "Sin código"}
          <Check className="ml-1 h-3 w-3" />
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {cotizaciones.length} total
        </Badge>
      </div>
    )
  }

  // 📊 Vista completa: mostrar todas las cotizaciones
  if (interactive) {
    return (
      <div className="flex flex-wrap gap-1 items-center">
        {cotizaciones.map((cotizacion) => {
          const isSelected = cotizacionSeleccionadaId === cotizacion.id
          const codigo = cotizacion.cotizacion?.codigo || "Sin código"
          
          return (
            <Button
              key={cotizacion.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              className={cn(
                "h-6 px-2 text-xs transition-colors",
                isSelected && "bg-green-500 hover:bg-green-600 text-white",
                !isSelected && "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              onClick={() => !isSelected && handleSelectionChange(cotizacion.id)}
              disabled={isLoading || isSelected}
            >
              {codigo}
              {isSelected && <Check className="ml-1 h-3 w-3" />}
            </Button>
          )
        })}
        {cotizaciones.length > 1 && (
          <Badge variant="secondary" className="text-xs ml-1">
            {cotizaciones.length} opciones
          </Badge>
        )}
      </div>
    )
  }
  
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {cotizaciones.map((cotizacion) => {
        const isSelected = cotizacionSeleccionadaId === cotizacion.id
        const codigo = cotizacion.cotizacion?.codigo || "Sin código"
        
        return (
          <Badge 
            key={cotizacion.id}
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "text-xs transition-colors",
              isSelected && "bg-green-500 hover:bg-green-600 text-white",
              !isSelected && "text-muted-foreground hover:text-foreground"
            )}
          >
            {codigo}
            {isSelected && <Check className="ml-1 h-3 w-3" />}
          </Badge>
        )
      })}
    </div>
  )
}

/**
 * ✅ Componente simplificado para mostrar solo la cotización seleccionada
 * Útil cuando no se necesita mostrar todas las cotizaciones
 */
export function CotizacionBadge({ 
  cotizacion, 
  isSelected = false 
}: { 
  cotizacion?: CotizacionProveedorItem
  isSelected?: boolean 
}) {
  if (!cotizacion) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        No seleccionada
      </Badge>
    )
  }

  return (
    <Badge 
      variant={isSelected ? "default" : "outline"}
      className={cn(
        "transition-colors",
        isSelected && "bg-green-500 hover:bg-green-600 text-white"
      )}
    >
      {cotizacion.cotizacion?.codigo || "Sin código"}
      {isSelected && <Check className="ml-1 h-3 w-3" />}
    </Badge>
  )
}

/**
 * ✅ Componente para mostrar solo el código de la cotización seleccionada
 * Versión simplificada que solo muestra la cotización elegida
 */
export function CotizacionCodigoSimple({
  cotizaciones,
  cotizacionSeleccionadaId,
  interactive = false,
  onSelectionChange,
  listaEquipoItemId
}: {
  cotizaciones: CotizacionProveedorItem[]
  cotizacionSeleccionadaId?: string
  interactive?: boolean
  onSelectionChange?: (cotizacionId: string) => void
  listaEquipoItemId?: string
}) {
  // 🔄 Si es interactivo, usar CotizacionInfo en modo compacto
  if (interactive) {
    return (
      <CotizacionInfo
        cotizaciones={cotizaciones}
        cotizacionSeleccionadaId={cotizacionSeleccionadaId}
        compact={true}
        interactive={true}
        onSelectionChange={onSelectionChange}
        listaEquipoItemId={listaEquipoItemId}
      />
    )
  }

  // 🔍 Si no hay cotizaciones
  if (!cotizaciones || cotizaciones.length === 0) {
    return <Badge variant="outline">-</Badge>
  }

  // ✅ Mostrar todas las cotizaciones en lista vertical
  return (
      <div className="flex flex-col gap-1">
        {cotizaciones.map((cotizacion) => {
          const codigo = cotizacion.cotizacion?.codigo || "Sin código"
          const isSelected = cotizacion.id === cotizacionSeleccionadaId
          const precio = cotizacion.precioUnitario || 0
          const tiempoEntrega = cotizacion.tiempoEntrega || "No especificado"
          
          return (
            <Tooltip key={cotizacion.id}>
              <TooltipTrigger asChild>
                <Badge 
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "text-[10px] px-2 py-1 flex items-center gap-1 cursor-help transition-all duration-200",
                    isSelected 
                      ? "bg-green-500 hover:bg-green-600 text-white animate-pulse" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  {isSelected && (
                    <Check className="w-3 h-3 animate-bounce" />
                  )}
                  {codigo}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">{codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Precio:</span> ${precio.toFixed(2)} USD
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Tiempo de entrega:</span> {tiempoEntrega}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
  )
}

// 🔄 Mantener compatibilidad con el nombre anterior
export const CotizacionSelector = CotizacionInfo
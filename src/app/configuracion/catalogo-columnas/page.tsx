'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Settings, Save, Loader2, Package, Eye, Shield, Truck, FolderOpen, Calculator
} from 'lucide-react'
import { buildApiUrl } from '@/lib/utils'

type Vista = 'admin' | 'comercial' | 'logistica' | 'proyectos'

interface VistaConfig {
  columnas: string[]
  permisos: {
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
    canImport: boolean
    canExport: boolean
  }
}

const VISTA_META: Record<Vista, { label: string, icon: typeof Package, color: string, description: string }> = {
  admin: { label: 'Admin', icon: Settings, color: 'text-blue-600', description: 'Vista completa para administradores' },
  comercial: { label: 'Comercial', icon: Calculator, color: 'text-green-600', description: 'Vista para el equipo comercial' },
  logistica: { label: 'Logística', icon: Truck, color: 'text-orange-600', description: 'Vista para el equipo de logística' },
  proyectos: { label: 'Proyectos', icon: FolderOpen, color: 'text-purple-600', description: 'Vista para gestores de proyecto' },
}

const ALL_COLUMNS = [
  { key: 'codigo', label: 'Código', required: true },
  { key: 'descripcion', label: 'Descripción', required: true },
  { key: 'categoria', label: 'Categoría' },
  { key: 'unidad', label: 'Unidad' },
  { key: 'marca', label: 'Marca' },
  { key: 'uso', label: 'Uso (conteos)' },
  { key: 'precioLista', label: 'Precio Lista' },
  { key: 'factorCosto', label: 'Factor Costo' },
  { key: 'factorVenta', label: 'Factor Venta' },
  { key: 'precioInterno', label: 'Precio Interno' },
  { key: 'precioVenta', label: 'Precio Venta' },
  { key: 'estado', label: 'Estado' },
]

const ALL_PERMISOS = [
  { key: 'canCreate', label: 'Crear' },
  { key: 'canEdit', label: 'Editar' },
  { key: 'canDelete', label: 'Eliminar' },
  { key: 'canImport', label: 'Importar' },
  { key: 'canExport', label: 'Exportar' },
]

const VISTAS_ORDER: Vista[] = ['admin', 'comercial', 'logistica', 'proyectos']

export default function CatalogoColumnasPage() {
  const [configs, setConfigs] = useState<Record<Vista, VistaConfig> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const res = await fetch(buildApiUrl('/api/configuracion/catalogo-columnas'))
      if (!res.ok) throw new Error()
      const data = await res.json()
      setConfigs(data)
    } catch {
      toast.error('Error al cargar configuración')
    } finally {
      setLoading(false)
    }
  }

  const toggleColumn = (vista: Vista, columnKey: string) => {
    if (!configs) return
    setConfigs(prev => {
      if (!prev) return prev
      const current = prev[vista]
      const columnas = current.columnas.includes(columnKey)
        ? current.columnas.filter(c => c !== columnKey)
        : [...current.columnas, columnKey]
      return { ...prev, [vista]: { ...current, columnas } }
    })
  }

  const togglePermiso = (vista: Vista, permisoKey: string) => {
    if (!configs) return
    setConfigs(prev => {
      if (!prev) return prev
      const current = prev[vista]
      return {
        ...prev,
        [vista]: {
          ...current,
          permisos: {
            ...current.permisos,
            [permisoKey]: !current.permisos[permisoKey as keyof typeof current.permisos]
          }
        }
      }
    })
  }

  const handleSave = async () => {
    if (!configs) return
    setSaving(true)
    try {
      for (const vista of VISTAS_ORDER) {
        const res = await fetch(buildApiUrl('/api/configuracion/catalogo-columnas'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vista,
            columnas: configs[vista].columnas,
            permisos: configs[vista].permisos,
          })
        })
        if (!res.ok) throw new Error(`Error al guardar ${vista}`)
      }
      toast.success('Configuración guardada')
    } catch {
      toast.error('Error al guardar configuración')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-96" />)}
        </div>
      </div>
    )
  }

  if (!configs) {
    return <div className="text-center py-12 text-muted-foreground">Error al cargar configuración</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">Vistas del Catálogo de Equipos</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configura qué columnas y permisos tiene cada vista del catálogo
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar
        </Button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {VISTAS_ORDER.map(vista => {
          const meta = VISTA_META[vista]
          const config = configs[vista]
          const Icon = meta.icon

          return (
            <Card key={vista}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${meta.color}`} />
                  <CardTitle className="text-base">{meta.label}</CardTitle>
                  <Badge variant="secondary" className="text-xs ml-auto">
                    {config.columnas.length} columnas
                  </Badge>
                </div>
                <CardDescription>{meta.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Columns section */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Columnas visibles</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_COLUMNS.map(col => {
                      const isActive = config.columnas.includes(col.key)
                      const isRequired = col.required
                      return (
                        <div key={col.key} className="flex items-center justify-between py-1">
                          <Label htmlFor={`${vista}-${col.key}`} className={`text-sm ${isRequired ? 'text-muted-foreground' : ''}`}>
                            {col.label}
                          </Label>
                          <Switch
                            id={`${vista}-${col.key}`}
                            checked={isActive}
                            onCheckedChange={() => toggleColumn(vista, col.key)}
                            disabled={isRequired}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                {/* Permissions section */}
                <div>
                  <div className="flex items-center gap-1.5 mb-3">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Permisos</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_PERMISOS.map(perm => {
                      const isActive = config.permisos[perm.key as keyof typeof config.permisos]
                      return (
                        <div key={perm.key} className="flex items-center justify-between py-1">
                          <Label htmlFor={`${vista}-${perm.key}`} className="text-sm">
                            {perm.label}
                          </Label>
                          <Switch
                            id={`${vista}-${perm.key}`}
                            checked={isActive}
                            onCheckedChange={() => togglePermiso(vista, perm.key)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  History,
  Plus,
  Eye,
  Download,
  GitBranch,
  Clock,
  User,
  FileText,
  AlertCircle,
  ArrowLeftRight,
  Copy
} from 'lucide-react'
import {
  createCotizacionVersion,
  getCotizacionVersions,
  getCotizacionVersion,
  createCotizacionSnapshot,
  restoreVersionAsNewCotizacion,
  type CotizacionVersion
} from '@/lib/services/cotizacion-versions'
import { updateCotizacion } from '@/lib/services/cotizacion'
import VersionSnapshotModal from './VersionSnapshotModal'
import VersionCompareModal from './VersionCompareModal'

interface VersionesCotizacionProps {
  cotizacionId: string
  cotizacionCodigo: string
  cotizacionNombre: string
  onVersionCreated?: () => void
}

export default function VersionesCotizacion({
  cotizacionId,
  cotizacionCodigo,
  cotizacionNombre,
  onVersionCreated
}: VersionesCotizacionProps) {
  const [versiones, setVersiones] = useState<CotizacionVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    cambios: '',
    motivoCambio: ''
  })
  const [viewVersion, setViewVersion] = useState<CotizacionVersion | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const [duplicateVersion, setDuplicateVersion] = useState<CotizacionVersion | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadVersiones()
  }, [cotizacionId])

  const loadVersiones = async () => {
    try {
      setLoading(true)
      const data = await getCotizacionVersions(cotizacionId)
      setVersiones(data)
    } catch (error) {
      console.error('Error loading versiones:', error)
      toast.error('Error al cargar versiones')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateVersion = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre de la versión es requerido')
      return
    }

    try {
      setCreating(true)

      // Crear snapshot de la cotización actual
      const snapshot = await createCotizacionSnapshot(cotizacionId)

      // Crear la versión
      const nuevaVersion = await createCotizacionVersion({
        cotizacionId,
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        cambios: formData.cambios,
        motivoCambio: formData.motivoCambio,
        snapshot
      })

      // Auto-update revision field on cotización
      const revisionCode = `R${String(nuevaVersion.version).padStart(2, '0')}`
      try {
        await updateCotizacion(cotizacionId, { revision: revisionCode })
      } catch { /* revision update is non-critical */ }

      setVersiones(prev => [nuevaVersion, ...prev])
      setShowCreateDialog(false)
      setFormData({ nombre: '', descripcion: '', cambios: '', motivoCambio: '' })
      onVersionCreated?.()

      toast.success(`Versión v${nuevaVersion.version} (${revisionCode}) creada exitosamente`)
    } catch (error) {
      console.error('Error creating version:', error)
      toast.error('Error al crear la versión')
    } finally {
      setCreating(false)
    }
  }

  const handleViewVersion = async (version: CotizacionVersion) => {
    try {
      // If snapshot is already in the list item, use it directly
      if (version.snapshot) {
        setViewVersion(version)
      } else {
        const full = await getCotizacionVersion(version.id)
        setViewVersion(full)
      }
    } catch {
      toast.error('Error al cargar versión')
    }
  }

  const handleDuplicateVersion = useCallback(async () => {
    if (!duplicateVersion) return
    try {
      setDuplicating(true)
      const result = await restoreVersionAsNewCotizacion(duplicateVersion.id)
      toast.success(result.message || 'Copia creada exitosamente')
      setDuplicateVersion(null)
      // Navigate to the new cotización
      if (result.cotizacion?.id) {
        router.push(`/comercial/cotizaciones/${result.cotizacion.id}`)
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al crear copia')
    } finally {
      setDuplicating(false)
    }
  }, [duplicateVersion, router])

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'enviada': return 'default'
      case 'aprobada': return 'secondary'
      case 'rechazada': return 'destructive'
      default: return 'outline'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Versiones de Cotización
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Cargando versiones...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Versiones de Cotización
            </CardTitle>
            <CardDescription>
              Historial de versiones de {cotizacionCodigo} - {cotizacionNombre}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            {versiones.length >= 2 && (
              <Button variant="outline" onClick={() => setShowCompare(true)}>
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Comparar
              </Button>
            )}
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Versión
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Nueva Versión</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre de la Versión *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="ej: Versión inicial, Actualización precios, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea
                    id="descripcion"
                    value={formData.descripcion}
                    onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Descripción de esta versión..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="cambios">Cambios Realizados</Label>
                  <Textarea
                    id="cambios"
                    value={formData.cambios}
                    onChange={(e) => setFormData(prev => ({ ...prev, cambios: e.target.value }))}
                    placeholder="Lista de cambios realizados..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="motivo">Motivo del Cambio</Label>
                  <Input
                    id="motivo"
                    value={formData.motivoCambio}
                    onChange={(e) => setFormData(prev => ({ ...prev, motivoCambio: e.target.value }))}
                    placeholder="ej: Actualización de precios, cambios técnicos, etc."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateVersion}
                  disabled={creating || !formData.nombre.trim()}
                >
                  {creating ? 'Creando...' : 'Crear Versión'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {versiones.length === 0 ? (
          <div className="text-center py-8">
            <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay versiones</h3>
            <p className="text-muted-foreground mb-4">
              Crea la primera versión para comenzar a trackear cambios en esta cotización.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primera Versión
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {versiones.map((version, index) => (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">v{version.version}</span>
                          </div>
                          <Badge variant={getEstadoBadgeVariant(version.estado) as any}>
                            {version.estado}
                          </Badge>
                          {index === 0 && (
                            <Badge variant="default" className="text-xs">
                              Más Reciente
                            </Badge>
                          )}
                        </div>

                        <h4 className="font-medium mb-1">{version.nombre}</h4>

                        {version.descripcion && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {version.descripcion}
                          </p>
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{version.user.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(version.createdAt)}</span>
                          </div>
                        </div>

                        {version.motivoCambio && (
                          <div className="mt-2 text-xs">
                            <span className="font-medium">Motivo:</span> {version.motivoCambio}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => handleViewVersion(version)}>
                          <Eye className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setDuplicateVersion(version)}>
                          <Copy className="h-3 w-3 mr-1" />
                          Duplicar
                        </Button>
                      </div>
                    </div>

                    {version.cambios && (
                      <>
                        <Separator className="my-3" />
                        <div>
                          <h5 className="text-sm font-medium mb-1">Cambios realizados:</h5>
                          <p className="text-sm text-muted-foreground">{version.cambios}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>

      {/* View version snapshot modal */}
      {viewVersion && (
        <VersionSnapshotModal
          open={!!viewVersion}
          onOpenChange={(open) => { if (!open) setViewVersion(null) }}
          versionNumber={viewVersion.version}
          versionNombre={viewVersion.nombre}
          snapshot={viewVersion.snapshot}
        />
      )}

      {/* Compare versions modal */}
      <VersionCompareModal
        open={showCompare}
        onOpenChange={setShowCompare}
        versiones={versiones}
      />

      {/* Duplicate confirmation dialog */}
      <AlertDialog open={!!duplicateVersion} onOpenChange={(open) => { if (!open) setDuplicateVersion(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicar como nueva cotización</AlertDialogTitle>
            <AlertDialogDescription>
              Se creará una <strong>nueva cotización</strong> con los datos de la versión v{duplicateVersion?.version} ({duplicateVersion?.nombre}).
              La cotización actual no se modificará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={duplicating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateVersion} disabled={duplicating}>
              {duplicating ? 'Creando...' : 'Crear Copia'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
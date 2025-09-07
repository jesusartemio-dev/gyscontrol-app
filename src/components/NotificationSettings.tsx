// ✅ Componente para configurar preferencias de notificaciones del usuario
// 📡 Integra con el hook useNotifications para gestionar configuraciones
// 🎨 UI moderna con switches, sliders y opciones avanzadas

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  Clock, 
  Settings2,
  Save,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { useNotifications } from '@/lib/hooks/useNotifications'

interface NotificationSettingsProps {
  className?: string
}

export default function NotificationSettings({ className }: NotificationSettingsProps) {
  const { preferences, updatePreferences, loading } = useNotifications()
  const { toast } = useToast()
  const [hasChanges, setHasChanges] = useState(false)

  // ✅ Estado local para manejar cambios antes de guardar
  const [localPreferences, setLocalPreferences] = useState(preferences)

  // 🔁 Actualizar estado local cuando cambien las preferencias
  const handlePreferenceChange = (key: keyof typeof preferences, value: any) => {
    setLocalPreferences(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  // 💾 Guardar cambios
  const handleSave = () => {
    updatePreferences(localPreferences)
    setHasChanges(false)
    toast({
      title: "Configuración guardada",
      description: "Tus preferencias de notificaciones han sido actualizadas.",
    })
  }

  // 🔄 Resetear cambios
  const handleReset = () => {
    setLocalPreferences(preferences)
    setHasChanges(false)
  }

  // 🎨 Opciones de intervalo de actualización
  const intervalOptions = [
    { value: 15, label: '15 segundos' },
    { value: 30, label: '30 segundos' },
    { value: 60, label: '1 minuto' },
    { value: 120, label: '2 minutos' },
    { value: 300, label: '5 minutos' },
  ]

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Settings2 className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2">
              Configuración de Notificaciones
              {hasChanges && (
                <Badge variant="secondary" className="text-xs">
                  Cambios pendientes
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Personaliza cómo y cuándo recibir notificaciones del sistema
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 🔔 Activar/Desactivar notificaciones */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {localPreferences.enabled ? (
                <Bell className="h-5 w-5 text-green-500" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <Label className="text-sm font-medium">
                  Notificaciones habilitadas
                </Label>
                <p className="text-xs text-muted-foreground">
                  Recibir alertas sobre el sistema
                </p>
              </div>
            </div>
            <Switch
              checked={localPreferences.enabled}
              onCheckedChange={(checked) => handlePreferenceChange('enabled', checked)}
              disabled={loading}
            />
          </div>

          {/* 🔊 Sonido de notificaciones */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {localPreferences.soundEnabled ? (
                <Volume2 className="h-5 w-5 text-blue-500" />
              ) : (
                <VolumeX className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <Label className="text-sm font-medium">
                  Sonido de notificaciones
                </Label>
                <p className="text-xs text-muted-foreground">
                  Reproducir sonido al recibir notificaciones importantes
                </p>
              </div>
            </div>
            <Switch
              checked={localPreferences.soundEnabled}
              onCheckedChange={(checked) => handlePreferenceChange('soundEnabled', checked)}
              disabled={loading || !localPreferences.enabled}
            />
          </div>
        </div>

        <Separator />

        {/* ⏱️ Intervalo de actualización */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <Label className="text-sm font-medium">
                Frecuencia de actualización
              </Label>
              <p className="text-xs text-muted-foreground">
                Cada cuánto tiempo verificar nuevas notificaciones
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Más rápido</span>
              <Badge variant="outline" className="text-xs">
                {intervalOptions.find(opt => opt.value === localPreferences.updateInterval)?.label || `${localPreferences.updateInterval}s`}
              </Badge>
              <span className="text-sm text-muted-foreground">Más lento</span>
            </div>
            
            <Slider
              value={[localPreferences.updateInterval]}
              onValueChange={([value]) => handlePreferenceChange('updateInterval', value)}
              min={15}
              max={300}
              step={15}
              disabled={loading || !localPreferences.enabled}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>15s</span>
              <span>30s</span>
              <span>1m</span>
              <span>2m</span>
              <span>5m</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* 📊 Información adicional */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Tipos de notificaciones
          </h4>
          <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>• Cotizaciones pendientes</span>
              <Badge variant="secondary">Comercial</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>• Proyectos en progreso</span>
              <Badge variant="secondary">Proyectos</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>• Pedidos de equipos</span>
              <Badge variant="secondary">Logística</Badge>
            </div>
          </div>
        </div>

        {/* 💾 Botones de acción */}
        <div className="flex items-center gap-3 pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || loading}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar cambios
          </Button>
          
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || loading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetear
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
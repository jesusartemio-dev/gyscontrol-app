// ===================================================
// 📁 Archivo: SessionDebug.tsx
// 🔧 Descripción: Componente para debuggear la sesión en el frontend
// ✍️ Autor: GYS AI Assistant
// 📅 Fecha: 2025-01-27
// ===================================================

'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, User, AlertCircle, CheckCircle } from 'lucide-react'

export default function SessionDebug() {
  const { data: session, status } = useSession()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkSession = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/debug/session', {
        credentials: 'include'
      })
      const data = await response.json()
      setDebugInfo({ status: response.status, data })
    } catch (error) {
      setDebugInfo({ error: String(error) })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mb-4 border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-800">
          <AlertCircle className="h-5 w-5" />
          Debug de Sesión
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado de NextAuth */}
        <div>
          <h4 className="font-medium mb-2">Estado de NextAuth:</h4>
          <div className="flex items-center gap-2">
            <Badge variant={status === 'authenticated' ? 'default' : 'destructive'}>
              {status}
            </Badge>
            {status === 'authenticated' && (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>

        {/* Información de la sesión */}
        {session && (
          <div>
            <h4 className="font-medium mb-2">Datos de Sesión:</h4>
            <div className="bg-white p-3 rounded border text-sm">
              <div><strong>ID:</strong> {session.user?.id || 'No disponible'}</div>
              <div><strong>Nombre:</strong> {session.user?.name || 'No disponible'}</div>
              <div><strong>Email:</strong> {session.user?.email || 'No disponible'}</div>
              <div><strong>Rol:</strong> {(session.user as any)?.role || 'No disponible'}</div>
              <div><strong>Expira:</strong> {session.expires}</div>
            </div>
          </div>
        )}

        {/* Botón para verificar sesión en servidor */}
        <div>
          <Button 
            onClick={checkSession} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <User className="h-4 w-4 mr-2" />
            )}
            Verificar Sesión en Servidor
          </Button>
        </div>

        {/* Resultado del debug */}
        {debugInfo && (
          <div>
            <h4 className="font-medium mb-2">Respuesta del Servidor:</h4>
            <div className="bg-white p-3 rounded border text-sm">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
'use client'

/**
 * Página de Aprobación de Horas de Campo
 * Permite a gestores/gerentes aprobar o rechazar registros de campo
 */

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { AprobacionCampoList } from '@/components/horas-hombre/AprobacionCampoList'

export default function AprobarCampoPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-blue-600" />
            Aprobación de Horas de Campo
          </h1>
          <p className="text-sm text-gray-500">
            Revisa y aprueba los registros de horas de campo de los supervisores
          </p>
        </div>
      </div>

      {/* Contenido principal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Registros de Campo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pendiente">
            <TabsList className="mb-4">
              <TabsTrigger value="pendiente" className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                Pendientes
              </TabsTrigger>
              <TabsTrigger value="aprobado" className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Aprobados
              </TabsTrigger>
              <TabsTrigger value="rechazado" className="flex items-center gap-1">
                <XCircle className="h-4 w-4" />
                Rechazados
              </TabsTrigger>
              <TabsTrigger value="todos">
                Todos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendiente">
              <AprobacionCampoList
                key={`pendiente-${refreshKey}`}
                estado="pendiente"
                onRefresh={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="aprobado">
              <AprobacionCampoList
                key={`aprobado-${refreshKey}`}
                estado="aprobado"
                onRefresh={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="rechazado">
              <AprobacionCampoList
                key={`rechazado-${refreshKey}`}
                estado="rechazado"
                onRefresh={handleRefresh}
              />
            </TabsContent>

            <TabsContent value="todos">
              <AprobacionCampoList
                key={`todos-${refreshKey}`}
                estado="todos"
                onRefresh={handleRefresh}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

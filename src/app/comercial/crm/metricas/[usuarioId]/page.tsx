'use client'

import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MetricasUsuario from '@/components/crm/metricas/MetricasUsuario'

export default function MetricasUsuarioPage() {
  const { usuarioId } = useParams()
  const router = useRouter()
  const userId = usuarioId as string

  return (
    <motion.div
      className="min-h-screen bg-gray-50/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header con navegación */}
      <div className="bg-white border-b">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Métricas Individuales
              </h1>
              <p className="text-muted-foreground">
                Análisis detallado del rendimiento comercial
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <MetricasUsuario usuarioId={userId} />
    </motion.div>
  )
}
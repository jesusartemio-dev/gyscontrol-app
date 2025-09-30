'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Target, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface QuotationWorkspaceHeaderProps {
  listaId: string
}

export default function QuotationWorkspaceHeader({ listaId }: QuotationWorkspaceHeaderProps) {
  const router = useRouter()
  const [lista, setLista] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchListaData = async () => {
      try {
        const response = await fetch(`/api/lista-equipo/${listaId}`)
        if (response.ok) {
          const data = await response.json()
          setLista(data)
        }
      } catch (error) {
        console.error('Error fetching lista data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchListaData()
  }, [listaId])

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/logistica" className="hover:text-foreground transition-colors">
          Logística
        </Link>
        <span>/</span>
        <Link href="/logistica/listas" className="hover:text-foreground transition-colors">
          Listas
        </Link>
        <span>/</span>
        <Link
          href={`/logistica/listas/${listaId}`}
          className="hover:text-foreground transition-colors"
        >
          {lista?.codigo || 'Lista'}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Centro de Cotizaciones</span>
      </div>

      {/* Header Content */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Centro de Cotizaciones Unificado
              </h1>
              <p className="text-gray-600">
                Gestión completa de cotizaciones para{' '}
                <span className="font-medium">{lista?.codigo || 'la lista'}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lista && (
            <div className="text-right">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{lista.nombre}</span>
                <Badge variant="outline">{lista.estado}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {lista.items?.length || 0} ítems • Proyecto: {lista.proyecto?.codigo}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
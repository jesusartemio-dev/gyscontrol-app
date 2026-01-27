// ===================================================
// 📁 Archivo: src/app/logistica/listas/[id]/diagnostico/page.tsx
// 📌 Descripción: Página de diagnóstico para verificar funcionalidad de acciones
// 📌 Propósito: Identificar problemas en la selección de cotizaciones
// ✍️ Autor: Sistema de IA
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getLogisticaListaById } from '@/lib/services/logisticaLista'
import DiagnosticoAcciones from '@/components/logistica/DiagnosticoAcciones'
import type { ListaEquipo } from '@/types'

export default function DiagnosticoPage() {
  const { id } = useParams<{ id: string }>()
  const [lista, setLista] = useState<ListaEquipo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLista = async () => {
      try {
        const data = await getLogisticaListaById(id)
        if (data) {
          setLista(data)
        } else {
          toast.error('No se encontró la lista')
        }
      } catch (error) {
        console.error('Error al cargar lista:', error)
        toast.error('Error al cargar la lista')
      } finally {
        setLoading(false)
      }
    }

    fetchLista()
  }, [id])

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!lista) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No se pudo cargar la lista</p>
          <Link href={`/logistica/listas/${id}`}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a la lista
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      {/* 🔙 Navegación */}
      <div className="flex items-center gap-4">
        <Link href={`/logistica/listas/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Diagnóstico de Acciones</h1>
          <p className="text-muted-foreground">
            Lista: {lista.nombre} | Items: {lista.listaEquipoItem.length}
          </p>
        </div>
      </div>

      {/* 🔍 Diagnósticos por item */}
      <div className="space-y-6">
        {lista.listaEquipoItem.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay ítems en esta lista para diagnosticar</p>
          </div>
        ) : (
          lista.listaEquipoItem.map((item, index) => (
            <div key={item.id} className="space-y-2">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-lg">
                  Item #{index + 1}: {item.descripcion}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Código: {item.codigo} | Cantidad: {item.cantidad} {item.unidad}
                </p>
              </div>
              
              <DiagnosticoAcciones 
                itemId={item.id}
                cotizaciones={item.cotizaciones || []}
              />
            </div>
          ))
        )}
      </div>

      {/* 📊 Resumen general */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Resumen General:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-medium">Total Items:</p>
            <p className="text-2xl font-bold text-blue-600">{lista.listaEquipoItem.length}</p>
          </div>
          <div>
            <p className="font-medium">Items con Cotizaciones:</p>
            <p className="text-2xl font-bold text-green-600">
              {lista.listaEquipoItem.filter(item => item.cotizaciones && item.cotizaciones.length > 0).length}
            </p>
          </div>
          <div>
            <p className="font-medium">Items Seleccionados:</p>
            <p className="text-2xl font-bold text-purple-600">
              {lista.listaEquipoItem.filter(item => 
                item.cotizaciones &&
            item.cotizaciones.some(cot => cot.esSeleccionada)
              ).length}
            </p>
          </div>
          <div>
            <p className="font-medium">Items Pendientes:</p>
            <p className="text-2xl font-bold text-orange-600">
              {lista.listaEquipoItem.filter(item => 
                !item.cotizaciones ||
            item.cotizaciones.length === 0 ||
            !item.cotizaciones.some(cot => cot.esSeleccionada)
              ).length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
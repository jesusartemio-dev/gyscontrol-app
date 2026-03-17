// ===================================================
// 📁 Archivo: ListaEquipoItemListWithViews.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Componente integrador con múltiples vistas de lista de equipos
//
// 🎨 Mejoras UX/UI aplicadas:
// - Alternancia entre vista normal y compacta
// - Persistencia de preferencias de vista
// - Transiciones suaves entre vistas
// - Controles de vista intuitivos
// ===================================================

'use client'

import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Package } from 'lucide-react'
import { ListaEquipoItem } from '@/types'
import ListaEquipoItemList from './ListaEquipoItemList'

// 🎯 Types and interfaces
interface Props {
  listaId: string
  proyectoId: string
  listaEstado?: string
  items: ListaEquipoItem[]
  editable?: boolean
  onCreated?: () => void
  onItemUpdated?: (itemId: string) => Promise<void>
  onItemsUpdated?: () => Promise<void>
  onRefresh?: () => Promise<void>
  className?: string
}



export default function ListaEquipoItemListWithViews({
  listaId,
  proyectoId,
  listaEstado,
  items,
  editable = true,
  onCreated,
  onItemUpdated,
  onItemsUpdated,
  onRefresh,
  className = ''
}: Props) {



  return (
    <div className={`space-y-6 ${className}`}>


      {/* 📋 Content Area */}
      <ListaEquipoItemList
        listaId={listaId}
        proyectoId={proyectoId}
        listaEstado={listaEstado}
        items={items}
        editable={editable}
        onCreated={onCreated}
        onItemUpdated={onItemUpdated}
        onItemsUpdated={onItemsUpdated}
        onRefresh={onRefresh}
      />

      {/* 💡 Help section for new users */}
      {items.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-dashed border-2 border-gray-200">
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Lista de equipos vacía
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Esta lista no tiene equipos aún. Utiliza los botones de acción 
                en la lista principal para agregar equipos.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

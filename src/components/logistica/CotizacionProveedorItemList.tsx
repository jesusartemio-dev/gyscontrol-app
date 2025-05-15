// ===================================================
// 📁 Archivo: CotizacionProveedorItemList.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Lista de ítems cotizados por proveedor
//
// 🧠 Uso: Se muestra dentro de la vista de detalle de una cotización
//         para ver los precios y tiempos ofertados por ítem.
// ===================================================

'use client'

import type { CotizacionProveedor } from '@/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2 } from 'lucide-react'

interface Props {
  cotizacion: CotizacionProveedor
}

export default function CotizacionProveedorItemList({ cotizacion }: Props) {
  const items = cotizacion.items || []

  if (items.length === 0) {
    return <p className="text-gray-500 italic mt-4">Este proveedor no ha cotizado ítems aún.</p>
  }

  return (
    <div className="mt-4">
      <h3 className="text-md font-medium mb-2">📋 Ítems Cotizados ({items.length})</h3>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="text-center">Precio Unitario</TableHead>
            <TableHead className="text-center">Tiempo (días)</TableHead>
            <TableHead className="text-center">Elegido</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.listaItem?.codigo}</TableCell>
              <TableCell>{item.listaItem?.descripcion}</TableCell>
              <TableCell className="text-center">S/ {item.precioUnitario.toFixed(2)}</TableCell>
              <TableCell className="text-center">{item.tiempoEntrega} días</TableCell>
              <TableCell className="text-center">
                {item.seleccionado ? (
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle2 className="inline w-4 h-4 mr-1" />
                    Elegido
                  </Badge>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

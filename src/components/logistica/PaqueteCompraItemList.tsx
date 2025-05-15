// ===================================================
// 📁 Archivo: PaqueteCompraItemList.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Lista de ítems de compra dentro de un paquete.
// 🧠 Uso: Visualización detallada de cantidad, proveedor, precio y entrega.
// ===================================================

'use client'

import { PaqueteCompraItem } from '@/types'
import { format } from 'date-fns'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Props {
  items: PaqueteCompraItem[]
}

export default function PaqueteCompraItemList({ items }: Props) {
  return (
    <div className="overflow-x-auto border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Unidad</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Precio U.</TableHead>
            <TableHead>Costo Total</TableHead>
            <TableHead>Entrega</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.codigo}</TableCell>
              <TableCell>{item.descripcion}</TableCell>
              <TableCell>{item.unidad}</TableCell>
              <TableCell>{item.cantidad}</TableCell>
              <TableCell>{item.proveedor || '—'}</TableCell>
              <TableCell>
                {typeof item.precioUnitario === 'number' ? `S/ ${item.precioUnitario.toFixed(2)}` : '-'}
              </TableCell>
              <TableCell>
                {typeof item.costoTotal === 'number' ? `S/ ${item.costoTotal.toFixed(2)}` : '—'}
              </TableCell>
              <TableCell>
                {item.fechaEntrega ? format(new Date(item.fechaEntrega), 'dd/MM/yyyy') : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

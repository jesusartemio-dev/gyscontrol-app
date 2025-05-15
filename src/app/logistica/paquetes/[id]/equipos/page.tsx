// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: /app/logistica/paquetes/[id]/equipos/page.tsx
// 🔧 Descripción: Página para gestión de ítems de compra dentro de un paquete específico
//
// 🧠 Uso: Muestra los ítems de compra de un paquete (con proveedor, precio, entrega)
// ✍️ Autor: Asistente IA GYS
// ===================================================

import { getPaqueteCompraById } from '@/lib/services/paqueteCompra'
import PaqueteCompraItemList from '@/components/logistica/PaqueteCompraItemList'

interface Props {
  params: { id: string }
}

export default async function PaqueteCompraEquiposPage({ params }: Props) {
  const paquete = await getPaqueteCompraById(params.id)

  if (!paquete) return <div className="p-4 text-red-500">❌ No se encontró el paquete de compra.</div>

  return (
    <div className="space-y-6 p-4">
      <h1 className="text-2xl font-semibold">
        📦 {paquete.nombre}
      </h1>
      <p className="text-muted-foreground">{paquete.descripcion || 'Sin descripción'}</p>

      <PaqueteCompraItemList items={paquete.items} />
    </div>
  )
}

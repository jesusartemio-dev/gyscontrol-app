'use client'

// ===================================================
// 📁 Archivo: ModalDuplicadosServicios.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Modal de confirmación para sobrescritura de servicios duplicados.
// ===================================================

import { Button } from '@/components/ui/button'

interface Props {
  duplicados: { nombre: string }[]
  onConfirm: () => void
  onCancel: () => void
}

export default function ModalDuplicadosServicios({ duplicados, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-100/60 backdrop-blur-sm z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl space-y-4 max-w-md w-full">
        <h2 className="text-xl font-bold text-center">Servicios Duplicados Detectados</h2>

        <p className="text-sm text-gray-700 text-center">
          Se encontraron servicios que ya existen. ¿Deseas sobrescribirlos?
        </p>

        <ul className="text-center text-gray-800 max-h-48 overflow-y-auto mt-2">
          {duplicados.map((serv, idx) => (
            <li key={idx}>{serv.nombre}</li>
          ))}
        </ul>

        <div className="flex justify-center gap-4 mt-4">
          <Button onClick={onConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">
            Sobrescribir
          </Button>
          <Button variant="destructive" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ===================================================
// 📁 Fragmento para botones PRO de Exportar e Importar
// 🔧 Diseño estilizado y mejorado para Catálogo de Servicios
// ===================================================

import { Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BotonesImportExport({ onExportar, onImportar }: { onExportar: () => void; onImportar: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="flex gap-4 bg-gray-50 p-3 rounded-lg shadow-sm border w-fit">
      {/* Botón Exportar Excel */}
      <Button
        variant="outline"
        onClick={onExportar}
        className="flex items-center gap-2 text-green-700 border-green-500 hover:bg-green-100"
      >
        <Download size={20} />
        Exportar Excel
      </Button>

      {/* Botón Importar Excel */}
      <label className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-500 rounded px-4 py-2 cursor-pointer hover:bg-blue-100">
        <Upload size={20} />
        Importar Excel
        <input type="file" accept=".xlsx" onChange={onImportar} className="hidden" />
      </label>
    </div>
  )
}

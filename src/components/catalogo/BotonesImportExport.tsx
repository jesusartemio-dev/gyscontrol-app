// ===================================================
// 📁 Fragmento para botones PRO de Exportar e Importar
// 🔧 Diseño estilizado y mejorado para Catálogo de Servicios
// ===================================================

import { Download, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  onExportar: () => void
  onImportar: (e: React.ChangeEvent<HTMLInputElement>) => void
  importando?: boolean
  exportLabel?: string
  importLabel?: string
  acceptedFileTypes?: string
}

export function BotonesImportExport({ 
  onExportar, 
  onImportar, 
  importando = false,
  exportLabel = "Exportar Excel",
  importLabel = "Importar Excel",
  acceptedFileTypes = ".xlsx"
}: Props) {
  return (
    <div className="flex gap-4 bg-gray-50 p-3 rounded-lg shadow-sm border w-fit">
      {/* Botón Exportar Excel */}
      <Button
        variant="outline"
        onClick={onExportar}
        className="flex items-center gap-2 text-green-700 border-green-500 hover:bg-green-100"
      >
        <Download size={20} />
        {exportLabel}
      </Button>

      {/* Botón Importar Excel */}
      <label className={`flex items-center gap-2 border rounded px-4 py-2 transition-colors ${
        importando 
          ? 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed' 
          : 'bg-blue-50 text-blue-700 border-blue-500 cursor-pointer hover:bg-blue-100'
      }`}>
        {importando ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Upload size={20} />
        )}
        {importando ? 'Importando...' : importLabel}
        <input 
          type="file" 
          accept={acceptedFileTypes} 
          onChange={onImportar} 
          className="hidden" 
          disabled={importando}
        />
      </label>
    </div>
  )
}

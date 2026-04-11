import { Download, Upload, Loader2, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'

interface Props {
  onExportar?: () => void
  onImportar?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDescargarPlantilla?: () => void
  importando?: boolean
  exportLabel?: string
  importLabel?: string
  acceptedFileTypes?: string
}

export function BotonesImportExport({
  onExportar,
  onImportar,
  onDescargarPlantilla,
  importando = false,
  exportLabel = "Exportar Excel",
  importLabel = "Importar Excel",
  acceptedFileTypes = ".xlsx"
}: Props) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        {onDescargarPlantilla && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onDescargarPlantilla}
                className="h-8 w-8 p-0 text-purple-700 border-purple-300 hover:bg-purple-50"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Descargar plantilla</TooltipContent>
          </Tooltip>
        )}
        {onExportar && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onExportar}
                className="h-8 w-8 p-0 text-green-700 border-green-400 hover:bg-green-50"
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{exportLabel}</TooltipContent>
          </Tooltip>
        )}
        {onImportar && (
          <Tooltip>
            <TooltipTrigger asChild>
              <label className={`inline-flex items-center justify-center h-8 w-8 rounded-md border text-sm transition-colors ${
                importando
                  ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                  : 'text-blue-700 border-blue-400 bg-background hover:bg-blue-50 cursor-pointer'
              }`}>
                {importando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <input
                  type="file"
                  accept={acceptedFileTypes}
                  onChange={onImportar}
                  className="hidden"
                  disabled={importando}
                />
              </label>
            </TooltipTrigger>
            <TooltipContent>{importando ? 'Importando...' : importLabel}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

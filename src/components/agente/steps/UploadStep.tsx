'use client'

import { useRef } from 'react'
import { Upload, FileSpreadsheet, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  excelFile: File | null
  pdfFiles: File[]
  onExcelChange: (file: File | null) => void
  onPdfFilesChange: (files: File[]) => void
}

export function UploadStep({ excelFile, pdfFiles, onExcelChange, onPdfFilesChange }: Props) {
  const excelInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const agregarPdfs = (nuevos: FileList | null) => {
    if (!nuevos) return
    const existentes = new Set(pdfFiles.map((f) => `${f.name}-${f.size}`))
    const agregados = Array.from(nuevos).filter(
      (f) => !existentes.has(`${f.name}-${f.size}`)
    )
    onPdfFilesChange([...pdfFiles, ...agregados])
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
        Sube al menos uno de los dos. Con el Excel interno se importa el detalle completo
        de equipos, servicios y costos. Solo con el PDF se importa el cuadro económico como
        suma alzada, sin costo interno — pensado para cotizaciones antiguas de las que ya no
        se conserva la hoja de costeo.
      </p>

      {/* Excel upload */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Excel de cotización interna{' '}
          <span className="text-xs text-gray-400">(recomendado)</span>
        </label>
        <input
          ref={excelInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => onExcelChange(e.target.files?.[0] || null)}
        />
        {excelFile ? (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">{excelFile.name}</p>
                <p className="text-xs text-green-600">
                  {(excelFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onExcelChange(null)
                if (excelInputRef.current) excelInputRef.current.value = ''
              }}
              className="rounded p-1 text-green-600 hover:bg-green-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => excelInputRef.current?.click()}
            className={cn(
              'flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed',
              'border-gray-300 bg-gray-50 px-6 py-8 transition-colors',
              'hover:border-blue-400 hover:bg-blue-50'
            )}
          >
            <Upload className="h-6 w-6 text-gray-400" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600">
                Arrastra o haz clic para subir
              </p>
              <p className="text-xs text-gray-400">Excel (.xlsx, .xls)</p>
            </div>
          </button>
        )}
      </div>

      {/* PDFs de propuesta */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          PDFs de propuesta comercial{' '}
          <span className="text-xs text-gray-400">(opcional si subes el Excel)</span>
        </label>
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={(e) => agregarPdfs(e.target.files)}
        />

        {pdfFiles.length > 0 && (
          <div className="mb-2 space-y-1.5">
            {pdfFiles.map((f, i) => (
              <div
                key={`${f.name}-${i}`}
                className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-blue-800">{f.name}</p>
                    <p className="text-xs text-blue-600">{(f.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button
                  onClick={() => onPdfFilesChange(pdfFiles.filter((_, j) => j !== i))}
                  className="shrink-0 rounded p-1 text-blue-600 hover:bg-blue-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => pdfInputRef.current?.click()}
          className={cn(
            'flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed',
            'border-gray-200 bg-gray-50/50 px-6 transition-colors',
            'hover:border-blue-300 hover:bg-blue-50/50',
            pdfFiles.length > 0 ? 'py-3' : 'py-6'
          )}
        >
          <FileText className="h-5 w-5 text-gray-300" />
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {pdfFiles.length > 0
                ? 'Agregar otra propuesta'
                : 'Subir PDF para extraer código, fecha, condiciones y exclusiones'}
            </p>
            <p className="text-xs text-gray-400">
              Puedes subir varias (POS10, POS20…) y se unen en una sola cotización
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}

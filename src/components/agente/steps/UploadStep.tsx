'use client'

import { useRef } from 'react'
import { Upload, FileSpreadsheet, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  excelFile: File | null
  pdfFile: File | null
  onExcelChange: (file: File | null) => void
  onPdfChange: (file: File | null) => void
}

export function UploadStep({ excelFile, pdfFile, onExcelChange, onPdfChange }: Props) {
  const excelInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-4">
      {/* Excel upload */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Excel de cotización interna <span className="text-red-500">*</span>
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

      {/* PDF upload (opcional) */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          PDF de propuesta comercial{' '}
          <span className="text-xs text-gray-400">(opcional)</span>
        </label>
        <input
          ref={pdfInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => onPdfChange(e.target.files?.[0] || null)}
        />
        {pdfFile ? (
          <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">{pdfFile.name}</p>
                <p className="text-xs text-blue-600">
                  {(pdfFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onPdfChange(null)
                if (pdfInputRef.current) pdfInputRef.current.value = ''
              }}
              className="rounded p-1 text-blue-600 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => pdfInputRef.current?.click()}
            className={cn(
              'flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed',
              'border-gray-200 bg-gray-50/50 px-6 py-6 transition-colors',
              'hover:border-blue-300 hover:bg-blue-50/50'
            )}
          >
            <FileText className="h-5 w-5 text-gray-300" />
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Subir PDF para extraer condiciones y exclusiones
              </p>
              <p className="text-xs text-gray-400">PDF (.pdf)</p>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

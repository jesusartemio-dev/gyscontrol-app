'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Download, FileText, Settings } from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface GanttPDFExportProps {
  proyectoId: string
  proyectoNombre: string
  cronogramaId?: string
  fases: any[]
  edts: any[]
  tareas: any[]
  subtareas: any[]
  dependencies: any[]
  timelineStart: Date
  timelineEnd: Date
}

export function GanttPDFExport({
  proyectoId,
  proyectoNombre,
  cronogramaId,
  fases,
  edts,
  tareas,
  subtareas,
  dependencies,
  timelineStart,
  timelineEnd
}: GanttPDFExportProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [format, setFormat] = useState<'a4' | 'a3' | 'letter'>('a4')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')
  const [includeDependencies, setIncludeDependencies] = useState(true)
  const [includeDetails, setIncludeDetails] = useState(true)

  const handleExport = async () => {
    setExporting(true)

    try {
      // Crear contenedor temporal para renderizar
      const container = document.createElement('div')
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '-9999px'
      container.style.width = orientation === 'landscape' ? '1200px' : '800px'
      container.style.background = 'white'
      container.style.padding = '20px'
      document.body.appendChild(container)

      // Renderizar contenido del PDF
      container.innerHTML = generatePDFContent()

      // Convertir a canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      })

      // Crear PDF
      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format
      })

      const imgData = canvas.toDataURL('image/png')
      const imgWidth = pdf.internal.pageSize.getWidth()
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Si la imagen es más alta que una página, dividir en múltiples páginas
      const pageHeight = pdf.internal.pageSize.getHeight()
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Descargar PDF
      const fileName = `Cronograma_${proyectoNombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      pdf.save(fileName)

      toast.success('PDF exportado exitosamente')
      setOpen(false)

      // Limpiar
      document.body.removeChild(container)

    } catch (error) {
      console.error('Error exporting PDF:', error)
      toast.error('Error al exportar PDF')
    } finally {
      setExporting(false)
    }
  }

  const generatePDFContent = () => {
    const allTasks = [...fases, ...edts, ...tareas, ...subtareas]

    return `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1 style="color: #2563eb; margin-bottom: 10px;">Cronograma de Proyecto</h1>
        <h2 style="color: #374151; margin-bottom: 20px;">${proyectoNombre}</h2>

        <div style="margin-bottom: 20px;">
          <p><strong>Período:</strong> ${timelineStart.toLocaleDateString('es-ES')} - ${timelineEnd.toLocaleDateString('es-ES')}</p>
          <p><strong>Fases:</strong> ${fases.length} | <strong>EDTs:</strong> ${edts.length} | <strong>Tareas:</strong> ${tareas.length}</p>
          <p><strong>Dependencias:</strong> ${dependencies.length}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Tipo</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Nombre</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Inicio</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Fin</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Progreso</th>
              <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Responsable</th>
            </tr>
          </thead>
          <tbody>
            ${allTasks.map(task => {
              const useRealDates = task.fechaInicioReal && task.fechaFinReal
              const startDateRaw = useRealDates ? task.fechaInicioReal : (task.fechaInicio || task.fechaInicioPlan)
              const endDateRaw = useRealDates ? task.fechaFinReal : (task.fechaFin || task.fechaFinPlan)
              const startDate = startDateRaw ? new Date(startDateRaw) : null
              const endDate = endDateRaw ? new Date(endDateRaw) : null
              const progreso = task.porcentajeAvance || task.porcentajeCompletado || 0

              const getTaskType = () => {
                if (fases.includes(task)) return '📁 Fase'
                if (edts.includes(task)) return '🔧 EDT'
                if (tareas.includes(task)) return '✅ Tarea'
                if (subtareas.includes(task)) return '📝 Subtarea'
                return 'Tarea'
              }

              return `
                <tr>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${getTaskType()}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${task.nombre}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${startDate && !isNaN(startDate.getTime()) ? startDate.toLocaleDateString('es-ES') : 'N/A'}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${endDate && !isNaN(endDate.getTime()) ? endDate.toLocaleDateString('es-ES') : 'N/A'}</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">${progreso}%</td>
                  <td style="border: 1px solid #d1d5db; padding: 8px;">${task.responsable?.name || 'Sin asignar'}</td>
                </tr>
              `
            }).join('')}
          </tbody>
        </table>

        ${includeDetails ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #374151; margin-bottom: 10px;">Resumen Ejecutivo</h3>
            <ul style="line-height: 1.6;">
              <li><strong>Total de elementos:</strong> ${allTasks.length}</li>
              <li><strong>Elementos completados:</strong> ${allTasks.filter(t => (t.porcentajeAvance || t.porcentajeCompletado || 0) >= 100).length}</li>
              <li><strong>Elementos en progreso:</strong> ${allTasks.filter(t => {
                const progreso = t.porcentajeAvance || t.porcentajeCompletado || 0
                return progreso > 0 && progreso < 100
              }).length}</li>
              <li><strong>Elementos pendientes:</strong> ${allTasks.filter(t => (t.porcentajeAvance || t.porcentajeCompletado || 0) === 0).length}</li>
            </ul>
          </div>
        ` : ''}

        ${includeDependencies && dependencies.length > 0 ? `
          <div style="margin-top: 20px;">
            <h3 style="color: #374151; margin-bottom: 10px;">Dependencias</h3>
            <ul style="line-height: 1.6;">
              ${dependencies.map(dep => `
                <li>${dep.fromTaskName} → ${dep.toTaskName} (${dep.type.replace('_', ' ').toUpperCase()})</li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #d1d5db; font-size: 12px; color: #6b7280;">
          <p>Reporte generado el ${new Date().toLocaleString('es-ES')}</p>
          <p>Sistema GYS - Gestión de Proyectos</p>
        </div>
      </div>
    `
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Exportar Cronograma a PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Formato de página</label>
            <Select value={format} onValueChange={(value: any) => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="a3">A3</SelectItem>
                <SelectItem value="letter">Carta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Orientación</label>
            <Select value={orientation} onValueChange={(value: any) => setOrientation(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Vertical</SelectItem>
                <SelectItem value="landscape">Horizontal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Opciones de contenido</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeDependencies}
                  onChange={(e) => setIncludeDependencies(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Incluir dependencias</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={includeDetails}
                  onChange={(e) => setIncludeDetails(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Incluir resumen ejecutivo</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
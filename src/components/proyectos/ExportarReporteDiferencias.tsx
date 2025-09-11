'use client'

/**
 * ✅ ExportarReporteDiferencias Component
 * 
 * Componente para exportar reportes de diferencias de equipos en formato PDF
 * Incluye resumen ejecutivo, detalles de cambios y análisis financiero
 * 
 * @author TRAE AI
 * @version 1.0.0
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileDown, 
  Loader2, 
  CheckCircle, 
  ArrowLeftRight, 
  Plus, 
  X,
  Calculator,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

// 📡 Types
interface ComparisonItem {
  pei: any
  lei: any
  type: 'mantenido' | 'reemplazado' | 'agregado' | 'descartado' | 'no_incluido'
  estado: string
  diferencia: number
  costoPEI: number
  costoLEI: number
  grupo: { nombre: string }
  trazabilidad?: {
    motivo: string
    original: any
    reemplazo: any
  }
}

interface Summary {
  mantenidos: number
  reemplazados: number
  agregados: number
  descartados: number
  totalItems: number
  impactoFinanciero: number
  porcentajeCambio: number
}

interface ExportarReporteDiferenciasProps {
  comparisons: ComparisonItem[]
  summary: Summary
  proyectoNombre: string
  fechaComparacion: Date
  className?: string
}

// 🎨 Component
export default function ExportarReporteDiferencias({
  comparisons,
  summary,
  proyectoNombre,
  fechaComparacion,
  className = ''
}: ExportarReporteDiferenciasProps) {
  const [isExporting, setIsExporting] = useState(false)

  // ✅ Generate PDF content
  const generatePDFContent = () => {
    const fecha = fechaComparacion.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Reporte de Diferencias - ${proyectoNombre}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { font-size: 16px; opacity: 0.9; }
        .container { padding: 30px; max-width: 1200px; margin: 0 auto; }
        .section { margin-bottom: 40px; }
        .section-title {
            font-size: 20px;
            color: #1e40af;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .summary-card h3 {
            font-size: 24px;
            margin-bottom: 5px;
            color: #1e40af;
        }
        .summary-card p { color: #64748b; font-size: 14px; }
        .comparison-item {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .item-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .item-type {
            display: inline-flex;
            align-items: center;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .type-mantenido { background: #dcfce7; color: #166534; }
        .type-reemplazado { background: #dbeafe; color: #1d4ed8; }
        .type-agregado { background: #f3e8ff; color: #7c3aed; }
        .type-descartado { background: #fee2e2; color: #dc2626; }
        .financial-impact {
            font-weight: bold;
            font-size: 16px;
        }
        .positive { color: #dc2626; }
        .negative { color: #16a34a; }
        .neutral { color: #64748b; }
        .equipment-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
        }
        .equipment-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 15px;
        }
        .equipment-card h4 {
            font-size: 14px;
            margin-bottom: 10px;
            color: #374151;
        }
        .equipment-details {
            font-size: 12px;
            color: #6b7280;
            line-height: 1.4;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
        @media print {
            .header { break-inside: avoid; }
            .comparison-item { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Reporte de Diferencias de Equipos</h1>
        <p>${proyectoNombre}</p>
        <p>Generado el ${fecha}</p>
    </div>
    
    <div class="container">
        <!-- Resumen Ejecutivo -->
        <div class="section">
            <h2 class="section-title">📊 Resumen Ejecutivo</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>${summary.mantenidos}</h3>
                    <p>Equipos Mantenidos</p>
                </div>
                <div class="summary-card">
                    <h3>${summary.reemplazados}</h3>
                    <p>Equipos Reemplazados</p>
                </div>
                <div class="summary-card">
                    <h3>${summary.agregados}</h3>
                    <p>Equipos Agregados</p>
                </div>
                <div class="summary-card">
                    <h3>${summary.descartados}</h3>
                    <p>Equipos Descartados</p>
                </div>
                <div class="summary-card">
                    <h3 class="${summary.impactoFinanciero >= 0 ? 'positive' : 'negative'}">
                        ${formatCurrency(summary.impactoFinanciero)}
                    </h3>
                    <p>Impacto Financiero</p>
                </div>
                <div class="summary-card">
                    <h3>${summary.porcentajeCambio.toFixed(1)}%</h3>
                    <p>Porcentaje de Cambio</p>
                </div>
            </div>
        </div>
        
        <!-- Análisis Financiero -->
        <div class="section">
            <h2 class="section-title">💰 Análisis Financiero</h2>
            <div class="summary-grid">
                <div class="summary-card">
                    <h3>${formatCurrency(comparisons.reduce((sum, item) => sum + item.costoPEI, 0))}</h3>
                    <p>Costo Total Comercial</p>
                </div>
                <div class="summary-card">
                    <h3>${formatCurrency(comparisons.reduce((sum, item) => sum + item.costoLEI, 0))}</h3>
                    <p>Costo Total Proyectos</p>
                </div>
                <div class="summary-card">
                    <h3 class="${summary.impactoFinanciero >= 0 ? 'positive' : 'negative'}">
                        ${summary.impactoFinanciero >= 0 ? '+' : ''}${formatCurrency(summary.impactoFinanciero)}
                    </h3>
                    <p>Diferencia Total</p>
                </div>
            </div>
        </div>
        
        <!-- Detalle de Cambios -->
        <div class="section">
            <h2 class="section-title">📋 Detalle de Cambios</h2>
            ${comparisons.filter(item => item.type !== 'mantenido').map(item => `
                <div class="comparison-item">
                    <div class="item-header">
                        <span class="item-type type-${item.type}">
                            ${getTypeLabel(item.type)}
                        </span>
                        <span class="financial-impact ${item.diferencia > 0 ? 'positive' : item.diferencia < 0 ? 'negative' : 'neutral'}">
                            ${item.diferencia > 0 ? '+' : ''}${formatCurrency(item.diferencia)}
                        </span>
                    </div>
                    
                    ${item.type === 'reemplazado' && item.trazabilidad ? `
                        <div class="equipment-grid">
                            <div class="equipment-card">
                                <h4>🔴 Equipo Original (Reemplazado)</h4>
                                <div class="equipment-details">
                                    <strong>${item.pei?.descripcion || 'N/A'}</strong><br>
                                    Código: ${item.pei?.codigo || 'N/A'}<br>
                                    Cantidad: ${item.pei?.cantidad || 0}<br>
                                    Precio: ${formatCurrency(item.pei?.precioInterno || 0)}<br>
                                    <strong>Total: ${formatCurrency(item.costoPEI)}</strong>
                                </div>
                            </div>
                            <div class="equipment-card">
                                <h4>🔵 Nuevo Equipo (Reemplazo)</h4>
                                <div class="equipment-details">
                                    <strong>${item.lei?.descripcion || 'N/A'}</strong><br>
                                    Código: ${item.lei?.codigo || 'N/A'}<br>
                                    Cantidad: ${item.lei?.cantidad || 0}<br>
                                    Precio: ${formatCurrency(item.lei?.precioElegido || 0)}<br>
                                    <strong>Total: ${formatCurrency(item.costoLEI)}</strong>
                                </div>
                            </div>
                        </div>
                        <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">
                            <strong>Motivo del reemplazo:</strong> ${item.trazabilidad.motivo}
                        </p>
                    ` : `
                        <div class="equipment-details">
                            <strong>${(item.pei?.descripcion || item.lei?.descripcion) || 'N/A'}</strong><br>
                            Código: ${(item.pei?.codigo || item.lei?.codigo) || 'N/A'}<br>
                            Grupo: ${item.grupo.nombre}<br>
                            Cantidad: ${(item.pei?.cantidad || item.lei?.cantidad) || 0}<br>
                            Precio: ${formatCurrency((item.pei?.precioInterno || item.lei?.precioElegido) || 0)}<br>
                            <strong>Total: ${formatCurrency(item.costoPEI + item.costoLEI)}</strong>
                        </div>
                    `}
                </div>
            `).join('')}
        </div>
    </div>
    
    <div class="footer">
        <p>Reporte generado automáticamente por Sistema GYS | ${new Date().toLocaleString('es-PE')}</p>
        <p>Este documento es confidencial y de uso interno exclusivo</p>
    </div>
</body>
</html>
    `
  }

  // ✅ Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mantenido': return 'Mantenido'
      case 'reemplazado': return 'Reemplazado'
      case 'agregado': return 'Agregado'
      case 'descartado': return 'Descartado'
      default: return 'Comparación'
    }
  }

  // ✅ Export to PDF
  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      const htmlContent = generatePDFContent()
      
      // 📡 Create blob and download
      const blob = new Blob([htmlContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte-diferencias-${proyectoNombre.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
      
      // 🔁 Show success message (you can add toast here)
      console.log('✅ Reporte exportado exitosamente')
      
    } catch (error) {
      console.error('❌ Error al exportar reporte:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5 text-blue-600" />
          Exportar Reporte de Diferencias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 📊 Preview Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="text-lg font-bold text-green-700">{summary.mantenidos}</div>
            <div className="text-xs text-green-600">Mantenidos</div>
          </div>
          
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <ArrowLeftRight className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-lg font-bold text-blue-700">{summary.reemplazados}</div>
            <div className="text-xs text-blue-600">Reemplazados</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Plus className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-purple-700">{summary.agregados}</div>
            <div className="text-xs text-purple-600">Agregados</div>
          </div>
          
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <X className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-lg font-bold text-red-700">{summary.descartados}</div>
            <div className="text-xs text-red-600">Descartados</div>
          </div>
        </div>
        
        <Separator />
        
        {/* 💰 Financial Impact */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-slate-600" />
            <span className="font-medium">Impacto Financiero Total:</span>
          </div>
          <div className="flex items-center gap-2">
            {summary.impactoFinanciero >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
            <span className={`font-bold text-lg ${
              summary.impactoFinanciero >= 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {summary.impactoFinanciero >= 0 ? '+' : ''}{formatCurrency(summary.impactoFinanciero)}
            </span>
          </div>
        </div>
        
        {/* 🔽 Export Button */}
        <Button 
          onClick={handleExport}
          disabled={isExporting}
          className="w-full"
          size="lg"
        >
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando reporte...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar Reporte HTML
            </>
          )}
        </Button>
        
        <p className="text-xs text-slate-500 text-center">
          El reporte incluye resumen ejecutivo, análisis financiero y detalle completo de cambios
        </p>
      </CardContent>
    </Card>
  )
}

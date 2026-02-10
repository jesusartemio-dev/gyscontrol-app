import * as XLSX from 'xlsx'

interface PlantillaExportData {
  id: string
  nombre: string
  tipo?: string
  estado?: string
  descuento?: number
  totalEquiposInterno?: number
  totalEquiposCliente?: number
  totalServiciosInterno?: number
  totalServiciosCliente?: number
  totalGastosInterno?: number
  totalGastosCliente?: number
  totalInterno?: number
  totalCliente?: number
  grandTotal?: number
  equipos: {
    nombre: string
    items: {
      codigo?: string
      descripcion?: string
      marca?: string
      categoria?: string
      unidad?: string
      cantidad?: number
      precioLista?: number
      precioInterno?: number
      margen?: number
      precioCliente?: number
      costoInterno?: number
      costoCliente?: number
    }[]
  }[]
  servicios: {
    nombre: string
    items: {
      codigo?: string
      descripcion?: string
      cantidad?: number
      precioInterno?: number
      margen?: number
      precioCliente?: number
      costoInterno?: number
      costoCliente?: number
    }[]
  }[]
  gastos: {
    nombre: string
    items: {
      descripcion?: string
      cantidad?: number
      precioUnitario?: number
      costoInterno?: number
      costoCliente?: number
    }[]
  }[]
  condiciones?: { descripcion: string; tipo?: string | null }[]
  exclusiones?: { descripcion: string }[]
}

export function exportarPlantillaAExcel(plantilla: PlantillaExportData) {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Resumen
  const resumenData = [
    { Campo: 'Nombre', Valor: plantilla.nombre },
    { Campo: 'Tipo', Valor: plantilla.tipo || 'completa' },
    { Campo: 'Estado', Valor: plantilla.estado || 'borrador' },
    { Campo: '', Valor: '' },
    { Campo: 'Total Equipos (Interno)', Valor: plantilla.totalEquiposInterno || 0 },
    { Campo: 'Total Equipos (Cliente)', Valor: plantilla.totalEquiposCliente || 0 },
    { Campo: 'Total Servicios (Interno)', Valor: plantilla.totalServiciosInterno || 0 },
    { Campo: 'Total Servicios (Cliente)', Valor: plantilla.totalServiciosCliente || 0 },
    { Campo: 'Total Gastos (Interno)', Valor: plantilla.totalGastosInterno || 0 },
    { Campo: 'Total Gastos (Cliente)', Valor: plantilla.totalGastosCliente || 0 },
    { Campo: '', Valor: '' },
    { Campo: 'Total Interno', Valor: plantilla.totalInterno || 0 },
    { Campo: 'Total Cliente', Valor: plantilla.totalCliente || 0 },
    { Campo: 'Descuento', Valor: plantilla.descuento || 0 },
    { Campo: 'Grand Total', Valor: plantilla.grandTotal || 0 },
  ]
  const wsResumen = XLSX.utils.json_to_sheet(resumenData)
  wsResumen['!cols'] = [{ wch: 25 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  // Sheet 2: Equipos
  const equiposRows: any[] = []
  for (const grupo of (plantilla.equipos || [])) {
    for (const item of (grupo.items || [])) {
      equiposRows.push({
        'Sección': grupo.nombre,
        'Código': item.codigo || '',
        'Descripción': item.descripcion || '',
        'Marca': item.marca || '',
        'Categoría': item.categoria || '',
        'Unidad': item.unidad || '',
        'Cantidad': item.cantidad || 1,
        'P.Lista': item.precioLista || '',
        'P.Interno': item.precioInterno || 0,
        'Margen': item.margen != null ? +((1 + item.margen).toFixed(2)) : '',
        'P.Cliente': item.precioCliente || 0,
        'Total Interno': item.costoInterno || 0,
        'Total Cliente': item.costoCliente || 0,
      })
    }
  }
  if (equiposRows.length > 0) {
    const wsEquipos = XLSX.utils.json_to_sheet(equiposRows)
    wsEquipos['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 14 }, { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, wsEquipos, 'Equipos')
  }

  // Sheet 3: Servicios
  const serviciosRows: any[] = []
  for (const grupo of (plantilla.servicios || [])) {
    for (const item of (grupo.items || [])) {
      serviciosRows.push({
        'Sección': grupo.nombre,
        'Código': item.codigo || '',
        'Descripción': item.descripcion || '',
        'Cantidad': item.cantidad || 1,
        'P.Interno': item.precioInterno || 0,
        'Margen': item.margen != null ? +((1 + item.margen).toFixed(2)) : '',
        'P.Cliente': item.precioCliente || 0,
        'Total Interno': item.costoInterno || 0,
        'Total Cliente': item.costoCliente || 0,
      })
    }
  }
  if (serviciosRows.length > 0) {
    const wsServicios = XLSX.utils.json_to_sheet(serviciosRows)
    wsServicios['!cols'] = [
      { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 10 },
      { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, wsServicios, 'Servicios')
  }

  // Sheet 4: Gastos
  const gastosRows: any[] = []
  for (const grupo of (plantilla.gastos || [])) {
    for (const item of (grupo.items || [])) {
      gastosRows.push({
        'Sección': grupo.nombre,
        'Descripción': item.descripcion || '',
        'Cantidad': item.cantidad || 1,
        'P.Unitario': item.precioUnitario || 0,
        'Total Interno': item.costoInterno || 0,
        'Total Cliente': item.costoCliente || 0,
      })
    }
  }
  if (gastosRows.length > 0) {
    const wsGastos = XLSX.utils.json_to_sheet(gastosRows)
    wsGastos['!cols'] = [
      { wch: 20 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos')
  }

  // Sheet 5: Condiciones
  const condiciones = plantilla.condiciones || []
  if (condiciones.length > 0) {
    const condData = condiciones.map((c, i) => ({
      '#': i + 1,
      'Descripción': c.descripcion,
      'Tipo': c.tipo || '',
    }))
    const wsCond = XLSX.utils.json_to_sheet(condData)
    wsCond['!cols'] = [{ wch: 5 }, { wch: 60 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, wsCond, 'Condiciones')
  }

  // Sheet 6: Exclusiones
  const exclusiones = plantilla.exclusiones || []
  if (exclusiones.length > 0) {
    const exclData = exclusiones.map((e, i) => ({
      '#': i + 1,
      'Descripción': e.descripcion,
    }))
    const wsExcl = XLSX.utils.json_to_sheet(exclData)
    wsExcl['!cols'] = [{ wch: 5 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, wsExcl, 'Exclusiones')
  }

  // Download
  const nombreArchivo = `Plantilla_${plantilla.nombre.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, '').trim()}_${new Date().toISOString().split('T')[0]}.xlsx`
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ===================================================
// 📁 Archivo: serviciosExcel.ts
// 🔹 Ubicación: src/lib/utils/
// 🔧 Descripción: Exportación de servicios del catálogo a Excel (.xlsx)
// 🧐 Uso: Usado en la página de Catálogo de Servicios para exportación.
// 👩‍💻 Autor: Jesús Artemio
// 🗓️ Última actualización: 2025-04-26
// ===================================================

import * as XLSX from 'xlsx'
import { CatalogoServicio } from '@/types'

export async function exportarServiciosAExcel(servicios: CatalogoServicio[]) {
  // Ordenar por EDT y luego por orden
  const serviciosOrdenados = servicios.sort((a, b) => {
    const edtA = a.edt?.nombre || ''
    const edtB = b.edt?.nombre || ''

    // Primero ordenar por EDT
    if (edtA !== edtB) {
      return edtA.localeCompare(edtB)
    }

    // Luego ordenar por orden dentro del EDT
    return (a.orden || 0) - (b.orden || 0)
  })

  // Función auxiliar para calcular horas totales (solo escalonada)
  const calcularHoras = (servicio: CatalogoServicio) => {
    const cantidad = servicio.cantidad || 1;
    const factorDificultad = servicio.nivelDificultad || 1;

    // Solo fórmula escalonada: HH = HH_base + (cantidad - 1) × HH_repetido
    const horasBase = (servicio.horaBase || 0) + Math.max(0, cantidad - 1) * (servicio.horaRepetido || 0);

    return horasBase * factorDificultad;
  };

  const data = serviciosOrdenados.map(servicio => {
    const horasTotales = calcularHoras(servicio);
    const costoHora = servicio.recurso?.costoHora || 0;
    const costoTotal = horasTotales * costoHora;

    return {
      Servicio: servicio.nombre,
      Descripción: servicio.descripcion || '',
      EDT: servicio.edt?.nombre || '',
      Orden: servicio.orden || 0,
      Recurso: servicio.recurso?.nombre || '',
      Unidad: servicio.unidadServicio?.nombre || '',
      Cantidad: servicio.cantidad || 1,
      Dificultad: servicio.nivelDificultad || 1,
      'HH Base': servicio.horaBase || 0,
      'HH Repetido': servicio.horaRepetido || 0,
      'HH Total': horasTotales,
      'Costo/Hora': costoHora,
      'Costo Total': costoTotal
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Servicios')

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'CatalogoServicios.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

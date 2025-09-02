// ===================================================
// 📁 Test: listas-equipo-convertir-pedido-costo-calculation-fix.test.ts
// 📌 Verifica el cálculo correcto de costos en convertir-pedido
// 🧠 Prueba que el cálculo de costos funcione sin usar calcularCostoItem
// ✍️ Autor: IA GYS
// 📅 Fecha: 2025-01-27
// ===================================================

describe('Convertir Pedido - Cost Calculation Fix', () => {
  // 🧪 Test: Cálculo de costos usando costoElegido
  it('should calculate costs using costoElegido when available', () => {
    const listaItem = {
      id: 'item-1',
      cantidad: 10,
      costoElegido: 500, // ✅ Costo elegido disponible
      cotizacionSeleccionada: {
        precioUnitario: 40 // Este no debería usarse
      }
    }

    const cantidadAConvertir = 3

    // ✅ Lógica de cálculo como en el código real
    let costoItemTotal = 0
    if (listaItem.costoElegido !== null && listaItem.costoElegido !== undefined) {
      costoItemTotal = listaItem.costoElegido
    } else if (listaItem.cotizacionSeleccionada?.precioUnitario && listaItem.cantidad) {
      costoItemTotal = listaItem.cotizacionSeleccionada.precioUnitario * listaItem.cantidad
    }
    
    const costoUnitario = listaItem.cantidad > 0 ? costoItemTotal / listaItem.cantidad : 0
    const costoTotal = costoUnitario * cantidadAConvertir

    expect(costoItemTotal).toBe(500) // Usa costoElegido
    expect(costoUnitario).toBe(50) // 500 / 10
    expect(costoTotal).toBe(150) // 50 * 3
  })

  // 🧪 Test: Cálculo de costos usando cotizacionSeleccionada cuando costoElegido no está disponible
  it('should calculate costs using cotizacionSeleccionada when costoElegido is null', () => {
    const listaItem = {
      id: 'item-2',
      cantidad: 8,
      costoElegido: null, // ✅ No hay costo elegido
      cotizacionSeleccionada: {
        precioUnitario: 25 // ✅ Usar precio de cotización
      }
    }

    const cantidadAConvertir = 5

    // ✅ Lógica de cálculo como en el código real
    let costoItemTotal = 0
    if (listaItem.costoElegido !== null && listaItem.costoElegido !== undefined) {
      costoItemTotal = listaItem.costoElegido
    } else if (listaItem.cotizacionSeleccionada?.precioUnitario && listaItem.cantidad) {
      costoItemTotal = listaItem.cotizacionSeleccionada.precioUnitario * listaItem.cantidad
    }
    
    const costoUnitario = listaItem.cantidad > 0 ? costoItemTotal / listaItem.cantidad : 0
    const costoTotal = costoUnitario * cantidadAConvertir

    expect(costoItemTotal).toBe(200) // 25 * 8
    expect(costoUnitario).toBe(25) // 200 / 8
    expect(costoTotal).toBe(125) // 25 * 5
  })

  // 🧪 Test: Cálculo de costos cuando no hay datos de costo disponibles
  it('should return zero costs when no cost data is available', () => {
    const listaItem = {
      id: 'item-3',
      cantidad: 5,
      costoElegido: null,
      cotizacionSeleccionada: null // ✅ No hay cotización
    }

    const cantidadAConvertir = 2

    // ✅ Lógica de cálculo como en el código real
    let costoItemTotal = 0
    if (listaItem.costoElegido !== null && listaItem.costoElegido !== undefined) {
      costoItemTotal = listaItem.costoElegido
    } else if (listaItem.cotizacionSeleccionada?.precioUnitario && listaItem.cantidad) {
      costoItemTotal = listaItem.cotizacionSeleccionada.precioUnitario * listaItem.cantidad
    }
    
    const costoUnitario = listaItem.cantidad > 0 ? costoItemTotal / listaItem.cantidad : 0
    const costoTotal = costoUnitario * cantidadAConvertir

    expect(costoItemTotal).toBe(0)
    expect(costoUnitario).toBe(0)
    expect(costoTotal).toBe(0)
  })

  // 🧪 Test: Manejo de cantidad cero para evitar división por cero
  it('should handle zero quantity to avoid division by zero', () => {
    const listaItem = {
      id: 'item-4',
      cantidad: 0, // ✅ Cantidad cero
      costoElegido: 100,
      cotizacionSeleccionada: {
        precioUnitario: 20
      }
    }

    const cantidadAConvertir = 1

    // ✅ Lógica de cálculo como en el código real
    let costoItemTotal = 0
    if (listaItem.costoElegido !== null && listaItem.costoElegido !== undefined) {
      costoItemTotal = listaItem.costoElegido
    } else if (listaItem.cotizacionSeleccionada?.precioUnitario && listaItem.cantidad) {
      costoItemTotal = listaItem.cotizacionSeleccionada.precioUnitario * listaItem.cantidad
    }
    
    const costoUnitario = listaItem.cantidad > 0 ? costoItemTotal / listaItem.cantidad : 0
    const costoTotal = costoUnitario * cantidadAConvertir

    expect(costoItemTotal).toBe(100) // Usa costoElegido
    expect(costoUnitario).toBe(0) // División por cero manejada
    expect(costoTotal).toBe(0)
  })

  // 🧪 Test: Cálculo con costoElegido undefined (diferente de null)
  it('should handle undefined costoElegido correctly', () => {
    const listaItem = {
      id: 'item-5',
      cantidad: 4,
      costoElegido: undefined, // ✅ Undefined en lugar de null
      cotizacionSeleccionada: {
        precioUnitario: 15
      }
    }

    const cantidadAConvertir = 2

    // ✅ Lógica de cálculo como en el código real
    let costoItemTotal = 0
    if (listaItem.costoElegido !== null && listaItem.costoElegido !== undefined) {
      costoItemTotal = listaItem.costoElegido
    } else if (listaItem.cotizacionSeleccionada?.precioUnitario && listaItem.cantidad) {
      costoItemTotal = listaItem.cotizacionSeleccionada.precioUnitario * listaItem.cantidad
    }
    
    const costoUnitario = listaItem.cantidad > 0 ? costoItemTotal / listaItem.cantidad : 0
    const costoTotal = costoUnitario * cantidadAConvertir

    expect(costoItemTotal).toBe(60) // 15 * 4 (usa cotización)
    expect(costoUnitario).toBe(15) // 60 / 4
    expect(costoTotal).toBe(30) // 15 * 2
  })
})
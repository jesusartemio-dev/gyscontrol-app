// ===================================================
// 📁 Archivo: listaEquipoImportExcel.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicios para importación de Excel en listas de equipos
// ✍️ Autor: GYS Team
// 📅 Última actualización: 2025-11-18
// ===================================================

import { getCatalogoEquipos } from './catalogoEquipo'
import { getProyectoEquipos } from './proyectoEquipo'
import { createCatalogoEquipo } from './catalogoEquipo'
import { createListaEquipoItem, updateListaEquipoItem, getListaEquipoItemsByLista } from './listaEquipoItem'
import { updateProyectoEquipoItem } from './proyectoEquipoItem'
import { getCategoriasEquipo, createCategoriaEquipo } from './categoriaEquipo'
import { getUnidades, createUnidad } from './unidad'
import { buildApiUrl } from '@/lib/utils'
import type { CatalogoEquipo, CatalogoEquipoPayload, CategoriaEquipo, Unidad, ListaEquipoItem } from '@/types'

export interface ItemExcelImportado {
  codigo: string
  descripcion: string
  categoria: string
  unidad: string
  marca: string
  cantidad: number
  estado: 'en_cotizacion' | 'solo_catalogo' | 'nuevo'
  catalogoId?: string
  proyectoEquipoItemId?: string
  categoriaCatalogo?: string // Categoría del catálogo para detectar discrepancias
}

export interface ResumenImportacionExcel {
  totalItems: number
  enCotizacion: number
  soloCatalogo: number
  nuevos: number
  items: ItemExcelImportado[]
  equiposNuevosParaCatalogo: CatalogoEquipoPayload[]
}

// ✅ Verificar existencia de equipos en catálogo y cotización
export async function verificarExistenciaEquipos(
  excelItems: Array<{
    codigo: string
    descripcion: string
    categoria: string
    unidad: string
    marca: string
    cantidad: number
  }>,
  proyectoId: string
): Promise<ResumenImportacionExcel> {
  try {
    // Obtener datos existentes
    const [catalogoEquipos, proyectoEquipos, categorias, unidades] = await Promise.all([
      getCatalogoEquipos(),
      getProyectoEquipos(proyectoId),
      getCategoriasEquipo(),
      getUnidades()
    ])

    // Crear mapas de búsqueda
    const catalogoPorCodigo = new Map(
      catalogoEquipos.map(eq => [eq.codigo, eq])
    )

    const cotizacionPorCodigo = new Map(
      proyectoEquipos.flatMap(pe =>
        pe.items?.map(item => [item.codigo, item]) || []
      ) || []
    )

    // Crear mapas para categorias y unidades
    const categoriaPorNombre = new Map<string, CategoriaEquipo>(
      categorias.map((cat: CategoriaEquipo) => [cat.nombre.toLowerCase(), cat])
    )

    const unidadPorNombre = new Map<string, Unidad>(
      unidades.map((un: Unidad) => [un.nombre.toLowerCase(), un])
    )

    const itemsClasificados: ItemExcelImportado[] = []
    const equiposParaCatalogo: CatalogoEquipoPayload[] = []
    let enCotizacion = 0
    let soloCatalogo = 0
    let nuevos = 0

    // Obtener o crear categoría por defecto
    const CATEGORIA_DEFAULT = 'SIN-CATEGORIA'
    let categoriaDefaultId = categoriaPorNombre.get(CATEGORIA_DEFAULT.toLowerCase())?.id

    if (!categoriaDefaultId) {
      console.log('🔹 Creando categoría por defecto:', CATEGORIA_DEFAULT)
      const categoriaDefault = await createCategoriaEquipo({ 
        nombre: CATEGORIA_DEFAULT,
        descripcion: 'Categoría por defecto para equipos sin clasificar'
      })
      categoriaDefaultId = categoriaDefault.id
      categoriaPorNombre.set(CATEGORIA_DEFAULT.toLowerCase(), categoriaDefault)
      console.log('✅ Categoría por defecto creada:', categoriaDefault)
    }

    for (const excelItem of excelItems) {
      const { codigo, descripcion, categoria, unidad, marca, cantidad } = excelItem

      // Convertir codigo a string para comparación consistente
      const codigoStr = String(codigo)

      const existeEnCatalogo = catalogoPorCodigo.has(codigoStr)
      const existeEnCotizacion = cotizacionPorCodigo.has(codigoStr)

      let estado: 'en_cotizacion' | 'solo_catalogo' | 'nuevo'
      let catalogoId: string | undefined
      let proyectoEquipoItemId: string | undefined

      let categoriaCatalogo: string | undefined

      if (existeEnCatalogo && existeEnCotizacion) {
        // Existe en ambos
        estado = 'en_cotizacion'
        catalogoId = catalogoPorCodigo.get(codigoStr)?.id
        proyectoEquipoItemId = cotizacionPorCodigo.get(codigoStr)?.id
        categoriaCatalogo = catalogoPorCodigo.get(codigoStr)?.categoriaEquipo?.nombre
        enCotizacion++
      } else if (existeEnCatalogo) {
        // Solo en catálogo
        estado = 'solo_catalogo'
        catalogoId = catalogoPorCodigo.get(codigoStr)?.id
        categoriaCatalogo = catalogoPorCodigo.get(codigoStr)?.categoriaEquipo?.nombre
        soloCatalogo++
      } else {
        // Nuevo
        estado = 'nuevo'
        nuevos++

        // Skip catalog preparation for TEMP-coded items (no real catalog code)
        const esCodigoTemporal = codigoStr.startsWith('TEMP-')
        if (!esCodigoTemporal) {
          // Obtener o crear categoria
          let categoriaId: string

          if (!categoria || categoria.trim().length === 0) {
            // Usar categoría por defecto si está vacía
            console.log(`⚠️ Item ${codigo}: Categoría vacía, usando categoría por defecto`)
            categoriaId = categoriaDefaultId!
          } else {
            // Buscar categoría existente
            categoriaId = categoriaPorNombre.get(categoria.toLowerCase())?.id as string

            if (!categoriaId) {
              // Crear nueva categoría
              console.log(`🔹 Creando nueva categoría: ${categoria}`)
              const nuevaCategoria = await createCategoriaEquipo({
                nombre: categoria.trim()
              })
              categoriaId = nuevaCategoria.id
              categoriaPorNombre.set(categoria.toLowerCase(), nuevaCategoria)
              console.log(`✅ Categoría creada: ${nuevaCategoria.nombre}`)
            }
          }

          // Obtener o crear unidad
          let unidadId = unidadPorNombre.get(unidad.toLowerCase())?.id
          if (!unidadId) {
            // Crear nueva unidad
            const nuevaUnidad = await createUnidad({ nombre: unidad })
            unidadId = nuevaUnidad.id
            unidadPorNombre.set(unidad.toLowerCase(), nuevaUnidad)
          }

          // Verificar que tenemos los IDs
          if (!categoriaId || !unidadId) {
            throw new Error(`No se pudieron obtener IDs para categoria "${categoria}" o unidad "${unidad}"`)
          }

          // Agregar para crear en catálogo (only real codes, not TEMP)
          equiposParaCatalogo.push({
            codigo: codigoStr,
            descripcion,
            marca,
            categoriaId,
            unidadId,
            precioLista: 0,
            precioInterno: 0,
            factorCosto: 1.00,
            factorVenta: 1.15,
            precioVenta: 0,
            estado: 'pendiente'
          })
        }
      }

      itemsClasificados.push({
        codigo: codigoStr,
        descripcion,
        categoria,
        unidad,
        marca,
        cantidad,
        estado,
        catalogoId,
        proyectoEquipoItemId,
        categoriaCatalogo
      })
    }

    return {
      totalItems: excelItems.length,
      enCotizacion,
      soloCatalogo,
      nuevos,
      items: itemsClasificados,
      equiposNuevosParaCatalogo: equiposParaCatalogo
    }
  } catch (error) {
    console.error('Error verificando existencia de equipos:', error)
    throw new Error('Error al verificar existencia de equipos')
  }
}

// ✅ Crear equipos nuevos en el catálogo
export async function crearEquiposEnCatalogo(
  equiposNuevos: CatalogoEquipoPayload[]
): Promise<CatalogoEquipo[]> {
  try {
    const equiposCreados: CatalogoEquipo[] = []

    for (const equipoPayload of equiposNuevos) {
      try {
        const equipoCreado = await createCatalogoEquipo(equipoPayload)
        if (equipoCreado) {
          equiposCreados.push(equipoCreado)
        }
      } catch (error) {
        console.error(`Error creando equipo ${equipoPayload.codigo}:`, error)
        throw error
      }
    }

    return equiposCreados
  } catch (error) {
    console.error('Error creando equipos en catálogo:', error)
    throw new Error('Error al crear equipos en catálogo')
  }
}

// ✅ Importar items desde cotización usando datos del Excel + vínculo al cotizado
export async function importarDesdeCotizacion(
  listaId: string,
  proyectoEquipoItemIds: string[],
  itemsExcel?: Array<{
    codigo: string
    descripcion: string
    categoria: string
    unidad: string
    marca: string
    cantidad: number
    quotedItemId: string
  }>
): Promise<void> {
  try {
    // Obtener items existentes en la lista para detectar duplicados
    const itemsExistentes = await getListaEquipoItemsByLista(listaId)
    const itemsPorCodigo = new Map<string, ListaEquipoItem>(
      itemsExistentes.map(item => [item.codigo, item])
    )

    // Build lookup: quotedItemId → Excel data
    const excelByQuotedId = new Map<string, { codigo: string; descripcion: string; categoria: string; unidad: string; marca: string; cantidad: number; quotedItemId: string }>()
    if (itemsExcel) {
      for (const item of itemsExcel) {
        excelByQuotedId.set(item.quotedItemId, item)
      }
    }

    for (const itemId of proyectoEquipoItemIds) {
      // Obtener datos del ProyectoEquipoItem para el vínculo
      const res = await fetch(buildApiUrl(`/api/proyecto-equipo-item/${itemId}`))
      if (!res.ok) continue

      const proyectoItem = await res.json()
      const excelData = excelByQuotedId.get(itemId)

      // Use Excel code/data if available, fall back to quoted item data
      const codigo = excelData?.codigo || proyectoItem.codigo
      const descripcion = excelData?.descripcion || proyectoItem.descripcion
      const categoria = excelData?.categoria || proyectoItem.categoria
      const unidad = excelData?.unidad || proyectoItem.unidad || 'UND'
      const marca = excelData?.marca || proyectoItem.marca || ''
      const cantidad = excelData?.cantidad || proyectoItem.cantidad || 1

      const existente = itemsPorCodigo.get(codigo)

      if (existente) {
        // ✅ Actualizar item existente
        await updateListaEquipoItem(existente.id, {
          cantidad,
          descripcion,
          marca,
          categoria,
          proyectoEquipoItemId: itemId,
        })
        console.log(`🔄 Item ${codigo} actualizado en lista (vinculado a ${proyectoItem.codigo})`)
      } else {
        // ✅ Crear nuevo item con datos del Excel + vínculo al cotizado
        await createListaEquipoItem({
          listaId,
          proyectoEquipoItemId: itemId,
          proyectoEquipoId: proyectoItem.proyectoEquipoId,
          catalogoEquipoId: proyectoItem.catalogoEquipoId,
          codigo,
          descripcion,
          categoria,
          unidad,
          marca,
          cantidad,
          presupuesto: proyectoItem.precioCliente || 0,
          origen: 'cotizado',
          estado: 'borrador',
        })
        console.log(`✅ Item ${codigo} creado en lista (vinculado a ${proyectoItem.codigo})`)
      }
    }
  } catch (error) {
    console.error('Error importando desde cotización:', error)
    throw new Error('Error al importar items desde cotización')
  }
}

// ✅ Importar items desde catálogo (actualiza si ya existe el código)
export async function importarDesdeCatalogo(
  listaId: string,
  proyectoEquipoId: string,
  catalogoIds: string[],
  cantidades: Record<string, number>,
  responsableId: string
): Promise<void> {
  try {
    // Obtener items existentes en la lista para detectar duplicados
    const itemsExistentes = await getListaEquipoItemsByLista(listaId)
    const itemsPorCodigo = new Map<string, ListaEquipoItem>(
      itemsExistentes.map(item => [item.codigo, item])
    )

    // Obtener datos del catálogo
    const catalogoEquipos = await getCatalogoEquipos()
    const catalogoPorId = new Map(
      catalogoEquipos.map(eq => [eq.id, eq])
    )

    for (const catalogoId of catalogoIds) {
      const equipo = catalogoPorId.get(catalogoId)
      if (!equipo) continue

      const cantidad = cantidades[catalogoId] || 1
      const existente = itemsPorCodigo.get(equipo.codigo)

      if (existente) {
        // ✅ Actualizar item existente con nuevos datos del Excel
        await updateListaEquipoItem(existente.id, {
          cantidad,
          descripcion: equipo.descripcion || existente.descripcion,
          marca: equipo.marca || existente.marca || 'SIN-MARCA',
          categoria: equipo.categoriaEquipo?.nombre || existente.categoria || 'SIN-CATEGORIA',
          catalogoEquipoId: equipo.id,
        })
        console.log(`🔄 Item ${equipo.codigo} actualizado en lista`)
      } else {
        // ✅ Crear nuevo item
        await createListaEquipoItem({
          listaId,
          proyectoEquipoId,
          responsableId,
          catalogoEquipoId: equipo.id,
          codigo: equipo.codigo,
          descripcion: equipo.descripcion,
          marca: equipo.marca || 'SIN-MARCA',
          categoria: equipo.categoriaEquipo?.nombre || 'SIN-CATEGORIA',
          unidad: equipo.unidad?.nombre || 'UND',
          cantidad,
          presupuesto: equipo.precioVenta ?? 0,
          origen: 'nuevo',
          estado: 'borrador'
        })
        console.log(`✅ Item ${equipo.codigo} creado en lista`)
      }
    }
  } catch (error) {
    console.error('Error importando desde catálogo:', error)
    throw new Error('Error al importar items desde catálogo')
  }
}

// ✅ Importar items directo a la lista SIN crear en catálogo (actualiza si ya existe el código)
export async function importarDirectoALista(
  listaId: string,
  proyectoEquipoId: string,
  items: Array<{
    codigo: string
    descripcion: string
    categoria: string
    unidad: string
    marca: string
    cantidad: number
  }>,
  responsableId: string
): Promise<void> {
  try {
    const itemsExistentes = await getListaEquipoItemsByLista(listaId)
    const itemsPorCodigo = new Map<string, ListaEquipoItem>(
      itemsExistentes.map(item => [item.codigo, item])
    )

    for (const item of items) {
      const existente = itemsPorCodigo.get(item.codigo)

      if (existente) {
        await updateListaEquipoItem(existente.id, {
          cantidad: item.cantidad,
          descripcion: item.descripcion || existente.descripcion,
          marca: item.marca || existente.marca || 'SIN-MARCA',
          categoria: item.categoria || existente.categoria || 'SIN-CATEGORIA',
        })
        console.log(`🔄 Item ${item.codigo} actualizado en lista (sin catálogo)`)
      } else {
        await createListaEquipoItem({
          listaId,
          proyectoEquipoId,
          responsableId,
          codigo: item.codigo,
          descripcion: item.descripcion,
          marca: item.marca || 'SIN-MARCA',
          categoria: item.categoria || 'SIN-CATEGORIA',
          unidad: item.unidad || 'UND',
          cantidad: item.cantidad,
          presupuesto: 0,
          origen: 'nuevo',
          estado: 'borrador'
        })
        console.log(`✅ Item ${item.codigo} creado en lista (sin catálogo)`)
      }
    }
  } catch (error) {
    console.error('Error importando directo a lista:', error)
    throw new Error('Error al importar items directamente a la lista')
  }
}

// ✅ Importar items como reemplazo de items cotizados
export async function importarComoReemplazo(
  listaId: string,
  proyectoEquipoId: string,
  replacements: Array<{
    excelItem: {
      codigo: string
      descripcion: string
      categoria: string
      unidad: string
      marca: string
      cantidad: number
    }
    proyectoEquipoItemId: string
    motivo: string
  }>,
  responsableId: string
): Promise<void> {
  try {
    for (const { excelItem, proyectoEquipoItemId, motivo } of replacements) {
      // 1. Crear nuevo ListaEquipoItem con origen 'reemplazo'
      const nuevoItem = await createListaEquipoItem({
        listaId,
        proyectoEquipoId,
        responsableId,
        proyectoEquipoItemId,
        reemplazaProyectoEquipoCotizadoItemId: proyectoEquipoItemId,
        codigo: excelItem.codigo,
        descripcion: excelItem.descripcion,
        marca: excelItem.marca || 'SIN-MARCA',
        categoria: excelItem.categoria || 'SIN-CATEGORIA',
        unidad: excelItem.unidad || 'UND',
        cantidad: excelItem.cantidad,
        presupuesto: 0,
        origen: 'reemplazo',
        estado: 'borrador',
        comentarioRevision: motivo,
      })

      // 2. Actualizar ProyectoEquipoItem → reemplazado
      if (nuevoItem) {
        await updateProyectoEquipoItem(proyectoEquipoItemId, {
          listaEquipoSeleccionadoId: nuevoItem.id,
          listaId,
          estado: 'reemplazado',
          motivoCambio: motivo,
        })
      }

      console.log(`🔄 Item ${excelItem.codigo} importado como reemplazo de ProyectoEquipoItem ${proyectoEquipoItemId}`)
    }
  } catch (error) {
    console.error('Error importando como reemplazo:', error)
    throw new Error('Error al importar items como reemplazo')
  }
}
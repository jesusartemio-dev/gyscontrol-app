// src/lib/agente/tools.ts
// Definiciones de tools (schemas JSON) para Claude API

import type { AnthropicTool } from './types'

// ── Search tools ──────────────────────────────────────────

export const searchTools: AnthropicTool[] = [
  {
    name: 'buscar_equipos_catalogo',
    description:
      'Busca equipos en el catálogo de GYS Control. Puede buscar por texto libre (descripción, código, marca) y filtrar por categoría. Devuelve equipos con precios internos y de venta.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Texto de búsqueda (descripción, código o marca del equipo)',
        },
        categoria: {
          type: 'string',
          description: 'Filtrar por nombre de categoría de equipo',
        },
        marca: {
          type: 'string',
          description: 'Filtrar por marca del equipo',
        },
        limit: {
          type: 'number',
          description: 'Cantidad máxima de resultados (default: 15)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'buscar_servicios_catalogo',
    description:
      'Busca servicios en el catálogo de GYS Control. Los servicios están organizados por EDT (Estructura de Desglose de Trabajo) y asociados a recursos (personal). Devuelve nombre, horas base, recurso asignado y su costo por hora.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Texto de búsqueda (nombre o descripción del servicio)',
        },
        edtNombre: {
          type: 'string',
          description: 'Filtrar por nombre de EDT (ej: "Programación", "Ingeniería")',
        },
        recursoNombre: {
          type: 'string',
          description: 'Filtrar por nombre de recurso (ej: "Senior A", "Junior B")',
        },
        limit: {
          type: 'number',
          description: 'Cantidad máxima de resultados (default: 15)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'buscar_gastos_catalogo',
    description:
      'Busca gastos operativos en el catálogo (viáticos, movilidad, hospedaje, EPP, etc.). Devuelve descripción, precio interno, precio de venta y margen.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Texto de búsqueda (descripción del gasto)',
        },
        categoria: {
          type: 'string',
          description: 'Filtrar por categoría de gasto',
        },
        limit: {
          type: 'number',
          description: 'Cantidad máxima de resultados (default: 15)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'buscar_clientes',
    description:
      'Busca clientes de GYS Control por nombre, RUC o código. Devuelve datos de contacto, sector y relación comercial.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Texto de búsqueda (nombre, RUC o código del cliente)',
        },
        limit: {
          type: 'number',
          description: 'Cantidad máxima de resultados (default: 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'buscar_recursos',
    description:
      'Busca recursos humanos disponibles (ingenieros, técnicos, cuadrillas). Cada recurso tiene un costo por hora que se usa para calcular costos de servicios.',
    input_schema: {
      type: 'object' as const,
      properties: {
        nombre: {
          type: 'string',
          description: 'Filtrar por nombre (ej: "Senior A", "Semisenior B", "Cuadrilla")',
        },
        tipo: {
          type: 'string',
          enum: ['individual', 'cuadrilla'],
          description: 'Filtrar por tipo de recurso',
        },
      },
      required: [],
    },
  },
  {
    name: 'buscar_cotizaciones_similares',
    description:
      'Busca cotizaciones anteriores para usarlas como referencia. Útil para estimar precios o copiar estructuras de proyectos similares. Devuelve código, cliente, estado, totales y fecha.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Texto de búsqueda en nombre de cotización',
        },
        clienteNombre: {
          type: 'string',
          description: 'Filtrar por nombre de cliente',
        },
        estado: {
          type: 'string',
          enum: ['borrador', 'enviada', 'aprobada', 'rechazada'],
          description: 'Filtrar por estado de la cotización',
        },
        limit: {
          type: 'number',
          description: 'Cantidad máxima de resultados (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'obtener_edts',
    description:
      'Obtiene la lista completa de EDTs (Estructura de Desglose de Trabajo). Los EDTs son categorías que organizan los servicios (ej: "Programación PLC", "Ingeniería de Detalle", "Comisionamiento").',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'obtener_unidades',
    description:
      'Obtiene las unidades de medida disponibles para equipos (ej: "Und", "m", "Glb", "Set") y las unidades de servicio (ej: "Hora", "Día", "Global").',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
]

// ── Creation tools ────────────────────────────────────────

export const creationTools: AnthropicTool[] = [
  {
    name: 'crear_cotizacion',
    description:
      'Crea una nueva cotización en estado borrador. Devuelve el ID y código generado (GYS-XXXX-YY). SIEMPRE pide confirmación al usuario antes de llamar esta tool.',
    input_schema: {
      type: 'object' as const,
      properties: {
        nombre: {
          type: 'string',
          description: 'Nombre descriptivo de la cotización (ej: "Sistema SCADA Planta Concentradora")',
        },
        clienteId: {
          type: 'string',
          description: 'ID del cliente (obtenido con buscar_clientes)',
        },
        moneda: {
          type: 'string',
          enum: ['USD', 'PEN'],
          description: 'Moneda de la cotización (default: USD)',
        },
        notas: {
          type: 'string',
          description: 'Notas internas opcionales',
        },
      },
      required: ['nombre', 'clienteId'],
    },
  },
  {
    name: 'agregar_equipos',
    description:
      'Agrega un grupo de equipos a una cotización existente. Crea un CotizacionEquipo (grupo) con sus CotizacionEquipoItem. Los totales se recalculan automáticamente. Para equipos del catálogo, usa el catalogoEquipoId para vincular; de lo contrario el item queda solo en la cotización.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cotizacionId: {
          type: 'string',
          description: 'ID de la cotización donde agregar los equipos',
        },
        grupoNombre: {
          type: 'string',
          description: 'Nombre del grupo de equipos (ej: "Materiales Eléctricos", "Software")',
        },
        items: {
          type: 'array',
          description: 'Lista de items de equipo a agregar',
          items: {
            type: 'object',
            properties: {
              catalogoEquipoId: {
                type: 'string',
                description: 'ID del equipo en el catálogo (opcional, si viene del catálogo)',
              },
              codigo: {
                type: 'string',
                description: 'Código del equipo (ej: "6ES7214-1AG40-0XB0")',
              },
              descripcion: {
                type: 'string',
                description: 'Descripción del equipo',
              },
              categoria: {
                type: 'string',
                description: 'Categoría (ej: "PLC", "HMI", "Instrumentación")',
              },
              unidad: {
                type: 'string',
                description: 'Unidad de medida (ej: "Und", "m", "Glb"). Default: "Und"',
              },
              marca: {
                type: 'string',
                description: 'Marca del equipo (ej: "Siemens", "ABB")',
              },
              precioLista: {
                type: 'number',
                description: 'Precio de lista del equipo',
              },
              factorCosto: {
                type: 'number',
                description: 'Factor de costo GYS (default: 1.00). precioInterno = precioLista × factorCosto',
              },
              factorVenta: {
                type: 'number',
                description: 'Factor de venta al cliente (default: 1.25). precioCliente = precioInterno × factorVenta',
              },
              cantidad: {
                type: 'number',
                description: 'Cantidad de unidades (default: 1)',
              },
              origenPrecio: {
                type: 'string',
                description: 'Origen del precio: "CATALOGO", "OC: [proyecto/proveedor]", o "ESTIMADO: [razón]"',
              },
            },
            required: ['descripcion', 'precioLista'],
          },
        },
      },
      required: ['cotizacionId', 'grupoNombre', 'items'],
    },
  },
  {
    name: 'agregar_servicios',
    description:
      'Agrega un grupo de servicios a una cotización existente. Crea un CotizacionServicio (grupo) vinculado a un EDT, con sus CotizacionServicioItem. Los totales se recalculan automáticamente. Cada item requiere un recursoId (obtenido con buscar_recursos) y un edtId (obtenido con obtener_edts).',
    input_schema: {
      type: 'object' as const,
      properties: {
        cotizacionId: {
          type: 'string',
          description: 'ID de la cotización donde agregar los servicios',
        },
        grupoNombre: {
          type: 'string',
          description: 'Nombre del grupo de servicio (ej: "Servicios de Ingeniería")',
        },
        edtId: {
          type: 'string',
          description: 'ID del EDT para este grupo (obtenido con obtener_edts)',
        },
        items: {
          type: 'array',
          description: 'Lista de items de servicio a agregar',
          items: {
            type: 'object',
            properties: {
              nombre: {
                type: 'string',
                description: 'Nombre de la actividad (ej: "Programación PLC principal")',
              },
              descripcion: {
                type: 'string',
                description: 'Descripción detallada del servicio',
              },
              recursoId: {
                type: 'string',
                description: 'ID del recurso asignado (obtenido con buscar_recursos)',
              },
              unidadServicioId: {
                type: 'string',
                description: 'ID de la unidad de servicio (obtenido con obtener_unidades). Si no se provee se usa "Hora"',
              },
              costoHora: {
                type: 'number',
                description: 'Costo por hora del recurso. Si no se provee se usa el del recurso en BD',
              },
              cantidad: {
                type: 'number',
                description: 'Cantidad/repeticiones (default: 1)',
              },
              horaBase: {
                type: 'number',
                description: 'Horas base para la primera unidad',
              },
              horaRepetido: {
                type: 'number',
                description: 'Horas adicionales por cada unidad extra (default: 0)',
              },
              horaFijo: {
                type: 'number',
                description: 'Horas fijas (para fórmula Fijo)',
              },
              formula: {
                type: 'string',
                enum: ['Fijo', 'Escalonada', 'Proporcional'],
                description: 'Tipo de fórmula para calcular horas (default: "Escalonada")',
              },
              factorSeguridad: {
                type: 'number',
                description: 'Factor de seguridad/contingencia (default: 1.0)',
              },
              margen: {
                type: 'number',
                description: 'Margen sobre el costo (default: 1.35 = 35% de margen). costoInterno = costoCliente / margen',
              },
              origenPrecio: {
                type: 'string',
                description: 'Origen del precio: "CATALOGO", "OC: [proyecto/proveedor]", o "ESTIMADO: [razón]"',
              },
            },
            required: ['nombre', 'recursoId', 'horaBase'],
          },
        },
      },
      required: ['cotizacionId', 'grupoNombre', 'edtId', 'items'],
    },
  },
  {
    name: 'agregar_gastos',
    description:
      'Agrega un grupo de gastos operativos a una cotización existente. Crea un CotizacionGasto (grupo) con sus CotizacionGastoItem. Los totales se recalculan automáticamente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cotizacionId: {
          type: 'string',
          description: 'ID de la cotización donde agregar los gastos',
        },
        grupoNombre: {
          type: 'string',
          description: 'Nombre del grupo de gastos (ej: "Movilización", "Operativos")',
        },
        items: {
          type: 'array',
          description: 'Lista de items de gasto a agregar',
          items: {
            type: 'object',
            properties: {
              nombre: {
                type: 'string',
                description: 'Nombre del gasto (ej: "Viáticos campo", "Pasajes aéreos")',
              },
              descripcion: {
                type: 'string',
                description: 'Descripción detallada del gasto',
              },
              cantidad: {
                type: 'number',
                description: 'Cantidad (default: 1)',
              },
              precioUnitario: {
                type: 'number',
                description: 'Precio unitario del gasto',
              },
              factorSeguridad: {
                type: 'number',
                description: 'Factor de seguridad (default: 1.0)',
              },
              margen: {
                type: 'number',
                description: 'Margen (default: 1.0). costoInterno = costoCliente / margen',
              },
              origenPrecio: {
                type: 'string',
                description: 'Origen del precio: "CATALOGO", "OC: [proyecto/proveedor]", o "ESTIMADO: [razón]"',
              },
            },
            required: ['nombre', 'precioUnitario'],
          },
        },
      },
      required: ['cotizacionId', 'grupoNombre', 'items'],
    },
  },
  {
    name: 'agregar_condiciones',
    description:
      'Agrega condiciones comerciales a una cotización (ej: "Precios válidos por 15 días", "Incluye garantía de 1 año").',
    input_schema: {
      type: 'object' as const,
      properties: {
        cotizacionId: {
          type: 'string',
          description: 'ID de la cotización',
        },
        condiciones: {
          type: 'array',
          description: 'Lista de condiciones a agregar',
          items: {
            type: 'object',
            properties: {
              descripcion: {
                type: 'string',
                description: 'Texto de la condición',
              },
              tipo: {
                type: 'string',
                description: 'Tipo de condición (ej: "pago", "entrega", "garantía")',
              },
            },
            required: ['descripcion'],
          },
        },
      },
      required: ['cotizacionId', 'condiciones'],
    },
  },
  {
    name: 'agregar_exclusiones',
    description:
      'Agrega exclusiones a una cotización (ej: "No incluye obra civil", "No incluye cableado eléctrico de potencia").',
    input_schema: {
      type: 'object' as const,
      properties: {
        cotizacionId: {
          type: 'string',
          description: 'ID de la cotización',
        },
        exclusiones: {
          type: 'array',
          description: 'Lista de exclusiones a agregar',
          items: {
            type: 'object',
            properties: {
              descripcion: {
                type: 'string',
                description: 'Texto de la exclusión',
              },
            },
            required: ['descripcion'],
          },
        },
      },
      required: ['cotizacionId', 'exclusiones'],
    },
  },
  {
    name: 'recalcular_cotizacion',
    description:
      'Fuerza un recálculo de todos los subtotales y totales de una cotización. Normalmente no es necesario llamarla manualmente porque agregar_equipos/servicios/gastos ya recalculan automáticamente.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cotizacionId: {
          type: 'string',
          description: 'ID de la cotización a recalcular',
        },
      },
      required: ['cotizacionId'],
    },
  },
  {
    name: 'obtener_resumen_cotizacion',
    description:
      'Obtiene el resumen completo de una cotización: datos generales, totales por categoría (equipos, servicios, gastos), cantidad de items, estado, cliente, y link para ver/editar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cotizacionId: {
          type: 'string',
          description: 'ID de la cotización',
        },
      },
      required: ['cotizacionId'],
    },
  },
]

// ── Project read-only tools ──────────────────────────────

export const projectTools: AnthropicTool[] = [
  {
    name: 'buscar_proyectos',
    description:
      'Busca proyectos ejecutados de GYS Control. Útil para encontrar proyectos similares al que se quiere cotizar y comparar costos cotizados vs reales. Devuelve código, nombre, cliente, estado, progreso, costos internos cotizados y costos reales de ejecución.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Texto de búsqueda en nombre o código del proyecto',
        },
        clienteNombre: {
          type: 'string',
          description: 'Filtrar por nombre de cliente',
        },
        estado: {
          type: 'string',
          enum: [
            'creado',
            'en_planificacion',
            'listas_pendientes',
            'listas_aprobadas',
            'pedidos_creados',
            'en_ejecucion',
            'en_cierre',
            'cerrado',
          ],
          description: 'Filtrar por estado del proyecto',
        },
        limit: {
          type: 'number',
          description: 'Cantidad máxima de resultados (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'obtener_detalle_proyecto',
    description:
      'Obtiene el detalle completo de un proyecto: datos generales, equipos cotizados vs reales, servicios cotizados vs horas ejecutadas, gastos cotizados vs reales, y un resumen de desviación de costos. Ideal para analizar qué tan precisas fueron las cotizaciones anteriores.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proyectoId: {
          type: 'string',
          description: 'ID del proyecto',
        },
      },
      required: ['proyectoId'],
    },
  },
  {
    name: 'buscar_listas_equipo',
    description:
      'Busca listas de equipo de proyectos. Las listas contienen los equipos que realmente se necesitaron en un proyecto, con precios elegidos de proveedores reales. Útil para saber qué equipos se usaron y a qué precio real se compraron.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proyectoId: {
          type: 'string',
          description: 'Filtrar por ID de proyecto',
        },
        query: {
          type: 'string',
          description: 'Buscar por nombre de la lista',
        },
        estado: {
          type: 'string',
          enum: ['borrador', 'enviada', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobada', 'completada'],
          description: 'Filtrar por estado de la lista',
        },
        limit: {
          type: 'number',
          description: 'Cantidad máxima de resultados (default: 10)',
        },
      },
      required: [],
    },
  },
  {
    name: 'obtener_cronograma_proyecto',
    description:
      'Obtiene las fases del cronograma de un proyecto con fechas planificadas vs reales y porcentaje de avance. Útil para estimar plazos de ejecución basados en proyectos reales similares.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proyectoId: {
          type: 'string',
          description: 'ID del proyecto',
        },
      },
      required: ['proyectoId'],
    },
  },
  {
    name: 'buscar_ordenes_compra',
    description:
      'Busca órdenes de compra de un proyecto. Las OC contienen los precios reales de compra a proveedores. Esta es la mejor referencia de precios para cotizar equipos porque refleja lo que realmente se pagó.',
    input_schema: {
      type: 'object' as const,
      properties: {
        proyectoId: {
          type: 'string',
          description: 'Filtrar por ID de proyecto',
        },
        proveedorNombre: {
          type: 'string',
          description: 'Filtrar por nombre de proveedor',
        },
        estado: {
          type: 'string',
          enum: ['borrador', 'aprobada', 'enviada', 'confirmada', 'recibida_parcial', 'recibida', 'cancelada'],
          description: 'Filtrar por estado de la OC',
        },
        limit: {
          type: 'number',
          description: 'Cantidad máxima de resultados (default: 10)',
        },
      },
      required: [],
    },
  },
]

// ── Analysis tools ────────────────────────────────────────

export const analysisTools: AnthropicTool[] = [
  {
    name: 'generar_consultas_tdr',
    description:
      'Genera un documento profesional de consultas y observaciones organizadas por categoría, a partir del análisis de un TDR (Términos de Referencia). Útil para formalizar las preguntas que GYS necesita hacer al cliente antes de cotizar.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tituloTdr: {
          type: 'string',
          description: 'Título o referencia del TDR analizado',
        },
        clienteNombre: {
          type: 'string',
          description: 'Nombre del cliente que emitió el TDR',
        },
        requerimientos: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Lista de requerimientos técnicos extraídos del TDR (equipos, sistemas, capacidades, servicios)',
        },
        ambiguedades: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Puntos del TDR que son ambiguos o pueden interpretarse de múltiples formas',
        },
        vacios: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Información que el TDR debería incluir pero no menciona (especificaciones faltantes)',
        },
        consultas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              categoria: {
                type: 'string',
                description:
                  'Categoría: Alcance Técnico, Suministros del Cliente, Plazos y Logística, Condiciones Comerciales, Documentación',
              },
              pregunta: {
                type: 'string',
                description: 'La consulta redactada en español formal profesional',
              },
              justificacion: {
                type: 'string',
                description: 'Por qué esta consulta es importante para la cotización',
              },
            },
            required: ['categoria', 'pregunta', 'justificacion'],
          },
          description: 'Consultas formales organizadas para enviar al cliente',
        },
        supuestos: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Supuestos que GYS asumirá para la cotización preliminar si el cliente no responde las consultas',
        },
      },
      required: ['tituloTdr', 'clienteNombre', 'requerimientos', 'consultas'],
    },
  },
]

// ── All tools combined ────────────────────────────────────

export const allTools: AnthropicTool[] = [
  ...searchTools,
  ...projectTools,
  ...creationTools,
  ...analysisTools,
]

// ── Tool groups for context-based filtering ──────────────

/** Tool group names for selective tool loading */
export type ToolGroup = 'search' | 'project' | 'creation' | 'analysis'

const TOOL_GROUPS: Record<ToolGroup, AnthropicTool[]> = {
  search: searchTools,
  project: projectTools,
  creation: creationTools,
  analysis: analysisTools,
}

/**
 * Returns a subset of tools based on context keywords in the message.
 * Reduces token usage by not sending irrelevant tool schemas to Claude.
 */
export function selectToolsByContext(message: string): AnthropicTool[] {
  const lower = message.toLowerCase()
  const groups = new Set<ToolGroup>()

  // Search tools — always included as base capability
  groups.add('search')

  // Creation tools — only when user wants to create/modify cotizaciones
  const creationKeywords = [
    'cotiza', 'crear', 'crea', 'nueva cotización', 'agrega', 'agregar',
    'condicion', 'exclusion', 'recalcul', 'resumen cotización',
    'pon', 'ponle', 'incluye', 'incluir', 'añade', 'añadir', 'anade', 'anadir',
    'mete', 'meter', 'quita', 'quitar', 'elimina', 'eliminar',
    'modifica', 'modificar', 'cambia', 'cambiar', 'actualiza', 'actualizar',
    'edita', 'editar', 'reemplaza', 'reemplazar', 'sube', 'baja', 'ajusta',
    'saca', 'sacar', 'dame',
  ]
  if (creationKeywords.some((k) => lower.includes(k))) {
    groups.add('creation')
  }

  // Project tools — when asking about projects, execution, comparisons
  const projectKeywords = [
    'proyecto', 'ejecut', 'cronograma', 'orden de compra', 'lista de equipo',
    'real vs', 'costo real', 'desviación', 'comparar', 'similar',
  ]
  if (projectKeywords.some((k) => lower.includes(k))) {
    groups.add('project')
  }

  // Analysis tools — TDR analysis, document review
  const analysisKeywords = [
    'tdr', 'términos de referencia', 'analiz', 'consultas', 'observacion',
    'ambigüedad', 'vacío', 'pdf', 'documento',
  ]
  if (analysisKeywords.some((k) => lower.includes(k))) {
    groups.add('analysis')
  }

  const result: AnthropicTool[] = []
  for (const g of groups) {
    result.push(...TOOL_GROUPS[g])
  }
  return result
}

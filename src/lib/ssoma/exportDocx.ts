import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType, AlignmentType,
} from 'docx'

function parsearTablaMarkdown(lineas: string[]): Table {
  const filas = lineas.filter(l => !l.match(/^\|[-| ]+\|$/))

  const rows = filas.map((fila, rowIndex) => {
    const celdas = fila
      .split('|')
      .filter((_, i, arr) => i > 0 && i < arr.length - 1)
      .map(c => c.trim())

    return new TableRow({
      children: celdas.map(texto => new TableCell({
        shading: rowIndex === 0 ? {
          fill: '2E4057',
          type: ShadingType.CLEAR,
        } : undefined,
        children: [new Paragraph({
          children: [new TextRun({
            text: texto.replace(/\*\*/g, ''),
            bold: rowIndex === 0,
            color: rowIndex === 0 ? 'FFFFFF' : '000000',
            size: 18,
          })],
        })],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
        width: { size: 100 / celdas.length, type: WidthType.PERCENTAGE },
      })),
    })
  })

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function tablaFirmas(firmantes: { ingSeguridad: string; gestorNombre: string; ggNombre: string; fecha: string }): Table {
  const celda = (texto: string, bold = false, height?: number) => new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: texto, bold, size: 18 })],
      alignment: AlignmentType.CENTER,
    })],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
    width: { size: 25, type: WidthType.PERCENTAGE },
    ...(height ? { verticalAlign: 'center' as const } : {}),
  })

  const celdaVacia = () => new TableCell({
    children: [
      new Paragraph({ text: '' }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: '' }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
    width: { size: 25, type: WidthType.PERCENTAGE },
  })

  return new Table({
    rows: [
      // Header
      new TableRow({
        children: [
          celda('PREPARADO POR', true),
          celda('REVISADO POR', true),
          celda('REVISADO POR', true),
          celda('APROBADO POR', true),
        ],
      }),
      // Nombres
      new TableRow({
        children: [
          celda(firmantes.ingSeguridad),
          celda(firmantes.gestorNombre),
          celda(firmantes.gestorNombre),
          celda(firmantes.ggNombre),
        ],
      }),
      // Cargos
      new TableRow({
        children: [
          celda('Ing. de Seguridad'),
          celda('Gestor de Proyectos'),
          celda('Gerente de Proyectos'),
          celda('Gerente General'),
        ],
      }),
      // Espacio firma
      new TableRow({
        children: [celdaVacia(), celdaVacia(), celdaVacia(), celdaVacia()],
      }),
      // Fechas
      new TableRow({
        children: [
          celda(firmantes.fecha),
          celda(firmantes.fecha),
          celda(firmantes.fecha),
          celda(firmantes.fecha),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function procesarContenido(contenido: string): (Paragraph | Table)[] {
  const elementos: (Paragraph | Table)[] = []
  const lineas = contenido.split('\n')
  let i = 0

  while (i < lineas.length) {
    const linea = lineas[i].trim()

    // Detectar inicio de tabla
    if (linea.startsWith('|')) {
      const bloqueTabla: string[] = []
      while (i < lineas.length && lineas[i].trim().startsWith('|')) {
        bloqueTabla.push(lineas[i])
        i++
      }
      elementos.push(parsearTablaMarkdown(bloqueTabla))
      continue
    }

    // Heading nivel 1 (# o número.sección)
    if (linea.startsWith('# ') || /^\d+\.\s/.test(linea)) {
      elementos.push(new Paragraph({
        text: linea.replace(/^#+\s/, '').replace(/\*\*/g, ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      }))
      i++
      continue
    }

    // Heading nivel 2 (## o número.número)
    if (linea.startsWith('## ') || /^\d+\.\d+/.test(linea)) {
      elementos.push(new Paragraph({
        text: linea.replace(/^#+\s/, '').replace(/\*\*/g, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      }))
      i++
      continue
    }

    // Línea vacía
    if (!linea) {
      elementos.push(new Paragraph({ text: '' }))
      i++
      continue
    }

    // Separador ═══
    if (linea.match(/^[═=─-]{5,}/)) {
      elementos.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6 } },
        text: '',
      }))
      i++
      continue
    }

    // Párrafo normal — limpiar markdown
    const isBullet = !!linea.match(/^[•\-*]\s/)
    elementos.push(new Paragraph({
      children: [new TextRun({
        text: linea.replace(/\*\*/g, '').replace(/^[•\-*]\s/, ''),
        size: 22,
      })],
      bullet: isBullet ? { level: 0 } : undefined,
    }))
    i++
  }

  return elementos
}

export async function generarDocx(
  titulo: string,
  codigo: string,
  contenido: string,
  firmantes: { ingSeguridad: string; gestorNombre: string; ggNombre: string; fecha: string }
): Promise<Blob> {
  const elementos = procesarContenido(contenido)

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        // Empresa
        new Paragraph({
          children: [new TextRun({
            text: 'GYS CONTROL INDUSTRIAL S.A.C.',
            bold: true, size: 28, color: '2E4057',
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),
        // Título
        new Paragraph({
          children: [new TextRun({
            text: titulo,
            bold: true, size: 26,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
        // Código y revisión
        new Paragraph({
          children: [new TextRun({
            text: `Código: ${codigo}   |   Revisión: 01   |   Fecha: ${firmantes.fecha}`,
            size: 20, color: '666666',
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        // Tabla de firmas
        tablaFirmas(firmantes),
        new Paragraph({ text: '', spacing: { after: 400 } }),
        // Contenido
        ...elementos,
      ],
    }],
  })

  return Packer.toBlob(doc)
}

// ──────────────────────────────────────────────────────
// PLAN DE EMERGENCIAS — Secciones fijas + IA variable
// ──────────────────────────────────────────────────────

const BRIGADAS_GYS = [
  { brigada: 'BRIGADA INCENDIO', nombre: 'Pérez Pesantes Vladimir', cargo: 'Logística Junior', telefono: '929 570 492' },
  { brigada: 'BRIGADA INCENDIO', nombre: 'Alburqueque Valdivia Marlon', cargo: 'Supervisor Programador', telefono: '953 850 628' },
  { brigada: 'BRIGADA INCENDIO', nombre: 'Sotelo Pinto Carlos David', cargo: 'Líder de Proyecto', telefono: '982 171 231' },
  { brigada: 'BRIGADA PRIMEROS AUXILIOS', nombre: 'Fernández Quispe Diana', cargo: 'Coordinador Logística', telefono: '962 374 385' },
  { brigada: 'BRIGADA PRIMEROS AUXILIOS', nombre: 'Lévano Saravia Zucet', cargo: 'Supervisor Jr. SGI', telefono: '963 484 743' },
  { brigada: 'BRIGADA PRIMEROS AUXILIOS', nombre: 'Pumacayo Gómez Andrés', cargo: 'Ing. Electrónico', telefono: '953 281 106' },
  { brigada: 'BRIGADA EVACUACIÓN', nombre: 'Marrujo Álvarez Claous', cargo: 'Supervisor de SGI', telefono: '960 946 700' },
  { brigada: 'BRIGADA EVACUACIÓN', nombre: 'Zambrano Campos José', cargo: 'Líder de Proyecto', telefono: '994 390 753' },
  { brigada: 'BRIGADA EVACUACIÓN', nombre: 'López Girón Edym', cargo: 'Administración', telefono: '947 549 769' },
]

const DIRECTORIO_GYS = [
  { nombre: 'Carlos Sihuayro Ancco', cargo: 'Gerente General', telefono: '987 567 918', correo: 'carlos.s@gyscontrol.com' },
  { nombre: 'Jesús Mamani Velásquez', cargo: 'Gerente de Proyectos', telefono: '950 307 588', correo: 'jesus.m@gyscontrol.com' },
  { nombre: 'Yony Apaza Arpasi', cargo: 'Ing. de Seguridad', telefono: '940 389 367', correo: 'yony.a@gyscontrol.com' },
  { nombre: 'Lady Laura Vera Moreno', cargo: 'Médico Ocupacional', telefono: '952 918 134', correo: '' },
]

const EMERGENCIAS_EXTERNAS = [
  { entidad: 'Bomberos', telefono: '116' },
  { entidad: 'SAMU', telefono: '106' },
  { entidad: 'Defensa Civil', telefono: '115' },
  { entidad: 'Policía Nacional', telefono: '105' },
  { entidad: 'Cruz Roja', telefono: '01 266 0481' },
  { entidad: 'Alerta Médica', telefono: '01 261 8783' },
  { entidad: 'SCTR Pacífico (24h)', telefono: '0800 11111' },
  { entidad: 'Pacífico Asiste (accidentes)', telefono: '415-1515' },
]

const CLINICAS_CERCANAS = [
  { nombre: 'Policlínico Globals Medic', direccion: 'Ñaña, Chaclacayo 15476', telefono: '727 8386' },
  { nombre: 'EsSalud Anexo Ñaña', direccion: 'Av. Huáscar, Chaclacayo 15476', telefono: '(01) 359 3278' },
  { nombre: 'Clínica Solidaria Santa Anita', direccion: 'Av. Las Alondras 191, Ate 15009', telefono: '362 9281' },
  { nombre: 'Policlínico San Pablo', direccion: 'Av. Prolongación Javier Prado, Ate Vitarte', telefono: '360 5646' },
]

const CLINICAS_PACIFICO = [
  { nombre: 'Clínica Limatambo SJL', direccion: 'Av. Próceres de la Independencia N° 2701, SJL', telefono: '415-1600' },
  { nombre: 'Clínica San Juan Bautista', direccion: 'Av. Próceres de la Independencia 1764, SJL', telefono: '(01) 610-4545' },
  { nombre: 'Clínica El Golf', direccion: 'Av. Aurelio Miro Quesada n° 1030, San Isidro', telefono: '(01) 635-5000' },
  { nombre: 'SANNA Clínica San Borja', direccion: 'Av. Guardia Civil N° 337, San Borja', telefono: '(01) 635-5000' },
  { nombre: 'Clínica Javier Prado', direccion: 'Av. Javier Prado Este N° 499, San Isidro', telefono: '(01) 440-2000' },
]

const BOTIQUIN_ITEMS = [
  '02 Paquetes de guantes quirúrgicos',
  '01 Frasco Yodopovidona 120ml solución antiséptica',
  '01 Frasco Agua Oxigenada',
  '01 Frasco alcohol mediano 250ml',
  '05 Paquetes gasas esterilizadas 10x10cm',
  '01 Rollo esparadrapo 5cm x 4.5m',
  '02 Rollos venda elástica 3" x 5 yardas',
  '02 Rollos venda elástica 4" x 5 yardas',
  '01 Paquete algodón x 100g',
  '01 Frasco solución cloruro de sodio 9/100 x 1L',
  '01 Tijera punta roma',
  '01 Pinza',
  '01 Camilla rígida',
]

const SCTR_PASOS = [
  'Trasladar al trabajador al centro médico o clínica de red Pacífico EPS u hospital EsSalud más cercano',
  'Presentarse en emergencia portando DNI o fotocheck + solicitud de atención médica + declaración de accidentes (completamente llenada)',
  'Si no se tienen los formatos: dejar DNI o fotocheck del trabajador hasta regularizar en máximo 48 horas',
  'Reportar el accidente dentro de las 24 horas vía correo a: siniestros@pacifico.com.pe',
  'En asunto indicar: SCTR – Nombre del trabajador – GYS CONTROL INDUSTRIAL SAC',
  'Para asesoría médica inmediata llamar a Pacífico Asiste: 415-1515 (24 horas, 365 días)',
]

export interface PlanEmergenciaData {
  codigo: string
  revision: string
  fecha: string
  proyecto: string
  cliente: string
  planta: string
  ingSeguridad: string
  gestorNombre: string
  ggNombre: string
  contactosCliente: Array<{ nombre: string; cargo: string; telefono?: string; correo?: string }>
  contenidoIA: {
    identificacionEmergencias: Array<{ origen: string; tipo: string; probabilidad: string; severidad: string; riesgo: string }>
    nivelesEmergencia: {
      tipoI: { descripcion: string; ejemplos: string[] }
      tipoII: { descripcion: string; ejemplos: string[] }
      tipoIII: { descripcion: string; ejemplos: string[] }
    }
    protocolos: Record<string, string>
    programaSimulacros: Array<{ tipo: string; frecuencia: string }>
  }
}

export async function generarDocxPlanEmergencia(data: PlanEmergenciaData): Promise<Blob> {
  const pr = (text: string, opts?: { bold?: boolean }) =>
    new Paragraph({
      children: [new TextRun({ text, bold: opts?.bold, size: 22, font: 'Arial' })],
      spacing: { after: 100 },
    })

  const hd = (text: string, level: 1 | 2) =>
    new Paragraph({
      heading: level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      children: [new TextRun({ text, bold: true, font: 'Arial' })],
      spacing: { before: 240, after: 120 },
    })

  const bl = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text: `• ${text}`, size: 22, font: 'Arial' })],
      indent: { left: 360 },
      spacing: { after: 60 },
    })

  const tbl = (headers: string[], rows: string[][], color = '2E4057') => {
    const w = Math.floor(9000 / headers.length)
    return new Table({
      width: { size: 9000, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: headers.map(h => new TableCell({
            shading: { fill: color, type: ShadingType.CLEAR },
            width: { size: w, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20, font: 'Arial' })] })],
          })),
        }),
        ...rows.map((row, ri) => new TableRow({
          children: row.map(cell => new TableCell({
            shading: { fill: ri % 2 === 0 ? 'F5F5F5' : 'FFFFFF', type: ShadingType.CLEAR },
            width: { size: w, type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: 'Arial' })] })],
          })),
        })),
      ],
    })
  }

  const ia = data.contenidoIA
  const protocoloSecciones: (Paragraph | Table)[] = []
  let pNum = 1
  const protocoloEntries: Array<[string, string, string]> = [
    ['primerosAuxilios', 'Primeros Auxilios Generales', ia.protocolos.primerosAuxilios],
    ['electrocucion', 'Electrocución', ia.protocolos.electrocucion],
    ['caidaAltura', 'Caída / Suspensión en Altura', ia.protocolos.caidaAltura],
    ['incendioCaliente', 'Amago de Incendio por Trabajo en Caliente', ia.protocolos.incendioCaliente],
    ['incendioGeneral', 'Incendio General — Técnica PASS', ia.protocolos.incendioGeneral],
    ['sismo', 'Sismo', ia.protocolos.sismo],
    ['espacioConfinado', 'Rescate en Espacio Confinado', ia.protocolos.espacioConfinado],
  ]
  for (const [, titulo, texto] of protocoloEntries) {
    if (!texto || texto === 'No aplica' || texto === 'No aplica para este proyecto') continue
    protocoloSecciones.push(hd(`9.${pNum} ${titulo}`, 2))
    protocoloSecciones.push(pr(texto))
    pNum++
  }

  const children: (Paragraph | Table)[] = [
    // Firma
    tablaFirmas({ ingSeguridad: data.ingSeguridad, gestorNombre: data.gestorNombre, ggNombre: data.ggNombre, fecha: data.fecha }),
    pr(''),

    hd('1. INTRODUCCIÓN Y ALCANCE', 1),
    pr(`El presente Plan de Respuesta a Emergencias establece los procedimientos, protocolos y recursos necesarios para la prevención, preparación y respuesta ante situaciones de emergencia durante la ejecución del proyecto "${data.proyecto}" en las instalaciones de ${data.cliente} — ${data.planta}.`),
    pr('Este plan aplica a todos los trabajadores de GYS CONTROL INDUSTRIAL SAC que participen en el proyecto.'),

    hd('2. OBJETIVOS', 1),
    hd('Objetivo General', 2),
    pr('Establecer un sistema organizado y eficiente de respuesta ante emergencias que garantice la protección de la vida, la salud de los trabajadores y la preservación del medio ambiente.'),
    hd('Objetivos Específicos', 2),
    bl('Definir claramente las responsabilidades y funciones del Comité de Emergencias.'),
    bl('Capacitar, entrenar y sensibilizar al personal para actuar rápida y ordenadamente.'),
    bl('Prevenir y responder en forma oportuna y eficiente ante cualquier emergencia.'),
    bl('Desarrollar procedimientos para actividades y zonas de alto riesgo del proyecto.'),

    hd('3. REFERENCIAS LEGALES', 1),
    bl('Ley N° 29783 — Ley de Seguridad y Salud en el Trabajo'),
    bl('DS N° 005-2012-TR — Reglamento de la Ley de SST'),
    bl('RM N° 111-2013-MEM — Reglamento de SST con Electricidad'),
    bl('RM N° 050-2013-TR — Formatos referenciales registros del SGSST'),
    bl('Ley N° 28551 — Obligación de elaborar Planes de Contingencia'),
    bl('Ley 29664 — SINAGERD'),

    hd('4. DEFINICIONES', 1),
    pr('Amago de Incendio: Fuego inicial controlable con extintor portátil.'),
    pr('Emergencia: Situación generada por un evento que requiere movilización de recursos.'),
    pr('Evacuación: Acción de desocupar una instalación que ha perdido condición segura.'),
    pr('Primeros Auxilios: Cuidados inmediatos hasta recibir atención médica profesional.'),
    pr('PQS: Polvo Químico Seco — agente extintor para incendios tipo A, B y C.'),
    pr('SCTR: Seguro Complementario de Trabajo de Riesgo.'),

    // 5. IA — Identificación
    hd('5. IDENTIFICACIÓN DE EMERGENCIAS', 1),
    tbl(
      ['ORIGEN', 'TIPO DE EMERGENCIA', 'PROBABILIDAD', 'SEVERIDAD', 'RIESGO'],
      (ia.identificacionEmergencias ?? []).map(e => [e.origen, e.tipo, e.probabilidad, e.severidad, e.riesgo])
    ),
    pr(''),

    // 6. IA — Niveles
    hd('6. NIVELES DE EMERGENCIA', 1),
    hd('Tipo I — Emergencia Menor', 2),
    pr(ia.nivelesEmergencia?.tipoI?.descripcion ?? ''),
    ...(ia.nivelesEmergencia?.tipoI?.ejemplos ?? []).map(e => bl(e)),
    hd('Tipo II — Emergencia Mayor', 2),
    pr(ia.nivelesEmergencia?.tipoII?.descripcion ?? ''),
    ...(ia.nivelesEmergencia?.tipoII?.ejemplos ?? []).map(e => bl(e)),
    hd('Tipo III — Emergencia Crítica', 2),
    pr(ia.nivelesEmergencia?.tipoIII?.descripcion ?? ''),
    ...(ia.nivelesEmergencia?.tipoIII?.ejemplos ?? []).map(e => bl(e)),

    // 7. Organización fija
    hd('7. ORGANIZACIÓN ANTE EMERGENCIAS', 1),
    pr(`JEFE DE BRIGADA: ${data.gestorNombre} — Gestor de Proyecto`, { bold: true }),
    pr(`COORDINADOR SSOMA: ${data.ingSeguridad} — Ing. de Seguridad`, { bold: true }),
    pr(''),
    tbl(
      ['ROL', 'NIVEL I', 'NIVEL II', 'NIVEL III'],
      [
        ['Personal en área', 'Controla e informa', 'Activa alarma + evacúa', 'Evacúa inmediatamente'],
        ['Jefe de Brigada', 'Recibe reporte', 'Coordina brigadas', 'Solicita apoyo externo'],
        ['Brigadas', 'Stand-by', 'Respuesta inmediata', 'Apoyo hasta ayuda externa'],
        ['Ing. Seguridad', 'Recibe reporte', 'Evalúa + reporta gerencia', 'Coordina con autoridades'],
      ]
    ),
    pr(''),

    // 8. Comunicación
    hd('8. SISTEMA DE COMUNICACIÓN', 1),
    bl('Nivel I: Personal controla la emergencia e informa al Jefe de Brigada'),
    bl('Nivel II: Jefe de Brigada activa brigada y evalúa apoyo externo'),
    bl('Nivel III: Jefe de Brigada solicita apoyo externo inmediato (Bomberos 116, SAMU 106)'),

    // 9. IA — Protocolos
    hd('9. PROTOCOLOS DE RESPUESTA', 1),
    ...protocoloSecciones,

    // 10. Equipos fijos
    hd('10. EQUIPOS Y MATERIALES DE EMERGENCIA', 1),
    hd('Botiquín de Primeros Auxilios (según G050 Anexo B)', 2),
    ...BOTIQUIN_ITEMS.map(item => bl(item)),
    pr(''),
    hd('Equipos de Respuesta', 2),
    bl('Botiquín de Primeros Auxilios (según G050 Anexo B)'),
    bl('Extintores PQS 9kg (mínimo 1 por área de trabajo)'),
    bl('Arnés de seguridad certificado ANSI Z359.1'),
    bl('Línea de vida con block retráctil MSA'),
    bl('Camilla rígida transportable'),
    bl('Teléfonos celulares con saldo ilimitado'),

    // 11. IA — Simulacros
    hd('11. ENTRENAMIENTO Y SIMULACROS', 1),
    tbl(
      ['TIPO DE ACTIVIDAD', 'FRECUENCIA'],
      (ia.programaSimulacros ?? []).map(s => [s.tipo, s.frecuencia])
    ),
    pr(''),
    pr('GYS participará en los simulacros nacionales programados por INDECI y en los simulacros organizados por el cliente.'),

    // 12. Directorio fijo
    hd('12. DIRECTORIO DE CONTACTOS', 1),
    hd('GYS Control Industrial SAC', 2),
    tbl(['NOMBRE', 'CARGO', 'TELÉFONO', 'CORREO'], DIRECTORIO_GYS.map(d => [d.nombre, d.cargo, d.telefono, d.correo])),
    pr(''),

    ...(data.contactosCliente.length > 0 ? [
      hd(`${data.cliente} — Contactos`, 2),
      tbl(['NOMBRE', 'CARGO', 'TELÉFONO', 'CORREO'], data.contactosCliente.map(c => [c.nombre, c.cargo, c.telefono ?? '', c.correo ?? ''])),
      pr(''),
    ] : []),

    hd('Brigadas de Emergencia GYS', 2),
    tbl(['BRIGADA', 'NOMBRE', 'CARGO', 'TELÉFONO'], BRIGADAS_GYS.map(b => [b.brigada, b.nombre, b.cargo, b.telefono])),
    pr(''),

    hd('Emergencias Externas', 2),
    tbl(['ENTIDAD', 'TELÉFONO'], EMERGENCIAS_EXTERNAS.map(e => [e.entidad, e.telefono])),
    pr(''),

    // 13. Clínicas fijas
    hd('13. CLÍNICAS Y CENTROS MÉDICOS', 1),
    hd('Cerca al punto de trabajo', 2),
    tbl(['NOMBRE', 'DIRECCIÓN', 'TELÉFONO'], CLINICAS_CERCANAS.map(c => [c.nombre, c.direccion, c.telefono])),
    pr(''),
    hd('Clínicas afiliadas SCTR — Aseguradora Pacífico', 2),
    tbl(['NOMBRE', 'DIRECCIÓN', 'TELÉFONO'], CLINICAS_PACIFICO.map(c => [c.nombre, c.direccion, c.telefono])),
    pr(''),

    // 14. SCTR fijo
    hd('14. PROCEDIMIENTO SCTR — QUÉ HACER EN CASO DE ACCIDENTE', 1),
    pr('Ante cualquier accidente laboral sigue estos pasos:', { bold: true }),
    ...SCTR_PASOS.map((paso, i) => new Paragraph({
      children: [new TextRun({ text: `${i + 1}. ${paso}`, size: 22, font: 'Arial' })],
      indent: { left: 360 },
      spacing: { after: 80 },
    })),
    pr(''),
    pr('Correo: siniestros@pacifico.com.pe | Asistencia 24h: 415-1515', { bold: true }),

    // 15-16
    hd('15. MEJORA CONTINUA', 1),
    pr('El presente Plan será revisado anualmente y actualizado ante cambios en actividades, recursos humanos o tecnología.'),
    hd('16. HISTORIAL DE REVISIONES', 1),
    tbl(['REVISIÓN', 'FECHA', 'DESCRIPCIÓN'], [['01', data.fecha, `Documento inicial para proyecto ${data.proyecto}`]]),
  ]

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      children,
    }],
  })

  return Packer.toBlob(doc)
}

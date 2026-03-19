import { SsomaParSubtipo } from '@prisma/client'
import { SsomaPromptData } from './tipos'

// Helper para construir el contexto base que va en todos los prompts
function contextoBase(d: SsomaPromptData): string {
  const { actividades: a } = d
  return `
EMPRESA: GYS CONTROL INDUSTRIAL SAC — automatización y proyectos electromecánicos, Perú
PROYECTO: ${d.nombreProyecto}
CLIENTE: ${d.cliente}${d.ubicacionProyecto ? ` — ${d.ubicacionProyecto}` : d.planta ? ` — ${d.planta}` : ''}
${d.alcanceTdr ? `ALCANCE: ${d.alcanceTdr.substring(0, 600)}` : ''}
DESCRIPCIÓN DE TRABAJOS: ${d.descripcionTrabajos}
ACTIVIDADES DE ALTO RIESGO PRESENTES:
  - Trabajos eléctricos: ${a.hayTrabajoElectrico ? `SÍ (${a.nivelElectrico === 'media_alta' ? 'media/alta tensión >1kV' : 'baja tensión <1kV'})` : 'No'}
  - Trabajo en altura >1.80m: ${a.hayTrabajoAltura ? 'SÍ (Manlift / andamios / escaleras)' : 'No'}
  - Espacio confinado: ${a.hayEspacioConfinado ? 'SÍ (tanques, cisternas, ductos)' : 'No'}
  - Trabajo en caliente: ${a.hayTrabajoCaliente ? 'SÍ (soldadura, esmerilado, oxicorte)' : 'No'}
${d.equiposProyecto?.length ? `
EQUIPOS A INSTALAR EN ESTE PROYECTO:
${d.equiposProyecto.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}
` : ''}${d.serviciosProyecto?.length ? `
SERVICIOS A EJECUTAR EN ESTE PROYECTO:
${d.serviciosProyecto.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}
` : ''}${d.requerimientos?.length ? `
REQUERIMIENTOS CRÍTICOS DEL CLIENTE:
${d.requerimientos.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}
` : ''}
PREPARADO POR: ${d.ingSeguridad} — Ing. de Seguridad
GESTOR DE PROYECTO: ${d.gestorNombre}
APROBADO POR: ${d.ggNombre} — Gerente General
`.trim()
}

export function buildPromptPETS(d: SsomaPromptData, codigo: string): string {
  return `Eres el Ingeniero de Seguridad de GYS CONTROL INDUSTRIAL SAC.
Genera un PETS (Procedimiento Escrito de Trabajo Seguro) completo y técnico.

${contextoBase(d)}
CÓDIGO DOCUMENTO: ${codigo} | REVISIÓN: 02

IMPORTANTE: Usa los equipos y servicios listados arriba para hacer el PETS específico a este proyecto.
Menciona los equipos reales por modelo y marca cuando sea posible.

ESTRUCTURA OBLIGATORIA — respeta exactamente este orden:

1. ENCABEZADO
   Tabla: PREPARADO POR | REVISADO POR | REVISADO POR | APROBADO POR
   Con nombre, cargo y fecha para cada columna.

2. ALCANCE
   Qué personal aplica, en qué instalaciones del cliente.

3. PERSONAL
   Lista de roles: Supervisor de Proyecto, Supervisor de Seguridad, Ing. de Seguridad,
   Técnicos Electrónicos${d.actividades.hayTrabajoAltura ? ', Técnicos Andamieros, Operador de Manlift, Rigger' : ''}
   ${d.actividades.hayTrabajoCaliente ? ', Soldador certificado' : ''}

4. EQUIPO DE PROTECCIÓN PERSONAL
   Tabla 3 columnas:
   EPP BÁSICO | EPP BIOSEGURIDAD | EPP RIESGO ESPECÍFICO
   Incluir norma técnica para cada ítem: ANSI Z89.1-2014, ANSI Z87+, ANSI S3.19-1974,
   EN12568/ASTM/CSA, ANSI Z359.1, etc.
   ${d.actividades.hayTrabajoCaliente ? 'EPP caliente: careta de esmerilar, guantes de cuero, mandil de cuero, polainas, manta ignifuga' : ''}
   ${d.actividades.hayEspacioConfinado ? 'EPP confinado: detector 4 gases, arnés con anilla dorsal, SCBA o línea de aire' : ''}

5. EQUIPOS / HERRAMIENTAS / MATERIALES
   Tabla 3 columnas con los específicos de las actividades descritas.

6. PROCEDIMIENTO

   6.1 PRÁCTICAS GENERALES PREVIAS
   - Lavado de manos, inspección EPP, código de colores herramientas

   6.2 ACTIVIDADES PREVIAS AL INICIO
   - Inspección EPP (ref. GYS-SST-MEPP-001)
   - Señalización y delimitación del área (conos, barras retráctiles)
   - Comunicación al dueño del área
   - Difusión del PETS al personal (firman constancia)

   6.3 AUTORIZACIONES
   - ART + PETAR firmado por Solicitante, Autorizante, Supervisor Ejecutor, Supervisor SSOMA cliente

   6.4 BLOQUEO DE ENERGÍA (si hayTrabajoElectrico = true)
   - 6 pasos LOTO: Identificar → Apagar → Aislar → Bloquear/Etiquetar →
     Liberar energía residual → Test de energía cero
   - Uso de detector de tensión antes de intervenir
   - Candados y tarjetas de bloqueo por cada técnico

   6.5 PASOS TÉCNICOS POR ACTIVIDAD
   Describe paso a paso las actividades específicas del proyecto:
   montaje de tableros, tendido de tuberías conduit, cableado, conexionado,
   montaje de instrumentos, comisionamiento.
   Cada paso con: QUÉ hacer | CÓMO hacerlo | QUIÉN es responsable
   Describe los pasos técnicos específicos usando los equipos reales del proyecto.
   Por ejemplo: "Montaje de transmisor [modelo específico] en [zona específica]"
   en lugar de descripciones genéricas.

   ${d.actividades.hayTrabajoAltura ? `6.6 TRABAJO EN ALTURA
   - Verificar PETAR de altura firmado
   - Inspección pre-uso de arnés y línea de vida (check-list)
   - Uso de Manlift: check-list pre-operacional, rigger en piso, no sobrecargar,
     arnés anclado a la canasta en todo momento
   - Armado de andamios: relación H/B ≤3:1 interiores, tarjeta verde al liberar,
     barandas y rodapiés en nivel de trabajo
   - No realizar trabajos en altura después de las 4:30pm` : ''}

   ${d.actividades.hayTrabajoCaliente ? `6.7 TRABAJO EN CALIENTE
   - Permiso especial de trabajo en caliente firmado
   - Extintor de 9kg a máximo 10m del punto de trabajo
   - Manta ignifuga para proteger equipos adyacentes
   - Retiro o protección de materiales inflamables en radio de 11m
   - Vigía de fuego durante y 30min después del trabajo` : ''}

   ${d.actividades.hayEspacioConfinado ? `6.8 ESPACIO CONFINADO
   - PETAR de espacio confinado firmado
   - Medición de atmósfera: O2 (19.5%-23.5%), LEL (<10%), CO (<25ppm), H2S (<10ppm)
   - Vigía externo permanente con comunicación directa al interior
   - Nunca ingresar si mediciones fuera de rango
   - Sistema de rescate preparado antes de ingresar (trípode + cabrestante)` : ''}

   FINALIZACIÓN
   - Comunicar al encargado del área
   - Recoger herramientas, verificar operatividad
   - Ordenar y limpiar zona de trabajo
   - Retirar señalización

7. RESTRICCIONES
   Mínimo 15 restricciones específicas y operativas. NO genéricas.
   Incluir restricciones específicas de las actividades de alto riesgo presentes.

Sé técnico y preciso. Usa terminología de automatización industrial. No texto genérico.`
}

export function buildPromptIPERC(d: SsomaPromptData, codigo: string): string {
  return `Eres el Ingeniero de Seguridad de GYS CONTROL INDUSTRIAL SAC.
Genera una IPERC completa siguiendo el DS 024-2016-EM para este proyecto.

${contextoBase(d)}

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin markdown, sin explicaciones. Solo el JSON puro.

El JSON debe tener esta estructura exacta:
{
  "filas": [
    {
      "proceso": "ACTIVIDADES GENERALES",
      "actividad": "Movilización de personal a planta",
      "subActividad": "Traslado en camioneta",
      "puestoTrabajo": "Todo el personal de GYS",
      "factorRiesgo": "FÍSICO",
      "condicion": "Rutinaria",
      "peligro": "Transporte en camioneta",
      "riesgo": "Atropello y Volcadura",
      "consecuencia": "Lesiones graves, politraumatismo y muerte",
      "severidad": 2,
      "probabilidad": "C",
      "eliminar": "NA",
      "sustituir": "NA",
      "controlIngenieria": "Mantenimiento preventivo de la camioneta",
      "controlAdministrativo": "Capacitación en manejo defensivo. Check list pre-uso del vehículo",
      "epp": "Cinturón de seguridad. Casco y barbiquejo",
      "severidadResidual": 3,
      "probabilidadResidual": "D",
      "accionesMejora": "Seguimiento a check list pre-uso",
      "responsable": "Gerente General"
    }
  ]
}

REGLAS para los valores:
- factorRiesgo: "FÍSICO" | "MECÁNICO" | "ELÉCTRICO" | "QUÍMICO" | "ERGONÓMICO" | "BIOLÓGICO" | "LOCATIVO" | "PSICOSOCIAL"
- condicion: "Rutinaria" | "No Rutinaria" | "Emergencia"
- severidad: número del 1 al 5 (1=insignificante, 5=catastrófico)
- probabilidad: letra "A" | "B" | "C" | "D" | "E" (A=casi certeza, E=rara vez)
- eliminar/sustituir: texto del control o "NA" si no aplica
- severidadResidual y probabilidadResidual: después de aplicar controles

TABLA DE VALORACIÓN (para referencia):
La combinación Severidad+Probabilidad determina el nivel:
ALTO: 1A, 1B, 1C, 2A, 2B, 3A
MEDIO: 1D, 2C, 2D, 3B, 3C, 4A, 4B
BAJO: 1E, 2E, 3D, 3E, 4C, 4D, 5A, 5B, 5C, 5D, 5E

ACTIVIDADES OBLIGATORIAS A INCLUIR — MÍNIMO 45 FILAS:

INSTRUCCIÓN CRÍTICA: Usa los equipos y servicios listados en el contexto
para hacer el IPERC específico a este proyecto real.
- En lugar de "montaje de tablero eléctrico" → escribe el nombre exacto del tablero/equipo
- En lugar de "instalación de instrumento" → escribe "instalación de [modelo específico]"
- En lugar de "zona de trabajo" → escribe la zona específica (ZT3, ZPQR, ZRC, etc.) si aplica
- Si hay equipos ATEX o zonas clasificadas → incluir actividades específicas de:
    • Verificación de certificación ATEX de herramientas antes de ingresar a zona clasificada
    • Control de fuentes de ignición en área ATEX (zona 0, 1 o 2)
    • Uso de herramientas antichispa en área clasificada
    • Medición de atmósfera explosiva con detector de gases antes de trabajar

Actividades base a cubrir (adaptar con los equipos/servicios reales del proyecto):
1.  Movilización de personal y materiales a planta cliente
2.  Vigilancia COVID-19 / Dengue (todas las actividades)
3.  Exposición a radiación solar durante trabajos en exterior
4.  Exposición a ruido de equipos de la planta en operación
5.  Trabajos prolongados de pie / posturas forzadas (ergonómico)
6.  Inhalación de partículas de polvo y vapores químicos
7.  Sistema de bloqueo de energía LOTO previo a intervenciones
8.  Traslado y montaje de tableros eléctricos del proyecto
9.  Preparación, corte y roscado de tuberías conduit
10. Tendido de bandejas portacables y tuberías por planta
11. Cableado eléctrico de alimentación y fuerza
12. Tendido de cables de instrumentación y comunicación (Profinet, Modbus)
13. Conexionado en tableros: terminales, borneras, PLC
14. Montaje e instalación de instrumentos de campo (transmisores, switches, sensores)
15. Configuración y programación de PLC/SCADA (sala de control)
16. Pruebas de continuidad, aislamiento y lazo (loop check)
17. Comisionamiento y pruebas de funcionamiento con cliente
18. Orden y limpieza del área de trabajo
19. Exposición a radiación no ionizante de equipos eléctricos en operación
20. Esquirlas y proyección de partículas durante corte de conduit con esmeril
21. Manipulación de herramientas manuales (cortes, golpes)
22. Tránsito de montacargas y vehículos en planta cliente
23. Transitar por áreas con desniveles, rampas y escaleras fijas de planta
24. Exposición a sustancias químicas del proceso del cliente (vapores, derrames)
25. Trabajos prolongados de pie en superficies de concreto (fatiga)
26. Radiación no ionizante de pantallas HMI y equipos de programación
27. Iluminación deficiente en zonas eléctricas y salas de control
28. Potencial contacto con superficies calientes de tuberías de proceso
29. Estrés térmico por trabajo en áreas con equipos de alta temperatura
30. Caída de objetos desde niveles superiores durante trabajos simultáneos
31. Interferencia con operaciones del cliente en planta en marcha
${d.actividades.hayTrabajoElectrico ? `32. Intervención en tableros energizados (verificación)
33. Energización progresiva de tableros nuevos con supervisión` : ''}
${d.actividades.hayTrabajoAltura ? `34. Armado y desarmado de andamios multidireccionales
35. Trabajo en plataforma Manlift para tendido en altura
36. Instalación de bandejas/conduit en zonas elevadas` : ''}
${d.actividades.hayEspacioConfinado ? `37. Medición de atmósfera en espacio confinado antes de ingreso
38. Ingreso y trabajo dentro de tanque o espacio confinado` : ''}
${d.actividades.hayTrabajoCaliente ? `39. Esmerilado de estructuras metálicas y tuberías
40. Soldadura de soportes y estructuras de soporte` : ''}
41. Exposición a fatiga mental por trabajo técnico repetitivo (psicosocial)
42. Transporte de equipos pesados con montacarga dentro de planta
43. Potencial derrame de aceite dieléctrico o sustancias de equipos
44. Trabajos en días de calor extremo (>30°C) en exterior
45. Exposición a ruido por zona: distinguir ruido de planta cliente vs ruido propio de obra

Genera EXACTAMENTE el JSON solicitado con MÍNIMO 55 filas.
Cada actividad principal debe tener al menos 2 sub-actividades.
Es crítico que el array filas tenga al menos 55 objetos.
No repitas peligros — cada fila debe ser un riesgo distinto.
No incluyas texto antes ni después del JSON.`
}

export function buildPromptMatrizEPP(d: SsomaPromptData, codigo: string): string {
  return `Eres el Ingeniero de Seguridad de GYS CONTROL INDUSTRIAL SAC.
Genera la Matriz de EPP (Equipos de Protección Personal) por puesto.

${contextoBase(d)}
CÓDIGO DOCUMENTO: ${codigo}

Para cada cargo genera una sección con este formato:

═══════════════════════════════════
CARGO: [nombre del cargo]
═══════════════════════════════════
EPP BÁSICO:
  • [ítem] — [norma técnica aplicable]
  • ...
EPP BIOSEGURIDAD:
  • [ítem]
  • ...
EPP RIESGO ESPECÍFICO:
  • [ítem] — [norma técnica]
  • ...

CARGOS A INCLUIR (siempre):
1. Supervisor de Proyecto
2. Supervisor de Seguridad / Ing. de Seguridad
3. Técnico Electrónico

CARGOS ADICIONALES según actividades:
${d.actividades.hayTrabajoAltura ? `4. Técnico Andamiero — EPP altura: arnés 3 argollas ANSI Z359.1, línea doble gancho + block retráctil
5. Operador de Manlift — arnés anclado a canasta en todo momento
6. Rigger — guantes de señalero, chaleco reflectivo` : ''}
${d.actividades.hayTrabajoCaliente ? `7. Soldador / Operario Caliente — careta de esmerilar, guantes cuero, mandil cuero, polainas, manta ignifuga` : ''}
${d.actividades.hayEspacioConfinado ? `8. Vigía de Espacio Confinado — detector 4 gases, radio comunicación
9. Operario Espacio Confinado — SCBA o línea de aire, arnés anilla dorsal` : ''}

NORMAS TÉCNICAS A REFERENCIAR:
- Casco: ANSI Z89.1-2014 Tipo 1 Clase E con barbiquejo
- Lentes: ANSI Z87+
- Protección auditiva: ANSI S3.19-1974
- Calzado: EN12568/ASTM/CSA (dieléctrico si hay trabajo eléctrico)
- Arnés: ANSI Z359.1 (3 argollas para altura)
- Respirador media cara con filtro GMC-P100: para químicos/vapores
- Guantes dieléctricos: si trabajo eléctrico en media/alta tensión
- Traje Tyvek: para zonas con productos químicos`
}

export function buildPromptPlanEmergencia(d: SsomaPromptData, codigo: string): string {
  return `Eres el Ingeniero de Seguridad de GYS CONTROL INDUSTRIAL SAC.
Genera el Plan de Respuesta a Emergencias completo y adaptado al proyecto.

${contextoBase(d)}
CÓDIGO DOCUMENTO: ${codigo} | REVISIÓN: 01

ESTRUCTURA OBLIGATORIA:

1. INTRODUCCIÓN Y ALCANCE
   Aplica a todos los proyectos en instalaciones del cliente ${d.cliente}.

2. OBJETIVOS
   General + 4 objetivos específicos.

3. REFERENCIAS LEGALES
   - Ley N° 29783 — Ley de Seguridad y Salud en el Trabajo
   - DS N° 005-2012-TR — Reglamento de la Ley SST
   ${d.actividades.hayTrabajoElectrico ? '- RM N° 111-2013-MEM — Reglamento SST con Electricidad' : ''}
   - Ley N° 28551 — Obligación de elaborar Planes de Contingencia
   - Ley 29664 — SINAGERD

4. IDENTIFICACIÓN DE EMERGENCIAS
   Tabla por origen:
   NATURAL: sismos (Alto en Lima), inundaciones/huaycos (Medio)
   TECNOLÓGICO: accidentes personales (Alto en servicios), electrocución${d.actividades.hayTrabajoElectrico ? ' (Medio)' : ' (Bajo)'}, incendios (Medio)
   ${d.actividades.hayTrabajoAltura ? 'Accidentes en altura (Alto)' : ''}
   ${d.actividades.hayEspacioConfinado ? 'Accidentes en espacio confinado (Alto)' : ''}
   ${d.actividades.hayTrabajoCaliente ? 'Incendio por trabajo en caliente (Medio)' : ''}
   POR TERCEROS: actos delictivos (Medio en servicios)

5. NIVELES DE EMERGENCIA
   TIPO I: Controlada por el personal del área sin brigada.
     Ejemplo: amago de incendio extinguido con extintor, herida leve
   TIPO II: Requiere brigada de emergencia + posible apoyo externo.
     Ejemplo: ${d.actividades.hayTrabajoAltura ? 'caída en altura con lesión,' : ''} accidente con atención médica
   TIPO III: Capacidad superada, apoyo externo obligatorio.
     Ejemplo: ${d.actividades.hayTrabajoAltura ? 'caída fatal en altura,' : ''} incendio descontrolado, víctima atrapada

6. ORGANIZACIÓN ANTE EMERGENCIAS
   Roles: Jefe de Brigada (Líder del Servicio), Brigada Evacuación/Rescate,
   Brigada Lucha contra Incendio, Brigada Primeros Auxilios.
   Tabla de responsabilidades por nivel I/II/III.

7. SISTEMA DE COMUNICACIÓN
   Nivel I: Personal controla + informa al Jefe de Brigada
   Nivel II: Cualquier trabajador avisa al Jefe de Brigada → activa brigada
   Nivel III: Jefe de Brigada solicita apoyo externo + activa Comité de Emergencias

   DIRECTORIO GYS:
   - ${d.ingSeguridad} (Ing. Seguridad)
   - ${d.ggNombre} (Gerente General)

   DIRECTORIO EMERGENCIAS EXTERNAS:
   - Bomberos: 116
   - SAMU: 106
   - Defensa Civil: 115
   - Cruz Roja: 01 266 0481
   - Alerta Médica: 01 261 8783

8. PROTOCOLOS DE RESPUESTA

   8.1 PRIMEROS AUXILIOS GENERALES
   Hemorragias (arterial/venosa/nasal), quemaduras (1°/2°/3° grado),
   fracturas (inmovilización + traslado), RCP (30 compresiones : 2 respiraciones),
   envenenamiento/intoxicación.

   ${d.actividades.hayTrabajoElectrico ? `8.2 ELECTROCUCIÓN
   1. Gritar "CORTE DE ENERGÍA" — no tocar a la víctima sin aislar
   2. Cortar interruptor aguas arriba o usar elemento no conductor para separar
   3. Si en altura: preparar colchón/manta antes de cortar corriente
   4. Aplicar RCP si no hay pulso
   5. Trasladar a centro médico — reportar a SCTR Pacífico` : ''}

   ${d.actividades.hayTrabajoAltura ? `8.3 CAÍDA / SUSPENSIÓN EN ALTURA
   1. Comunicar inmediatamente al Ing. de Seguridad
   2. Hablar con la víctima para mantener calma — no improvisar rescate
   3. Rescate dentro de los primeros 15 minutos (síndrome de arnés)
   4. Post-rescate: NO acostar horizontal de inmediato
      → posición semi-sentado con piernas hacia adelante
   5. Monitorear signos vitales, trasladar a centro médico
   6. Solo personal capacitado en rescate en altura puede ejecutar el rescate` : ''}

   ${d.actividades.hayEspacioConfinado ? `8.4 EMERGENCIA EN ESPACIO CONFINADO
   1. NUNCA ingresar sin medir atmósfera primero
   2. El vigía llama al Jefe de Brigada — NO ingresar a rescatar sin equipo SCBA
   3. Usar trípode + cabrestante para extracción
   4. Post-rescate: posición semi-sentado, monitorear constantemente
   5. Solicitar bomberos si el rescate supera la capacidad del equipo` : ''}

   ${d.actividades.hayTrabajoCaliente ? `8.5 AMAGO DE INCENDIO POR TRABAJO EN CALIENTE
   1. Gritar "FUEGO" — activar alarma
   2. Si es controlable: usar extintor PQS (técnica PASS)
      → siempre con el viento a favor, nunca en contra
   3. Si no es controlable en 30 segundos: evacuar y llamar Bomberos 116
   4. Vigía de fuego permanece 30min adicionales después del trabajo` : ''}

   8.X SISMO
   - Si está en altura: permanecer en posición fija, aferrado a la estructura
   - Si está en el piso: alejarse de estantes y objetos que puedan caer
   - Al cesar el sismo: dirigirse al punto de reunión del cliente
   - No usar ascensores

   8.X+1 INCENDIO GENERAL
   Técnica PASS con extintor: Pull (jalar seguro), Aim (apuntar a la base),
   Squeeze (presionar), Sweep (barrer de lado a lado).
   Toda utilización parcial de extintor obliga a su reemplazo inmediato.

9. EQUIPOS Y MATERIALES DE EMERGENCIA
   Botiquín (según G050 Anexo B), extintores PQS 9kg, arnés de seguridad,
   línea de vida con block retráctil, camilla rígida, teléfonos celulares con saldo.

10. ENTRENAMIENTO Y SIMULACROS
    Capacitación en primeros auxilios, uso de extintores, rescate en altura (si aplica).
    Participación en simulacros INDECI.`
}

export function buildPromptPAR(
  d: SsomaPromptData,
  subtipo: SsomaParSubtipo,
  codigo: string
): string {
  const prompts: Record<SsomaParSubtipo, string> = {

    ELECTRICO: `Eres el Ingeniero de Seguridad de GYS CONTROL INDUSTRIAL SAC.
Genera el Procedimiento de Alto Riesgo para Trabajos Eléctricos.

${contextoBase(d)}
CÓDIGO DOCUMENTO: ${codigo} | REVISIÓN: 01
NIVEL TENSIÓN: ${d.actividades.nivelElectrico === 'media_alta' ? 'Media/Alta tensión (>1kV) — ZONA DE PELIGRO' : 'Baja tensión (<1kV)'}

ESTRUCTURA:

1. OBJETIVO Y ALCANCE
   Trabajos en instalaciones eléctricas en ${d.cliente} — ${d.planta}.
   Aplica: montaje de tableros, cableado, conexionado, pruebas.

2. REFERENCIAS LEGALES
   RM N° 111-2013-MEM, Ley 29783, DS 005-2012-TR, NFPA 70E

3. DEFINICIONES
   Trabajo en tensión, trabajo sin tensión, zona de peligro, zona de proximidad,
   LOTO (Lockout/Tagout), energía residual, arco eléctrico, EPP dieléctrico.

4. RESPONSABILIDADES
   Supervisor de Proyecto, Supervisor de Seguridad, Técnico Eléctrico/Electrónico

5. REQUISITOS PREVIOS
   - Certificación de trabajo eléctrico vigente
   - Aptitud médica vigente
   - Autorización escrita del cliente (PETAR eléctrico)
   - EPP dieléctrico inspeccionado

6. PROCEDIMIENTO

   6.1 CONTROL DE ENERGÍA CERO — 6 PASOS LOTO
   PASO 1 — IDENTIFICAR: Localizar todas las fuentes de energía del equipo/circuito
   PASO 2 — APAGAR: Apagar el equipo usando los controles normales
   PASO 3 — AISLAR: Abrir el interruptor/seccionador de aislamiento
   PASO 4 — BLOQUEAR Y ETIQUETAR:
     → Colocar candado personal de bloqueo (uno por técnico)
     → Colocar tarjeta de advertencia: "NO OPERAR — Personal trabajando"
     → Si hay varios técnicos: cada uno coloca su propio candado
   PASO 5 — LIBERAR ENERGÍA RESIDUAL:
     → Descargar condensadores, verificar que no hay presión hidráulica/neumática
     → Esperar tiempo de descarga según el equipo
   PASO 6 — TEST DE ENERGÍA CERO:
     → Usar detector de tensión en los tres polos (L1, L2, L3)
     → Verificar en todos los puntos de trabajo
     → NUNCA iniciar el trabajo sin completar este paso

   6.2 TRABAJOS EN TABLEROS Y PANEL ELÉCTRICO
   - Delimitar área con conos y barras retráctiles
   - Verificar ausencia de tensión en terminales donde se va a trabajar
   - Usar herramientas con aislamiento 1000V
   - Guantes dieléctricos clase 00 mínimo para baja tensión
   ${d.actividades.nivelElectrico === 'media_alta' ? `- Para media/alta tensión: pértiga de maniobra, guantes clase 2 (17kV), botas dieléctricas
   - Distancias mínimas: 300V-50kV=3m, 50kV-200kV=5m, 200kV-350kV=6m` : ''}
   - Conexión equipotencial antes de trabajar en cables de alta capacidad

   6.3 TENDIDO Y CONEXIONADO DE CABLES
   - Verificar sección del cable según carga (tabla de secciones)
   - Pelado de cable: usar pelacables, no cutter
   - Prensado de terminales: usar prensaterminal calibrado
   - Torque de apriete según especificación del fabricante del tablero
   - Identificar y etiquetar cada conductor antes de conectar

   6.4 PRUEBAS DE CONTINUIDAD Y AISLAMIENTO
   - Megóhmetro para prueba de aislamiento (1000V DC, mínimo 1MΩ)
   - Multímetro para continuidad y verificación de circuitos
   - Prueba de cortocircuito en frío antes de energizar
   - Energización gradual con supervisor presente

7. EPP ELÉCTRICO ESPECÍFICO
   - Casco dieléctrico clase E (ANSI Z89.1-2014)
   - Guantes dieléctricos clase 00 (hasta 500V) o clase 2 (hasta 17kV)
   - Calzado dieléctrico EN12568/ASTM/CSA
   - Lentes de seguridad ANSI Z87+ (protección arco eléctrico)
   - Ropa algodón 100% (no sintética — riesgo de derretirse con arco)
   ${d.actividades.nivelElectrico === 'media_alta' ? '- Careta de arco eléctrico cal. 8 cal/cm² mínimo\n   - Manga ignifuga' : ''}

8. RESTRICCIONES
   - PROHIBIDO trabajar en sistemas energizados sin autorización y EPP dieléctrico completo
   - PROHIBIDO usar herramientas sin aislamiento en zonas eléctricas
   - PROHIBIDO retirar candado de otro técnico
   - PROHIBIDO energizar sin verificar que todo el personal está fuera del área de peligro
   - PROHIBIDO trabajar solo en tableros eléctricos
   - PROHIBIDO puentes o bypass de protecciones (fusibles, breakers)
   - PROHIBIDO modificar cableado sin planos aprobados
   - No iniciar sin PETAR firmado
   - No trabajar en condiciones de humedad sin EPP adecuado
   - Mínimo 2 personas para trabajos en tableros MT/AT`,

    ALTURA: `Eres el Ingeniero de Seguridad de GYS CONTROL INDUSTRIAL SAC.
Genera el Procedimiento de Alto Riesgo para Trabajo en Altura.

${contextoBase(d)}
CÓDIGO DOCUMENTO: ${codigo} | REVISIÓN: 01
Trabajo en altura: Todo trabajo a partir de 1.80m sobre nivel del piso o diferente nivel.

ESTRUCTURA:

1. OBJETIVO Y ALCANCE
   Criterios de prevención y control para trabajos ≥1.80m.
   Incluye: uso de Manlift, andamios multidireccionales, escaleras.

2. REFERENCIAS LEGALES
   Ley 29783, DS 005-2012-TR, G050, ANSI Z359.1, ANSI A10.11

3. DEFINICIONES
   Trabajo en altura, punto de anclaje (debe resistir 2270kg/5000lb por trabajador),
   arnés de cuerpo entero (ANSI Z359.1), línea de anclaje (soporta 2270kg/22kN),
   línea de vida, block retráctil, PETAR, ATS, correa anti-trauma.

4. RESPONSABILIDADES
   Gerencia de Proyecto, Supervisor SGI, Operador Manlift, Técnico Andamiero, Trabajador

5. REQUISITOS PRIMARIOS
   5.1 Habilitación: fotocheck autorización TAR + certificado curso TAR vigente
   5.2 Aptitud médica: DS N°024-2016-EM Art.134 — descartar neurológicas, obesidad,
       déficit miembros, trastorno equilibrio, alcoholismo, psiquiátricas
   5.3 Capacitación anual verificada

6. PROCEDIMIENTO

   6.1 ANÁLISIS PREVIO
   - Seleccionar equipo de acceso correcto: Manlift para >3m en espacio abierto,
     andamio para trabajo prolongado en punto fijo, escalera solo para accesos rápidos <3m
   - PETAR de altura firmado antes de iniciar
   - Verificar condiciones climáticas (no trabajar con viento >60km/h o lluvia)

   6.2 INSPECCIÓN DE EPP DE ALTURA
   - Arnés: costuras, hebillas, anillas D, fecha de fabricación (máx 5 años)
   - Línea de vida doble: ganchos de seguridad, absorbedor de impacto, longitud
   - Block retráctil: mecanismo de bloqueo, carcasa sin daños
   - NO usar EPP de altura caído desde más de 1.5m — retirar del servicio

   6.3 USO DEL MANLIFT
   Check-list pre-operacional:
   □ Controles de emergencia funcionando
   □ Dispositivos de seguridad (alarma de inclinación, paradas de emergencia)
   □ Sistema hidráulico sin fugas
   □ Superficie de la canasta libre de aceite/barro
   □ Nivel de combustible/batería
   □ Neumáticos en buen estado

   Operación:
   - Arnés anclado a punto de anclaje de la canasta — SIEMPRE, incluso si está parado
   - Rigger en piso durante todo el movimiento del equipo
   - No sobrecargar: respetar capacidad del fabricante (generalmente 230-250kg)
   - No extender el brazo más allá de las barandas
   - Velocidad reducida en terrenos irregulares
   - No usar como equipo de izaje de cargas
   - Actividades de altura no se extienden después de las 4:30pm

   Distancias mínimas a líneas eléctricas:
   0-300V: evitar contacto | 300V-50kV: 3m | 50kV-200kV: 5m
   200kV-350kV: 6m | 350kV-500kV: 8m | 500kV-700kV: 11m | >700kV: 14m

   6.4 ARMADO DE ANDAMIO MULTIDIRECCIONAL
   Actividades previas: determinar altura, tipo de modulación, seleccionar piezas.
   Armado paso a paso:
   1. Tornillos niveladores sobre base collar
   2. Conectar collarines con horizontales (verificar nivel)
   3. Instalar verticales en la base del collarín
   4. Unir verticales con horizontales cada 2m máximo
   5. Instalar diagonales en ranuras grandes de la roseta
   6. Instalar plataforma y escalera de acceso
   7. Barandas y rodapiés en el nivel de trabajo
   Relación estabilidad: H/B ≤ 3:1 interiores, ≤ 4:1 exteriores
   Tarjetas de liberación: VERDE = listo, AMARILLO = con restricciones, ROJO = en proceso

   6.5 USO DE ESCALERAS
   - Inspección pre-uso obligatoria (check-list)
   - Prohibido usar para alturas >5m
   - No acceder a los últimos 2 peldaños
   - Ángulo de inclinación: 75° (relación 1:4 base/altura)
   - Si no puede fijarse: segundo trabajador sosteniendo la base
   - Escaleras tijera: nunca como escalera recta, siempre completamente abierta

   6.6 PROCEDIMIENTO DE RESCATE EN ALTURA
   1. Asegurar el área — señalizar y cerrar accesos
   2. Comunicar al Ing. de Seguridad y definir método de rescate
   3. Acceso al accidentado sin improvisar
   4. Estabilización — hablar con la víctima para mantener calma
   5. Descenso controlado usando freno de cuerda
   6. Post-rescate: NO acostar horizontal — posición semi-sentado
      (previene síndrome post-suspensión por redistribución sanguínea)
   7. Traslado urgente a centro médico
   Tiempo máximo de suspensión tolerable: 15 minutos

7. RESTRICCIONES
   - PROHIBIDO trabajar en altura sin arnés anclado
   - PROHIBIDO usar EPP de altura en mal estado o vencido
   - PROHIBIDO pararse sobre las barandas del Manlift
   - PROHIBIDO salir del canastillo mientras está en altura
   - PROHIBIDO armar andamios artesanales o sin certificación
   - PROHIBIDO usar barandas de andamio como punto de anclaje
   - PROHIBIDO trabajar en altura con lluvia, viento >60km/h o visibilidad reducida
   - No trabajar solo en altura — mínimo 2 personas
   - No exceder capacidad de carga de plataformas ni Manlift
   - No realizar rescates improvisados sin entrenamiento previo`,

    ESPACIO_CONFINADO: `Eres el Ingeniero de Seguridad de GYS CONTROL INDUSTRIAL SAC.
Genera el Procedimiento de Alto Riesgo para Trabajo en Espacio Confinado.

${contextoBase(d)}
CÓDIGO DOCUMENTO: ${codigo} | REVISIÓN: 01

ESTRUCTURA:

1. OBJETIVO Y ALCANCE
   Control de riesgos en espacios con acceso restringido, no diseñados para ocupación continua.
   Aplica: tanques, cisternas, ductos, fosos, cámaras de inspección.

2. REFERENCIAS LEGALES
   Ley 29783, DS 005-2012-TR, ANSI Z117.1, OSHA 29 CFR 1910.146

3. DEFINICIONES
   Espacio confinado de entrada permitida vs no permitida.
   Atmósfera peligrosa: O2 <19.5% o >23.5%, LEL >10%, CO >25ppm, H2S >10ppm.
   Vigía, rescatista, autorizado para entrada.

4. RESPONSABILIDADES
   Supervisor de Proyecto, Supervisor de Seguridad, Vigía (permanente afuera), Operario

5. PROCEDIMIENTO

   5.1 EVALUACIÓN PREVIA
   - Identificar tipo de espacio: ¿requiere PETAR de espacio confinado?
   - Revisar historial del espacio (qué contenía, limpieza previa)
   - Ventilación forzada mínimo 5 minutos antes de medición

   5.2 MEDICIÓN DE ATMÓSFERA (OBLIGATORIO antes de cada ingreso)
   Secuencia de medición con detector de 4 gases:
   □ Oxígeno (O2): rango seguro 19.5% – 23.5%
   □ Explosividad (LEL): máximo 10%
   □ Monóxido de carbono (CO): máximo 25 ppm
   □ Sulfuro de hidrógeno (H2S): máximo 10 ppm
   Si cualquier parámetro está fuera de rango: NO INGRESAR.
   Ventilar y medir nuevamente. Registrar lecturas en PETAR.

   5.3 SISTEMA DE RESCATE — preparar ANTES de ingresar
   - Trípode sobre la entrada con cabrestante operativo
   - Arnés de rescate con anilla dorsal colocado al trabajador
   - Línea de vida conectada al cabrestante
   - Comunicación radial vigía-interior activa

   5.4 INGRESO
   - Máximo 2 personas dentro del espacio a la vez
   - Vigía permanece afuera EN TODO MOMENTO — nunca abandona su posición
   - Monitoreo continuo de atmósfera cada 15 minutos dentro del espacio
   - Si la medición baja de límites: salir inmediatamente

   5.5 DURANTE EL TRABAJO
   - Ventilación forzada continua si se usa herramientas eléctricas o de combustión
   - No usar equipos de combustión interna dentro del espacio
   - Iluminación: usar linternas de bajo voltaje o neumáticas

   5.6 EMERGENCIA EN ESPACIO CONFINADO
   - Vigía activa la alarma y llama al Jefe de Brigada
   - NUNCA ingresar a rescatar sin SCBA — esta es la causa #1 de doble víctima
   - Usar trípode y cabrestante para extracción
   - Solicitar Bomberos (116) si el rescate supera la capacidad del equipo
   - Post-rescate: posición semi-sentado, monitorear signos vitales

6. RESTRICCIONES
   - PROHIBIDO ingresar sin medición de atmósfera previa documentada
   - PROHIBIDO ingresar sin vigía permanente afuera
   - PROHIBIDO ingresar solo
   - PROHIBIDO al vigía abandonar su posición durante el trabajo
   - PROHIBIDO ingresar a rescatar sin SCBA si hay atmósfera peligrosa
   - PROHIBIDO usar equipos de combustión interna dentro del espacio
   - No iniciar sin PETAR de espacio confinado firmado`,

    TRABAJO_CALIENTE: `Eres el Ingeniero de Seguridad de GYS CONTROL INDUSTRIAL SAC.
Genera el Procedimiento de Alto Riesgo para Trabajo en Caliente.

${contextoBase(d)}
CÓDIGO DOCUMENTO: ${codigo} | REVISIÓN: 01
Trabajo en caliente: toda actividad que genera llamas, chispas o calor. Incluye:
soldadura (MIG, TIG, eléctrica), oxicorte, esmerilado, amolado.

ESTRUCTURA:

1. OBJETIVO Y ALCANCE

2. REFERENCIAS LEGALES
   Ley 29783, DS 005-2012-TR, NFPA 51B (Standard for Fire Prevention During Welding)

3. DEFINICIONES
   Trabajo en caliente, permiso de trabajo en caliente, vigía de fuego,
   zona de exclusión (radio 11m de materiales inflamables).

4. RESPONSABILIDADES

5. REQUISITOS PREVIOS
   - Permiso especial de trabajo en caliente firmado (adicional al ART/PETAR)
   - Verificar radio de 11m libre de materiales inflamables/combustibles
   - Si no es posible retirar materiales: proteger con mantas ignifugas certificadas
   - Extintor de 9kg PQS a máximo 10m del punto de trabajo (verificado y cargado)
   - Vigía de fuego designado con extintor en mano durante todo el trabajo

6. PROCEDIMIENTO

   6.1 PREPARACIÓN DEL ÁREA
   - Delimitar zona de trabajo con conos y cinta de seguridad
   - Retirar o proteger todo material inflamable en radio 11m
   - Verificar que no hay materiales inflamables en el nivel inferior
     (las chispas caen y pueden iniciar fuego abajo)
   - Si hay drenajes cerca: sellarlos para evitar acumulación de chispas

   6.2 ESMERILADO / AMOLADO
   EPP: careta de esmerilar (no solo lentes), guantes de cuero, mandil de cuero,
        polainas, ropa algodón 100%
   - Inspeccionar disco antes de usar: sin grietas, fisuras o deformaciones
   - Velocidad máxima del disco respetada (marcada en el disco)
   - Protección del disco instalada y posicionada correctamente
   - No forzar el disco en ángulos no diseñados
   - Disco de corte solo para cortar — no usar de lado

   6.3 SOLDADURA ELÉCTRICA (MIG/TIG/SMAW)
   EPP: careta de soldar (oscurecimiento mínimo DIN 11), guantes de cuero largos,
        mandil de cuero, polainas, zapatos de cuero (no sintético)
   - Verificar que el equipo de soldar está en buen estado (cables, pinza, masa)
   - Conexión a tierra del equipo antes de iniciar
   - No realizar soldadura en recipientes que hayan contenido inflamables
   - Cables sin empalmes expuestos, portaelectrodo aislado

   6.4 OXICORTE
   - Verificar mangueras: sin fisuras, conexiones apretadas, manómetros funcionando
   - Válvulas de retorno de llama instaladas en ambas líneas
   - Cilindros en posición vertical, asegurados con cadena
   - Distancia mínima entre cilindros de oxígeno y acetileno: 6m
     (o separador de 1.5m de altura)

   6.5 VIGÍA DE FUEGO
   - Presente durante TODO el trabajo en caliente
   - Permanece en el área 30 MINUTOS ADICIONALES después de terminar
     (las chispas pueden encender materiales que siguen calientes)
   - Extintor en mano — no en el piso, en mano
   - Si detecta amago: actuar inmediatamente con extintor y dar la voz de alarma

   6.6 FINALIZACIÓN
   - Asegurarse que todas las superficies tratadas se han enfriado
   - Inspección visual del área por 30 minutos post-trabajo
   - Verificar que no quedan brasas o materiales encendidos

7. RESTRICCIONES
   - PROHIBIDO trabajo en caliente sin permiso específico firmado
   - PROHIBIDO trabajo en caliente sin extintor y vigía de fuego presentes
   - PROHIBIDO usar discos de esmeril con fisuras o dañados
   - PROHIBIDO soldar recipientes que hayan contenido materiales inflamables sin limpieza certificada
   - PROHIBIDO retirar la protección del disco de esmeril
   - PROHIBIDO trabajo en caliente cerca de materiales inflamables sin protección con mantas ignifugas
   - No trabajar solo en operaciones de oxicorte
   - No mezclar mangueras de oxígeno y acetileno`,
  }

  return prompts[subtipo]
}

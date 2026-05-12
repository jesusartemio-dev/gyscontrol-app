export interface ControlCatalogo {
  tipoPeligro: 'BIOLÓGICO' | 'FÍSICO' | 'QUÍMICO' | 'BIOMECÁNICO'
             | 'CONDICIONES DE SEGURIDAD' | 'PSICOSOCIAL' | 'FENOMENOS NATURALES'
  jerarquia: 'eliminar' | 'sustituir' | 'ingenieria' | 'administrativo' | 'epp'
  texto: string
}

export const CONTROLES_CATALOGO: ControlCatalogo[] = [
  // BIOLÓGICO (10)
  { tipoPeligro: 'BIOLÓGICO', jerarquia: 'epp', texto: 'Uso de EPP' },
  { tipoPeligro: 'BIOLÓGICO', jerarquia: 'administrativo', texto: 'Contar con esquema de vacunación.' },
  { tipoPeligro: 'BIOLÓGICO', jerarquia: 'administrativo', texto: 'Implementar programa de orden y aseo en sitio de trabajo.' },
  { tipoPeligro: 'BIOLÓGICO', jerarquia: 'ingenieria', texto: 'Sanitizar con recursos e insumos apropiados los ambientes de trabajo.' },
  { tipoPeligro: 'BIOLÓGICO', jerarquia: 'ingenieria', texto: 'Evitar depósito de aguas limpias y sucias.' },
  { tipoPeligro: 'BIOLÓGICO', jerarquia: 'administrativo', texto: 'Implementar programa control de plagas.' },
  { tipoPeligro: 'BIOLÓGICO', jerarquia: 'administrativo', texto: 'Implementar medidas de bioseguridad y barreras de protección.' },
  { tipoPeligro: 'BIOLÓGICO', jerarquia: 'administrativo', texto: 'Eliminar correctamente desechos orgánicos.' },
  { tipoPeligro: 'BIOLÓGICO', jerarquia: 'administrativo', texto: 'Aplicación de procedimientos seguros.' },
  { tipoPeligro: 'BIOLÓGICO', jerarquia: 'administrativo', texto: 'Señalización que indique riesgo biológico' },

  // FÍSICO (30)
  { tipoPeligro: 'FÍSICO', jerarquia: 'epp', texto: 'Uso de elementos de protección personal EPP' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'epp', texto: 'Proteger la cabeza y la cara con gorros de ala ancha o viseras.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Cambie las condiciones del lugar de trabajo' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'administrativo', texto: 'Proveer área de descanso' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'epp', texto: 'Cerciórese que los trabajadores se pongan ropa protectora' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Ambientes ventilados, hidratación.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Aislamientos térmicos del puesto de trabajo.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Controlar en ambientes los límites permisibles de alta o baja temperatura y tiempos de exposición.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'epp', texto: 'Uso de EPP' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'administrativo', texto: 'Realizar exámenes ingreso, periódicos, egreso.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Aislar fuentes generadoras de ruido.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'administrativo', texto: 'Capacitación en conservación auditiva.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Mediciones ambientales.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'administrativo', texto: 'Aplicación de procedimientos seguros.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Controlar en ambientes los límites permisibles de ruido y tiempo de exposición con protección auditiva.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Mediciones de niveles de iluminación.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Mayor iluminación natural que artificial.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Control de resplandores y reflejos.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Cantidad y calidad de luz acorde a la labor a realizar.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Eliminar las superficies brillantes.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Fuentes de luz libres de obstáculos.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'administrativo', texto: 'Exámenes médicos ocupacionales.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'administrativo', texto: 'Exámenes médicos ocupacionales. Aplicación de procedimientos seguros.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'administrativo', texto: 'Reducir el tiempo de exposición, rotación del personal.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Minimizar la intensidad de las vibraciones.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Mediciones de vibración en el puesto de trabajo' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'administrativo', texto: 'Efectuar pausas aproximadamente a 10 minutos por cada hora de trabajo.' },
  { tipoPeligro: 'FÍSICO', jerarquia: 'ingenieria', texto: 'Aislamiento elástico de las máquinas evitando la transmisión de las vibraciones a las estructuras.' },

  // QUÍMICO (9)
  { tipoPeligro: 'QUÍMICO', jerarquia: 'epp', texto: 'Uso de EPP' },
  { tipoPeligro: 'QUÍMICO', jerarquia: 'administrativo', texto: 'Cumplir indicaciones de hojas de seguridad de productos químicos.' },
  { tipoPeligro: 'QUÍMICO', jerarquia: 'administrativo', texto: 'Comprar insumos de menor afectación a la salud.' },
  { tipoPeligro: 'QUÍMICO', jerarquia: 'administrativo', texto: 'Almacenamiento seguro, químicos etiquetados y rotulados.' },
  { tipoPeligro: 'QUÍMICO', jerarquia: 'administrativo', texto: 'Áreas de uso y almacenamiento de marcadas y señalizadas.' },
  { tipoPeligro: 'QUÍMICO', jerarquia: 'ingenieria', texto: 'Eliminación segura de desechos.' },
  { tipoPeligro: 'QUÍMICO', jerarquia: 'administrativo', texto: 'Lava ojos y duchas de seguridad cerca al sitio de manipulación.' },
  { tipoPeligro: 'QUÍMICO', jerarquia: 'administrativo', texto: 'Rotación del personal, disminuir el tiempo de exposición.' },
  { tipoPeligro: 'QUÍMICO', jerarquia: 'administrativo', texto: 'Exámenes médicos ocupacionales periódicos.' },

  // BIOMECÁNICO (15)
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Implementar pausas activas.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'ingenieria', texto: 'Diseño ergonómico del puesto de trabajo.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Realizar las tareas evitando las posturas incómodas del cuerpo.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'ingenieria', texto: 'Reducir la fuerza que se emplea en ciertas tareas.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'ingenieria', texto: 'Mejorar técnicas de trabajo.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Rotación de trabajadores.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Aplicación de procedimientos seguros.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Ejercicios de estiramiento y pausas activas. Exámenes médicos ingreso, periódicos y de egreso.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Capacitación en manipulación adecuada de cargas e higiene postural.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Trabajar en equipo, utilizar ayudas mecánicas.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Durante la manipulación de cargas no utilizar accesorios en manos y brazos.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Identificar y verificar peso del material a manipular.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Capacitación al personal en identificación y control de peligros y riesgos.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'ingenieria', texto: 'Reducción o rediseño de la carga.' },
  { tipoPeligro: 'BIOMECÁNICO', jerarquia: 'administrativo', texto: 'Aplicación de procedimientos seguros.' },

  // CONDICIONES DE SEGURIDAD (82)
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'epp', texto: 'Uso de EPP' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Herramienta, maquinaria y equipos de calidad' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Capacitación en cuidado de manos y cuerpo.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Reconocer las medidas de seguridad y alarmas del equipo manipulado.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Autoreporte de condiciones inseguras.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'ingenieria', texto: 'Mantenimiento preventivo de herramienta, maquinaria y equipos.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Inspecciones preoperacionales a herramienta, maquinaria y equipos.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Realizar capacitación de inducción, periódica técnica y de seguridad.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Aplicación de medidas de seguridad en manipulación de herramienta, maquinaria y equipos de trabajo.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Identificación y control de peligros y riesgos.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Aplicación de procedimientos seguros.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Evitar uso elementos conductores de electricidad.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Aplicar el reglamento técnico de instalaciones eléctricas RETIE' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Aplicar las 5 reglas de oro para trabajar con energía peligrosas: cortar todas las fuentes de tensión, bloqueo y tarjeteo, verificación de ausencia de tensión, puesta a tierra, señalización.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Uso de herramientas de trabajo aisladoras.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Análisis de riesgo de tareas que impliquen trabajos con energía peligrosas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Inspecciones preoperacionales a instalaciones, herramienta, maquinaria y equipos.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Capacitación seguimiento y control a la aplicación de procedimientos seguros.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Implementar programa de orden y aseo en todas las áreas de trabajo. Realizar inspecciones de seguridad, orden y aseo.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Gestión oportuna a las condiciones inseguras identificadas en las inspecciones.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'ingenieria', texto: 'Realizar mantenimiento oportuno a infraestructura.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Áreas de almacenamiento seguras.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Áreas de circulación de personas y equipos señalizadas, demarcadas y despejadas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'ingenieria', texto: 'Superficies, pisos, secos, sin obstáculos, ni irregulares' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'ingenieria', texto: 'Áreas de circulación y trabajo con iluminación suficiente y de calidad' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Capacitación en ambientes de trabajo seguro y saludable.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'ingenieria', texto: 'Mantenimiento y control de medios de transporte y ayudas mecánicas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'ingenieria', texto: 'Aislamiento de fuentes de ignición de material combustible' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Dotación y capacitación en uso adecuado de extintores' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Conformación de brigada de emergencias con recursos suficientes en equipos y personal' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Almacenamiento seguro de combustibles y explosivos' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'ingenieria', texto: 'Control de fuentes de calor.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'ingenieria', texto: 'Seguridad, mantenimiento preventivo e inspecciones de seguridad a ductos, tanques, mangueras y accesorios de gas y líquidos inflamables' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'ingenieria', texto: 'Instalación y mantenimiento de red contra incendios' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Señalización de seguridad' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Simulacros de evacuación' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Plan de emergencias' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Conocer y seguir indicaciones de hoja de seguridad químicos' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Químicos rotulados y etiquetados' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Transporte de material inflamable de acuerdo a hoja de seguridad, etiquetados y con contacto a tierra.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Kit antiderrames y capacitación para su utilización' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Diligenciar permisos de trabajo y análisis de riesgo por operación para tareas que impliquen trabajos en caliente (soldadura)' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Exámenes médicos ocupacionales' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Contar con los procedimientos operativos normalizados para atención en caso de incendio' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Demarcar y señalizar el área de trabajo.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Capacitación en manejo de riesgo público, qué hacer antes, durante y después' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Capacitación sobre las instrucciones del personal de seguridad ante un evento de riesgo público.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Custodiar el dinero en efectivo en lugares apropiados' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Claridad a todo el personal sobre los protocolos de seguridad ante cualquier eventualidad de riesgo público.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Exámenes médicos ocupacionales para trabajo en alturas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'epp', texto: 'Usos de sistemas de protección contra caídas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Inspecciones periódicas a elementos de protección personal y sistemas de protección contra caídas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Garantizar el suministro de equipos, capacitación y entrenamiento.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Realizar inspecciones preoperacionales.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Asegurar acompañamiento permanente de personal capacitado en atención de emergencias.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Aplicación de pruebas que garanticen el buen funcionamiento de los sistemas de protección contra caídas y los certificados que los avalen.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Asegurar la compatibilidad de los componentes del sistema de protección contra caídas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Contar con los procedimientos operativos normalizados para atención y rescate en alturas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Formación en trabajo seguro en alturas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Diligenciar permisos de trabajo y análisis de riesgo por operación para tareas que impliquen trabajos en alturas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'epp', texto: 'Uso de sistemas de protección contra caídas.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'ingenieria', texto: 'Garantizar atmósferas seguras y niveles de iluminación y ventilación suficientes.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Asegurar acompañamiento y conexión permanente desde el exterior de personal capacitado en atención de emergencias' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Contacto con el exterior a través de línea de vida.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Definir y asegurar periodos de descanso fuera del espacio confinado.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Diligenciar permisos de trabajo y análisis de riesgo por operación para tareas que impliquen trabajos en espacios confinados.' },
  { tipoPeligro: 'CONDICIONES DE SEGURIDAD', jerarquia: 'administrativo', texto: 'Contar con los procedimientos operativos normalizados para atención y rescate en espacios confinados.' },

  // PSICOSOCIAL (16)
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Política clara para prevenir acoso laboral y promover un ambiente de convivencia laboral.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Conformar el Comité de Convivencia Laboral' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Realizar actividades de sensibilización sobre acoso laboral y sus consecuencias, dirigidos al nivel directivo y a los trabajadores.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Actividades educativas y formativas con los trabajadores con el objeto de modificar actitudes o respuestas.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Establecer el procedimiento para denunciar hechos constitutivos de acoso laboral, garantizando la confidencialidad y el respeto por el trabajador.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Desarrollar programas de intervención en crisis.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Elaborar códigos o manuales de convivencia en los que se identifiquen los tipos de comportamiento aceptables en la empresa.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Fomentar el apoyo entre el equipo de trabajo en la realización de las tareas.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Incrementar las oportunidades para aplicar los conocimientos y habilidades y para el aprendizaje y el desarrollo de nuevas habilidades.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Garantizar el respeto y el trato justo a las personas.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Fomentar la claridad y la transparencia organizativa.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Garantizar la seguridad proporcionando estabilidad en el empleo y en todas las condiciones de trabajo.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Proporcionar toda la información necesaria, adecuada y a tiempo para facilitar la realización de tareas y la adaptación a los cambios.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Cambiar la cultura de mando y establecer procedimientos para gestionar personas de forma saludable.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Facilitar la compatibilidad de la vida familiar y laboral.' },
  { tipoPeligro: 'PSICOSOCIAL', jerarquia: 'administrativo', texto: 'Adecuar la cantidad de trabajo al tiempo que dura la jornada.' },

  // FENOMENOS NATURALES (6)
  { tipoPeligro: 'FENOMENOS NATURALES', jerarquia: 'administrativo', texto: 'Diseño, ejecución y control del plan de emergencias.' },
  { tipoPeligro: 'FENOMENOS NATURALES', jerarquia: 'administrativo', texto: 'Conformación de la brigada de emergencias.' },
  { tipoPeligro: 'FENOMENOS NATURALES', jerarquia: 'administrativo', texto: 'Dotación y capacitación a la brigada de emergencias.' },
  { tipoPeligro: 'FENOMENOS NATURALES', jerarquia: 'administrativo', texto: 'Inspecciones periódicas a infraestructura y equipos de atención de emergencias.' },
  { tipoPeligro: 'FENOMENOS NATURALES', jerarquia: 'ingenieria', texto: 'Mantenimiento oportuno a las condiciones inseguras identificadas en las inspecciones.' },
  { tipoPeligro: 'FENOMENOS NATURALES', jerarquia: 'administrativo', texto: 'Capacitaciones a todos los niveles de la organización en cómo actuar antes, durante y después de la emergencia.' },
]

export function formatearControlesMarkdown(): string {
  const porTipo: Partial<Record<ControlCatalogo['tipoPeligro'], ControlCatalogo[]>> = {}
  for (const c of CONTROLES_CATALOGO) {
    ;(porTipo[c.tipoPeligro] ??= []).push(c)
  }
  const lineas: string[] = ['# CATÁLOGO DE CONTROLES GYS (168 items)\n']
  lineas.push('Jerarquía de controles: eliminar > sustituir > ingenieria > administrativo > epp')
  lineas.push('Para "eliminar" y "sustituir" usar "NA" si no es técnicamente viable.\n')
  for (const [tipo, items] of Object.entries(porTipo)) {
    lineas.push(`\n## ${tipo}\n`)
    const porJ: Partial<Record<string, string[]>> = {}
    for (const c of items!) {
      ;(porJ[c.jerarquia] ??= []).push(c.texto)
    }
    for (const [j, textos] of Object.entries(porJ)) {
      lineas.push(`**${j.toUpperCase()}**:`)
      for (const t of textos!) lineas.push(`- ${t}`)
    }
  }
  return lineas.join('\n')
}

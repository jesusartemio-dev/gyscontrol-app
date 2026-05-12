export interface PeligroCatalogo {
  categoria: 'MECÁNICO' | 'LOCATIVO' | 'ELÉCTRICO' | 'FÍSICO' | 'QUÍMICO'
           | 'ERGONÓMICO' | 'PSICOSOCIAL' | 'BIOLÓGICO' | 'FISICOQUÍMICO'
  peligro: string
  riesgo: string
  consecuencia: string
}

export const PELIGROS_CATALOGO: PeligroCatalogo[] = [
  // MECÁNICO (24)
  { categoria: 'MECÁNICO', peligro: 'Caída de objetos', riesgo: 'Golpes', consecuencia: 'Contusión, fractura' },
  { categoria: 'MECÁNICO', peligro: 'Carga suspendida', riesgo: 'Aplastamiento', consecuencia: 'Lesión, fractura, muerte' },
  { categoria: 'MECÁNICO', peligro: 'Combustible caliente', riesgo: 'Contacto con combustible caliente', consecuencia: 'Quemaduras, muerte' },
  { categoria: 'MECÁNICO', peligro: 'Desplazamiento de equipo móvil', riesgo: 'Golpes, atrapamiento', consecuencia: 'Contusión, mutilación de miembros superiores' },
  { categoria: 'MECÁNICO', peligro: 'Elementos de izaje mal instalado o desgastado', riesgo: 'Aplastamiento', consecuencia: 'Fracturas y muerte' },
  { categoria: 'MECÁNICO', peligro: 'Encendido violento', riesgo: 'Alcance del fuego al personal', consecuencia: 'Quemaduras' },
  { categoria: 'MECÁNICO', peligro: 'Equipo de rescate defectuoso', riesgo: 'Caída por fallas en los equipos al momento del rescate', consecuencia: 'Fracturas, politraumatismo y muerte' },
  { categoria: 'MECÁNICO', peligro: 'Equipo en movimiento', riesgo: 'Golpes, atrapamiento', consecuencia: 'Contusión, mutilación de miembros superiores' },
  { categoria: 'MECÁNICO', peligro: 'Equipo sin resguardo', riesgo: 'Golpes, atrapamiento', consecuencia: 'Contusión, mutilación de miembros superiores' },
  { categoria: 'MECÁNICO', peligro: 'Excavación y corte de taludes', riesgo: 'Caída a desnivel, desprendimiento de material, derrumbe y atrapamiento', consecuencia: 'Fractura, asfixia, politraumatismo y muerte' },
  { categoria: 'MECÁNICO', peligro: 'Falta de inspección y mantenimiento', riesgo: 'Choques, golpes, atascamiento, explosiones, etc.', consecuencia: 'Fracturas, contusiones, politraumatismo quemaduras y muerte' },
  { categoria: 'MECÁNICO', peligro: 'Maniobra inadecuada', riesgo: 'Volcamiento, choque, atropello', consecuencia: 'Fracturas, politraumatismo y muerte' },
  { categoria: 'MECÁNICO', peligro: 'Manipulación de herramientas manuales', riesgo: 'Golpes contra herramientas', consecuencia: 'Lesiones en las manos' },
  { categoria: 'MECÁNICO', peligro: 'Material caliente', riesgo: 'Contacto con material caliente', consecuencia: 'Quemaduras, muerte' },
  { categoria: 'MECÁNICO', peligro: 'Multoring', riesgo: 'Desprendimiento o caída de material', consecuencia: 'Golpes, contusión' },
  { categoria: 'MECÁNICO', peligro: 'Objetos punzocortantes', riesgo: 'Contacto con la parte filosa del objeto punzocortante', consecuencia: 'Cortes, escoriaciones' },
  { categoria: 'MECÁNICO', peligro: 'Pisos resbaladizos', riesgo: 'Resbalones, caídas a mismo nivel', consecuencia: 'Contusión, fracturas' },
  { categoria: 'MECÁNICO', peligro: 'Presencia de bancos colgados y/o talud inestable', riesgo: 'Derrumbes, caída de material', consecuencia: 'Fractura, politraumatismo y muerte' },
  { categoria: 'MECÁNICO', peligro: 'Proyección de fragmentos o partículas', riesgo: 'Contacto con los ojos, cara y con cualquier otra parte del cuerpo que este descubierta', consecuencia: 'Lesión ocular, contusión' },
  { categoria: 'MECÁNICO', peligro: 'Superficie u objeto caliente', riesgo: 'Contacto con superficies u objetos calientes', consecuencia: 'Quemaduras' },
  { categoria: 'MECÁNICO', peligro: 'Uso inadecuado de cinturón de seguridad', riesgo: 'No ser efectivo en el caso de que se requiera como un choque vehicular', consecuencia: 'Golpes, politraumatismo y muerte' },
  { categoria: 'MECÁNICO', peligro: 'Uso inadecuado de equipo anticaida', riesgo: 'Caída a distinto nivel', consecuencia: 'Fracturas, politraumatismo y muerte' },
  { categoria: 'MECÁNICO', peligro: 'Uso inadecuado de equipos contra incendio', riesgo: 'Explosión de mangueras a alta presión', consecuencia: 'Golpes, facturas' },
  { categoria: 'MECÁNICO', peligro: 'Vehículo en movimiento', riesgo: 'Atropello, choques', consecuencia: 'Golpes, fracturas, politraumatismo, muerte' },

  // LOCATIVO (17)
  { categoria: 'LOCATIVO', peligro: 'Acceso inadecuado', riesgo: 'Golpes, tropiezos, caídas a nivel y desnivel, etc', consecuencia: 'Contusiones, fracturas' },
  { categoria: 'LOCATIVO', peligro: 'Acumulamiento de material', riesgo: 'Derrumbe, caída a distinto nivel, hundimiento de techo', consecuencia: 'Contusiones, fracturas' },
  { categoria: 'LOCATIVO', peligro: 'Almacenamiento inadecuado', riesgo: 'Caídas, golpes, tropiezos, aplastamientos, explosiones, incendios, etc', consecuencia: 'Contusiones, fracturas, quemaduras, muerte' },
  { categoria: 'LOCATIVO', peligro: 'Andamios', riesgo: 'Caída a distinto nivel', consecuencia: 'Contusiones, fracturas, muerte' },
  { categoria: 'LOCATIVO', peligro: 'Apilamiento inadecuado', riesgo: 'Caída o desplome de objetos', consecuencia: 'Aplastamiento, contusiones y fracturas' },
  { categoria: 'LOCATIVO', peligro: 'Escaleras', riesgo: 'Caídas a distinto nivel', consecuencia: 'Contusiones, fracturas' },
  { categoria: 'LOCATIVO', peligro: 'Espacio reducido de trabajo', riesgo: 'Posturas inadecuadas, golpes contra objetos', consecuencia: 'Contusiones, fracturas, problemas musculares' },
  { categoria: 'LOCATIVO', peligro: 'Estructura de baja altura', riesgo: 'Golpes', consecuencia: 'Contusiones' },
  { categoria: 'LOCATIVO', peligro: 'Falta de inspección del área de trabajo', riesgo: 'Caídas al mismo nivel, golpes', consecuencia: 'Contusiones, fracturas' },
  { categoria: 'LOCATIVO', peligro: 'Falta de orden y limpieza', riesgo: 'Caídas al mismo nivel, golpes', consecuencia: 'Contusiones, fracturas' },
  { categoria: 'LOCATIVO', peligro: 'Falta de señalización', riesgo: 'Caídas ,golpes', consecuencia: 'Contusiones, fracturas' },
  { categoria: 'LOCATIVO', peligro: 'Iluminación inadecuada', riesgo: 'Fatiga visual, golpes caídas', consecuencia: 'Disminución de la agudeza visual, dolor de cabeza y contusiones' },
  { categoria: 'LOCATIVO', peligro: 'Mala distribución del espacio de trabajo', riesgo: 'Golpes, caídas', consecuencia: 'Contusiones' },
  { categoria: 'LOCATIVO', peligro: 'Plataformas', riesgo: 'Caída a distinto nivel', consecuencia: 'Contusiones, fracturas, muerte' },
  { categoria: 'LOCATIVO', peligro: 'Superficie de trabajo defectuoso', riesgo: 'Tropiezos', consecuencia: 'Contusiones, fracturas' },
  { categoria: 'LOCATIVO', peligro: 'Trabajo en altura', riesgo: 'Caída a distinto nivel', consecuencia: 'Fracturas, politraumatismo y muerte' },
  { categoria: 'LOCATIVO', peligro: 'Trabajo en superficie a desnivel', riesgo: 'Caída a desnivel', consecuencia: 'Contusiones y fracturas' },

  // ELÉCTRICO (4)
  { categoria: 'ELÉCTRICO', peligro: 'Arco eléctrico', riesgo: 'Contacto eléctrico', consecuencia: 'Quemaduras' },
  { categoria: 'ELÉCTRICO', peligro: 'Electricidad directa', riesgo: 'Contacto eléctrico directo', consecuencia: 'Quemaduras, paros cardiacos, conmoción e incluso la MUERTE. Traumatismos como lesiones secundarias' },
  { categoria: 'ELÉCTRICO', peligro: 'Electricidad estática', riesgo: 'Contacto eléctrico', consecuencia: 'Quemaduras, paros cardiacos, conmoción e incluso la MUERTE. Traumatismos como lesiones secundarias' },
  { categoria: 'ELÉCTRICO', peligro: 'Electricidad indirecta', riesgo: 'Contacto eléctrico indirecto', consecuencia: 'Quemaduras, paros cardiacos, conmoción e incluso la MUERTE. Traumatismos como lesiones secundarias' },

  // FISICOQUÍMICO (10)
  { categoria: 'FISICOQUÍMICO', peligro: 'Espacio confinado', riesgo: 'Asfixia por exposición a atmosfera con deficiencia de oxígeno, incendio y explosión, intoxicación', consecuencia: 'Perdida de la conciencia, dificultad al respirar, quemadura, muerte' },
  { categoria: 'FISICOQUÍMICO', peligro: 'Gases comprimidos', riesgo: 'Alta presión (la botella salga disparado sin control), asfixia, inflamabilidad, explosión', consecuencia: 'Politraumatismo, quemaduras y muerte' },
  { categoria: 'FISICOQUÍMICO', peligro: 'Líquido inflamable', riesgo: 'Incendio, explosión', consecuencia: 'Quemaduras/ muerte' },
  { categoria: 'FISICOQUÍMICO', peligro: 'Potencial derrame de combustible', riesgo: 'Incendio, explosión', consecuencia: 'Quemaduras/ muerte' },
  { categoria: 'FISICOQUÍMICO', peligro: 'Presencia de gases y vapores', riesgo: 'Inhalación de gases, asfixia', consecuencia: 'Perdida de la conciencia por inhalación' },
  { categoria: 'FISICOQUÍMICO', peligro: 'Almacenamiento inadecuado de sustancias y/o gases', riesgo: 'Explosiones, incendios, intoxicación', consecuencia: 'Quemaduras/ muerte' },
  { categoria: 'FISICOQUÍMICO', peligro: 'Uso de explosivos', riesgo: 'Detonaciones inesperadas, voladuras de forma incorrecta, alcance de material proyectado', consecuencia: 'Fracturas, quemaduras, politraumatismo, muerte' },
  { categoria: 'FISICOQUÍMICO', peligro: 'Atmosfera explosiva', riesgo: 'Incendio, explosión', consecuencia: 'Quemaduras/ muerte' },
  { categoria: 'FISICOQUÍMICO', peligro: 'Deficiencia de oxigeno', riesgo: 'Asfixia', consecuencia: 'Muerte' },
  { categoria: 'FISICOQUÍMICO', peligro: 'Alta concentración de oxigeno', riesgo: 'Incendio, explosión', consecuencia: 'Quemaduras/ muerte' },

  // FÍSICO (5)
  { categoria: 'FÍSICO', peligro: 'Radiación ionizante', riesgo: 'Exposición a radiación ionizante', consecuencia: 'Daño celular (ADN), daña órganos y tejidos del cuerpo, quemaduras por radiación, cáncer' },
  { categoria: 'FÍSICO', peligro: 'Radiación no ionizante', riesgo: 'Exposición a radiación no ionizante', consecuencia: 'Lesiones en los ojos, cáncer a la piel ( radiación UV), lesiones en la piel (quemaduras)' },
  { categoria: 'FÍSICO', peligro: 'Ruido', riesgo: 'Sobre exposición al ruido', consecuencia: 'Trauma acústico, hipoacusia' },
  { categoria: 'FÍSICO', peligro: 'Zona con alta temperatura', riesgo: 'Exposición prolongada a altas temperaturas, cambio brusco de temperatura', consecuencia: 'Deshidratación, golpes de calor, estrés térmico, etc.' },
  { categoria: 'FÍSICO', peligro: 'Zona con baja temperatura', riesgo: 'Exposición prolongada a bajas temperaturas', consecuencia: 'Disconfort, hipotermia, enfermedades respiratorias' },

  // QUÍMICO (6)
  { categoria: 'QUÍMICO', peligro: 'Manipulación de sustancia toxica', riesgo: 'Contacto y/o inhalación de sustancia toxica', consecuencia: 'Intoxicación, lesiones a los tejidos, irritación a los ojos, etc.' },
  { categoria: 'QUÍMICO', peligro: 'Material particulado suspendido (polvo)', riesgo: 'Inhalación de polvo y contacto con los ojos', consecuencia: 'Alergias, rinitis, irritación a la vista' },
  { categoria: 'QUÍMICO', peligro: 'Potencial derrame de sustancia química', riesgo: 'Derrame de sustancia química', consecuencia: 'Intoxicación, lesiones a los tejidos, irritación a los ojos, etc.' },
  { categoria: 'QUÍMICO', peligro: 'Presencia de gases de sustancia química', riesgo: 'Inhalación, exposición a los gases', consecuencia: 'Intoxicación, daños a las mucosas por inhalación de gases, irritación a los ojos' },
  { categoria: 'QUÍMICO', peligro: 'Presencia de humos metálicos', riesgo: 'Inhalación de humos metálicos', consecuencia: 'Alergias, asma, cáncer, dolor de cabeza, irritación a los ojos' },
  { categoria: 'QUÍMICO', peligro: 'Atmosfera toxica', riesgo: 'Inhalación de gases tóxicos', consecuencia: 'Intoxicación, muerte' },

  // ERGONÓMICO (7)
  { categoria: 'ERGONÓMICO', peligro: 'Diseño de puesto de trabajo', riesgo: 'Carga física de trabajo', consecuencia: 'Trastornó musculo-esquelético' },
  { categoria: 'ERGONÓMICO', peligro: 'Exposición prolongada a pantalla de visualización de datos', riesgo: 'Fatiga visual', consecuencia: 'Disminución de la agudeza visual y dolor de cabeza' },
  { categoria: 'ERGONÓMICO', peligro: 'Manipulación manual de carga', riesgo: 'Carga física de trabajo', consecuencia: 'Trastornó musculo-esquelético' },
  { categoria: 'ERGONÓMICO', peligro: 'Postura forzada de trabajo', riesgo: 'Carga física de trabajo', consecuencia: 'Trastornó musculo-esquelético' },
  { categoria: 'ERGONÓMICO', peligro: 'Postura habitual', riesgo: 'Carga física de trabajo', consecuencia: 'Lesiones musculares' },
  { categoria: 'ERGONÓMICO', peligro: 'Trabajo repetitivo', riesgo: 'Carga física de trabajo', consecuencia: 'Trastornó musculo-esquelético' },
  { categoria: 'ERGONÓMICO', peligro: 'Trabajos prolongados de pie', riesgo: 'Carga física de trabajo', consecuencia: 'Lesiones musculares, fatiga y dolores en los miembros inferiores,' },

  // PSICOSOCIAL (4)
  { categoria: 'PSICOSOCIAL', peligro: 'Factores relacionados con las tareas y las funciones (ritmo de trabajo, monotonía/repetitividad, iniciativa/autonomía, carga de trabajo: sobrecarga y subcarga de trabajo, nivel de responsabilidad, desempeño de rol)', riesgo: 'Carga mental de trabajo', consecuencia: 'Estrés laboral, ansiedad, mal humor, insomnio, fatiga mental, síndrome de bournot' },
  { categoria: 'PSICOSOCIAL', peligro: 'Factores relacionados con la estructura de la organización del trabajo (estilo de mando: estilo autocrático, paternalista, relaciones interpersonales en el trabajo, condiciones de empleo, movilidad geográfica, tipo de contrato, salario, desarrollo profesional)', riesgo: 'Carga mental de trabajo', consecuencia: 'Estrés laboral, ansiedad, mal humor, insomnio, fatiga mental' },
  { categoria: 'PSICOSOCIAL', peligro: 'Organización del tiempo de trabajo (jornada de trabajo, pausas de trabajo, características de horarios, trabajo nocturno o por turnos)', riesgo: 'Carga mental de trabajo', consecuencia: 'Estrés laboral, ansiedad, mal de humor, insomnio, fatiga mental' },
  { categoria: 'PSICOSOCIAL', peligro: 'Mobbing (acoso laboral)', riesgo: 'Hostigamiento psicológico', consecuencia: 'Miedo, terror, desprecio o desanimo' },

  // BIOLÓGICO (5)
  { categoria: 'BIOLÓGICO', peligro: 'Virus', riesgo: 'Agentes biológicos', consecuencia: 'Proceso infeccioso de origen viral' },
  { categoria: 'BIOLÓGICO', peligro: 'Bacterias', riesgo: 'Agentes biológicos', consecuencia: 'Proceso infeccioso de origen bacteriano' },
  { categoria: 'BIOLÓGICO', peligro: 'Hongos', riesgo: 'Agentes biológicos', consecuencia: 'Proceso infeccioso de origen nicótico' },
  { categoria: 'BIOLÓGICO', peligro: 'Parásitos', riesgo: 'Agentes biológicos', consecuencia: 'Enfermedad parasitaria' },
  { categoria: 'BIOLÓGICO', peligro: 'Vectores', riesgo: 'Picaduras de zancudos, mosquitos, arañas, etc', consecuencia: 'Hinchazón, fiebre, convulsión, parálisis, etc' },
]

export function formatearCatalogoMarkdown(): string {
  const porCategoria: Partial<Record<PeligroCatalogo['categoria'], PeligroCatalogo[]>> = {}
  for (const p of PELIGROS_CATALOGO) {
    ;(porCategoria[p.categoria] ??= []).push(p)
  }
  const lineas: string[] = ['# CATÁLOGO DE PELIGROS GYS (82 items)\n']
  for (const [cat, items] of Object.entries(porCategoria)) {
    lineas.push(`\n## ${cat}\n`)
    for (const p of items!) {
      lineas.push(`- **${p.peligro}** → Riesgo: ${p.riesgo} → Consecuencia: ${p.consecuencia}`)
    }
  }
  return lineas.join('\n')
}

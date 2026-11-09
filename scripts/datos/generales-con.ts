// Servicios de CON para "Generales - Movilización y Obras Preliminares" y
// "Generales - Desmovilización" (ver src/lib/cronogramaIA/generalesCon.ts).
// Fuente de scripts/catalogo-con-generales.ts y de la vista previa de
// scripts/aplicar-con-generales-proyecto.ts cuando el catálogo aún no los tiene.
export const SERVICIOS_GENERALES_CON: { orden: number; nombre: string; recurso: string; horas: number; tags: string[]; descripcion: string }[] = [
  { orden: 100, nombre: 'Movilización de Personal, Equipos y Herramientas a Planta', recurso: 'Cuadrilla 2P', horas: 4, tags: ['Movilizacion'], descripcion: 'Traslado del personal, equipos y herramientas a la planta del cliente al inicio de la obra.' },
  { orden: 101, nombre: 'Reconocimiento de Zonas de Trabajo y Replanteo con el Cliente', recurso: 'Supervisor', horas: 4, tags: ['Movilizacion'], descripcion: 'Recorrido de las zonas de trabajo y replanteo junto con el cliente.' },
  { orden: 102, nombre: 'Habilitación de Zona de Acopio y Almacén Temporal en Planta', recurso: 'Cuadrilla 2P', horas: 4, tags: ['Movilizacion'], descripcion: 'Habilitación del área de acopio y almacén temporal de materiales en planta.' },
  { orden: 103, nombre: 'Traslado de Materiales desde Almacén GYS a Planta', recurso: 'Cuadrilla 2P', horas: 4, tags: ['Movilizacion'], descripcion: 'Traslado de los materiales desde el almacén de GYS hasta la zona de acopio en planta.' },
  { orden: 104, nombre: 'Recepción y Traslado de Andamios a Planta', recurso: 'Cuadrilla 2P', horas: 3, tags: ['Movilizacion', 'Paralelo', 'Andamios'], descripcion: 'Recepción de los andamios alquilados y traslado a la zona de trabajo.' },
  { orden: 105, nombre: 'Señalización y Delimitación de Áreas de Trabajo', recurso: 'Cuadrilla 2P', horas: 2, tags: ['Movilizacion', 'Paralelo'], descripcion: 'Señalización y delimitación de las áreas de trabajo antes de iniciar las actividades.' },
  { orden: 110, nombre: 'Devolución de Andamios', recurso: 'Cuadrilla 2P', horas: 3, tags: ['Desmovilizacion', 'Andamios'], descripcion: 'Desarmado final y devolución de los andamios alquilados.' },
  { orden: 111, nombre: 'Retiro de Sobrantes, Residuos y Almacén Temporal', recurso: 'Cuadrilla 2P', horas: 4, tags: ['Desmovilizacion'], descripcion: 'Retiro de materiales sobrantes, residuos y del almacén temporal en planta.' },
  { orden: 112, nombre: 'Desmovilización de Personal, Equipos y Herramientas', recurso: 'Cuadrilla 2P', horas: 4, tags: ['Desmovilizacion'], descripcion: 'Retiro del personal, equipos y herramientas de la planta al cierre de la obra.' },
  // Sin "Liberación General de Áreas con acta": la desmovilización cierra la
  // construcción y después viene el comisionamiento; la entrega al cliente va al final.
]

/** Reemplazado por "Traslado de Materiales desde Almacén GYS a Planta" (en Generales - Movilización). */
export const SERVICIO_CON_OBSOLETO = 'Preparación y Traslado de Materiales'

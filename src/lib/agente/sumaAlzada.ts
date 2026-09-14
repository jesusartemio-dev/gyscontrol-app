// Importación de cotizaciones históricas que solo conservan el PDF enviado al cliente.
//
// El modelo exige que todo ítem de servicio apunte a un Recurso real (FK NOT NULL) y
// se costee como horas × tarifa, pero el PDF solo trae un monto cerrado por posición.
// Para no inventar un recurso ni unas horas que el documento no dice, esas partidas se
// cargan contra un recurso marcador: 1 hora a costoHora = monto. La hora es el vehículo
// contable, no un dato de HH real — por eso el recurso se crea inactivo, para que no
// aparezca en los selectores operativos ni en los análisis de horas hombre.

/** Valor centinela que el wizard manda como recursoId; el backend lo resuelve al recurso real. */
export const RECURSO_SUMA_ALZADA = '__suma_alzada__'

export const NOMBRE_RECURSO_SUMA_ALZADA = 'Suma alzada (histórico)'

// Fuente única de las etiquetas de CobroValorizacion.estado — usada tanto en la
// lista de Cuentas por Cobrar como en el detalle, para que nunca digan cosas
// distintas sobre la misma operación de factoring.
export const ESTADO_COBRO_FACTORING_LABEL: Record<string, string> = {
  en_negociacion: 'En negociación',
  desembolsada: 'Desembolsada',
  confirmada: 'Confirmada',
  letra_cambio: 'Letra de cambio',
}

export const TIPO_EVENTO_FACTORING_LABEL: Record<string, string> = {
  adelanto: 'Adelanto',
  saldo_girar: 'Saldo a girar',
  detraccion: 'Detracción',
  excedente: 'Excedente',
  neto: 'Neto', // cobro directo — mismo rol que Adelanto
  retencion: 'Retención',
}

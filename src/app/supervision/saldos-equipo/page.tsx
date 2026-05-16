import TablaSaldosEquipo from '@/components/saldos/TablaSaldosEquipo'

export default function SaldosEquipoPage() {
  return (
    <TablaSaldosEquipo
      titulo="Saldos del Equipo"
      subtitulo="Gestión de horas extras y vacaciones de tu equipo"
      defaultTipoCodigo="COMP_HE"
    />
  )
}

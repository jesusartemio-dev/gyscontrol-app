/**
 * Layout para el área de logística
 * Navegación via Sidebar principal (sin submenú duplicado)
 */

import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function LogisticaLayout({ children }: Props) {
  return <>{children}</>
}

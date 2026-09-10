'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CotizacionEquipoItemsView } from '@/components/comercial/CotizacionEquipoItemsView'
import { CotizacionEquipoConsolidadoView } from '@/components/comercial/CotizacionEquipoConsolidadoView'
import { CotizacionItemsTabSwitcher, type CotizacionItemsTab } from '@/components/comercial/CotizacionItemsTabSwitcher'

function ComercialEquiposContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab')
  const [tab, setTabState] = useState<CotizacionItemsTab>(tabParam === 'consolidado' ? 'consolidado' : 'buscar')

  const setTab = (next: CotizacionItemsTab) => {
    setTabState(next)
    const url = new URL(window.location.href)
    if (next === 'buscar') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', next)
    }
    router.replace(url.pathname + url.search)
  }

  return (
    <div className="p-4 space-y-4">
      <CotizacionItemsTabSwitcher activeTab={tab} onTabChange={setTab} />
      {tab === 'buscar' ? <CotizacionEquipoItemsView /> : <CotizacionEquipoConsolidadoView />}
    </div>
  )
}

export default function ComercialEquiposPage() {
  return (
    <Suspense>
      <ComercialEquiposContent />
    </Suspense>
  )
}

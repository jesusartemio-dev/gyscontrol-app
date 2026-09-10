'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CotizacionServicioItemsView } from '@/components/comercial/CotizacionServicioItemsView'
import { CotizacionServicioConsolidadoView } from '@/components/comercial/CotizacionServicioConsolidadoView'
import { CotizacionItemsTabSwitcher, type CotizacionItemsTab } from '@/components/comercial/CotizacionItemsTabSwitcher'

function ComercialServiciosContent() {
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
      {tab === 'buscar' ? <CotizacionServicioItemsView /> : <CotizacionServicioConsolidadoView />}
    </div>
  )
}

export default function ComercialServiciosPage() {
  return (
    <Suspense>
      <ComercialServiciosContent />
    </Suspense>
  )
}

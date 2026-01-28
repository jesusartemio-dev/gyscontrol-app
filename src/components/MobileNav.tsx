'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSidebar } from '@/lib/context/SidebarContext'

/**
 * MobileNav - Header fijo que aparece solo en móvil
 * Contiene el botón hamburguesa y el logo
 */
export default function MobileNav() {
  const { isMobileOpen, toggleMobile } = useSidebar()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden bg-gray-900 border-b border-gray-700/60 shadow-lg">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Hamburger button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMobile}
          className="text-gray-300 hover:text-white hover:bg-gray-700/50 p-2"
          aria-label={isMobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {isMobileOpen ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </Button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-[100px] h-8">
            <Image
              src="/logo.png"
              alt="Logo GyS"
              fill
              priority
              sizes="100px"
              className="object-contain"
            />
          </div>
          <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-300 border-blue-400/30">
            v2.0
          </Badge>
        </Link>

        {/* Placeholder for right side (notifications, user menu, etc.) */}
        <div className="w-10" />
      </div>
    </header>
  )
}

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

const MIN_SCALE = 0.5
const MAX_SCALE = 5
const ZOOM_STEP = 0.3

export default function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const translateStart = useRef({ x: 0, y: 0 })

  const resetZoom = useCallback(() => {
    setScale(1)
    setTranslate({ x: 0, y: 0 })
  }, [])

  useEffect(() => {
    resetZoom()
  }, [src, resetZoom])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale((prev) => {
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
      return Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta))
    })
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale <= 1) return
      e.preventDefault()
      setIsDragging(true)
      dragStart.current = { x: e.clientX, y: e.clientY }
      translateStart.current = { ...translate }
    },
    [scale, translate]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      setTranslate({
        x: translateStart.current.x + dx,
        y: translateStart.current.y + dy,
      })
    },
    [isDragging]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s + ZOOM_STEP))
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, s - ZOOM_STEP))

  const isZoomed = scale !== 1

  return (
    <div className="relative w-full h-full">
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-md border shadow-sm p-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground w-10 text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        {isZoomed && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetZoom}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden flex items-center justify-center"
        style={{ cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-full object-contain rounded shadow-sm select-none"
          style={{
            transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}

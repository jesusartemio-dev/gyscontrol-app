'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
const LEAFLET_CSS_ID = 'leaflet-css-cdn'

function ensureLeafletCss() {
  if (typeof document === 'undefined') return
  if (document.getElementById(LEAFLET_CSS_ID)) return
  const link = document.createElement('link')
  link.id = LEAFLET_CSS_ID
  link.rel = 'stylesheet'
  link.href = LEAFLET_CSS
  document.head.appendChild(link)
}

// Workaround para icono de Leaflet en Next.js (bundler)
const iconDefault = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface Props {
  latitud: number | null
  longitud: number | null
  radioMetros?: number
  onChange: (lat: number, lon: number) => void
}

function ClickHandler({ onChange }: { onChange: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function Recentrar({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView([lat, lon], map.getZoom())
  }, [lat, lon, map])
  return null
}

export default function MapPicker({ latitud, longitud, radioMetros = 150, onChange }: Props) {
  useEffect(() => {
    ensureLeafletCss()
  }, [])

  const center = useMemo<[number, number]>(() => {
    if (latitud != null && longitud != null) return [latitud, longitud]
    return [-12.0464, -77.0428] // Lima por defecto
  }, [latitud, longitud])

  const [usuarioLat, setUsuarioLat] = useState<number | null>(null)
  const [usuarioLon, setUsuarioLon] = useState<number | null>(null)

  function centrarEnMi() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      setUsuarioLat(pos.coords.latitude)
      setUsuarioLon(pos.coords.longitude)
      onChange(pos.coords.latitude, pos.coords.longitude)
    })
  }

  return (
    <div className="relative h-80 w-full overflow-hidden rounded-md border">
      <MapContainer
        center={center}
        zoom={latitud != null ? 17 : 12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <ClickHandler onChange={onChange} />
        {latitud != null && longitud != null && (
          <>
            <Marker position={[latitud, longitud]} icon={iconDefault} />
            <Circle
              center={[latitud, longitud]}
              radius={radioMetros}
              pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.2 }}
            />
            <Recentrar lat={latitud} lon={longitud} />
          </>
        )}
      </MapContainer>
      <button
        type="button"
        onClick={centrarEnMi}
        className="absolute right-2 top-2 z-[1000] rounded-md border bg-white px-3 py-1.5 text-xs font-medium shadow hover:bg-gray-50"
      >
        📍 Centrar en mí
      </button>
      <div className="absolute bottom-2 left-2 z-[1000] rounded-md bg-white/90 px-2 py-1 text-xs shadow">
        Clic en el mapa para fijar el punto
      </div>
    </div>
  )
}

'use client'

import { Fragment, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from 'react-leaflet'
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

const sedeIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const usuarioIcon = L.divIcon({
  className: 'mapa-usuario-icon',
  html: `<div style="
    width: 18px;
    height: 18px;
    background: #2563eb;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 2px #2563eb, 0 0 12px rgba(37, 99, 235, 0.6);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

interface Sede {
  id: string
  nombre: string
  tipo: string
  latitud: number
  longitud: number
  radioMetros: number
  distanciaMetros: number
  dentro: boolean
}

interface SedeRemota {
  id: string
  nombre: string
  latitud: number
  longitud: number
  radioMetros: number
  distanciaMetros: number
  dentro: boolean
}

interface Props {
  usuarioLat: number
  usuarioLon: number
  precisionGps?: number
  sedes: Sede[]
  sedeRemota?: SedeRemota | null
  alturaPx?: number
}

function FitBounds({ puntos }: { puntos: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (puntos.length === 0) return
    const bounds = L.latLngBounds(puntos)
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 })
  }, [puntos, map])
  return null
}

export default function MapaSedesCercanas({
  usuarioLat,
  usuarioLon,
  precisionGps,
  sedes,
  sedeRemota,
  alturaPx = 280,
}: Props) {
  useEffect(() => {
    ensureLeafletCss()
  }, [])

  const puntosParaFit: Array<[number, number]> = [
    [usuarioLat, usuarioLon],
    ...sedes.map(s => [s.latitud, s.longitud] as [number, number]),
  ]
  if (sedeRemota) puntosParaFit.push([sedeRemota.latitud, sedeRemota.longitud])

  return (
    <div className="relative w-full overflow-hidden rounded-md border" style={{ height: alturaPx }}>
      <MapContainer
        center={[usuarioLat, usuarioLon]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />

        <FitBounds puntos={puntosParaFit} />

        {/* Posición del usuario */}
        <Marker position={[usuarioLat, usuarioLon]} icon={usuarioIcon}>
          <Popup>
            <div className="text-xs">
              <p className="font-semibold">Tú estás aquí</p>
              {precisionGps && <p className="text-muted-foreground">Precisión ±{Math.round(precisionGps)}m</p>}
            </div>
          </Popup>
        </Marker>
        {/* Halo de precisión del GPS */}
        {precisionGps && precisionGps < 500 && (
          <Circle
            center={[usuarioLat, usuarioLon]}
            radius={precisionGps}
            pathOptions={{
              color: '#2563eb',
              weight: 1,
              fillColor: '#3b82f6',
              fillOpacity: 0.08,
            }}
          />
        )}

        {/* Sedes oficiales */}
        {sedes.map(s => (
          <Fragment key={s.id}>
            <Marker position={[s.latitud, s.longitud]} icon={sedeIcon}>
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">{s.nombre}</p>
                  <p className="text-muted-foreground">{s.tipo}</p>
                  <p className="mt-1">
                    Estás a{' '}
                    <strong>
                      {s.distanciaMetros < 1000
                        ? `${s.distanciaMetros}m`
                        : `${(s.distanciaMetros / 1000).toFixed(2)}km`}
                    </strong>
                  </p>
                  <p>Radio: {s.radioMetros}m</p>
                  {s.dentro ? (
                    <p className="mt-1 font-semibold text-emerald-700">✓ Estás dentro</p>
                  ) : (
                    <p className="mt-1 font-semibold text-amber-700">Fuera del radio</p>
                  )}
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[s.latitud, s.longitud]}
              radius={s.radioMetros}
              pathOptions={{
                color: s.dentro ? '#059669' : '#d97706',
                weight: 2,
                fillColor: s.dentro ? '#10b981' : '#fbbf24',
                fillOpacity: s.dentro ? 0.25 : 0.12,
              }}
            />
          </Fragment>
        ))}

        {/* Sede remota personal */}
        {sedeRemota && (
          <>
            <Marker position={[sedeRemota.latitud, sedeRemota.longitud]} icon={sedeIcon}>
              <Popup>
                <div className="text-xs">
                  <p className="font-semibold">Tu sede remota</p>
                  <p>{sedeRemota.nombre}</p>
                  <p className="mt-1">
                    A{' '}
                    {sedeRemota.distanciaMetros < 1000
                      ? `${sedeRemota.distanciaMetros}m`
                      : `${(sedeRemota.distanciaMetros / 1000).toFixed(2)}km`}
                  </p>
                  {sedeRemota.dentro && (
                    <p className="mt-1 font-semibold text-purple-700">✓ Estás en tu sede remota</p>
                  )}
                </div>
              </Popup>
            </Marker>
            <Circle
              center={[sedeRemota.latitud, sedeRemota.longitud]}
              radius={sedeRemota.radioMetros}
              pathOptions={{
                color: '#7c3aed',
                weight: 2,
                fillColor: '#a78bfa',
                fillOpacity: 0.18,
                dashArray: '5,5',
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  )
}

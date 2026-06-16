'use client';
// components/commons/InitiativesMap.tsx
// B165 — Mappa Leaflet per iniziative KORA Commons con geolocalizzazione.
//
// Tile: OpenStreetMap (gratuito, privacy-clean).
// Fair-use OSM: le tile vengono richieste direttamente dal browser dell'utente
// (standard per applicazioni Leaflet) — nessuna proxy server necessaria.
// User-Agent del browser è sufficiente per OSM tile fair-use.
//
// IMPORTANTE: questo componente NON chiama mai Nominatim dal client.
// Il geocoding (address → lat/lng) avviene SOLO server-side al momento della
// pubblicazione (vedi /api/commons/posts/[id]/route.ts).
//
// Caricato via dynamic import con ssr: false (richiesto da Leaflet — usa window).

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import type { CommonsPostWorkerView, InitiativeOpeningGrade } from '@/lib/commons/types';
import { OPENING_GRADE_LABELS } from '@/lib/commons/types';

// Fix Leaflet default icon (webpack asset issue)
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function fixLeafletIcon() {
  // Leaflet v1.x bundled via webpack perde i path delle icone default.
  // Fix standard raccomandato dalla community.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

interface Props {
  initiatives: CommonsPostWorkerView[];
  height?:     number;
}

const GRADE_COLORS: Record<InitiativeOpeningGrade, string> = {
  company_internal: '#3B6EBA',
  company_extended: '#7C3D8F',
  cross_company:    '#2F7D55',
};

// Centro di default: Italia
const DEFAULT_CENTER: LatLngExpression = [41.9, 12.5];
const DEFAULT_ZOOM = 5;

export function InitiativesMap({ initiatives, height = 360 }: Props) {
  useEffect(() => { fixLeafletIcon(); }, []);

  const geoPoints = initiatives.filter(
    (i) => i.location_lat != null && i.location_lng != null,
  );

  // Calcola il centro della mappa: centroide dei punti o default Italia
  const center: LatLngExpression = geoPoints.length > 0
    ? [
        geoPoints.reduce((s, i) => s + i.location_lat!, 0) / geoPoints.length,
        geoPoints.reduce((s, i) => s + i.location_lng!, 0) / geoPoints.length,
      ]
    : DEFAULT_CENTER;

  const zoom = geoPoints.length === 0 ? DEFAULT_ZOOM
    : geoPoints.length === 1 ? 12
    : 7;

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(6,3,43,0.09)' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, width: '100%' }}
        scrollWheelZoom={false}
      >
        {/* Tile OpenStreetMap — gratuito, privacy-clean */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoPoints.map((initiative) => {
          const gradeColor = initiative.opening_grade
            ? GRADE_COLORS[initiative.opening_grade]
            : '#06032B';
          const gradeLabel = initiative.opening_grade
            ? OPENING_GRADE_LABELS[initiative.opening_grade]
            : '';

          return (
            <Marker
              key={initiative.id}
              position={[initiative.location_lat!, initiative.location_lng!]}
            >
              <Popup>
                <div style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', minWidth: 180 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#06032B', margin: '0 0 4px' }}>
                    {initiative.title}
                  </p>
                  {initiative.opening_grade && (
                    <span style={{
                      display:      'inline-block',
                      fontSize:     9,
                      fontWeight:   600,
                      color:        gradeColor,
                      padding:      '1px 6px',
                      borderRadius: 3,
                      background:   `${gradeColor}18`,
                      marginBottom: 4,
                    }}>
                      {gradeLabel}
                    </span>
                  )}
                  {initiative.location_address && (
                    <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.55)', margin: '4px 0 0' }}>
                      {initiative.location_address}
                    </p>
                  )}
                  {initiative.event_start_at && (
                    <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: '2px 0 0' }}>
                      {new Date(initiative.event_start_at).toLocaleDateString('it-IT', {
                        day:   'numeric',
                        month: 'long',
                        year:  'numeric',
                      })}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {geoPoints.length === 0 && (
        <div style={{
          textAlign:  'center',
          padding:    '20px',
          background: 'rgba(6,3,43,0.02)',
          fontSize:   11,
          color:      'rgba(6,3,43,0.35)',
        }}>
          Nessuna iniziativa con geolocalizzazione disponibile.
        </div>
      )}
    </div>
  );
}

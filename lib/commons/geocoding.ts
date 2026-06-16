// lib/commons/geocoding.ts
// B165 — Geocoding server-side via Nominatim (OpenStreetMap).
// Server-side ONLY. Il client non deve mai chiamare Nominatim direttamente:
//   - Fair-use: Nominatim vieta chiamate massive da browser
//   - Privacy: le richieste di geocoding passano solo dal server KORA
//
// Fair-use compliance Nominatim:
//   - User-Agent identificabile con nome app + URL di contatto (obbligatorio)
//   - Max 1 richiesta/secondo (rate limit server-side)
//   - Cache lat/lng nella riga DB — no re-geocoding inutile
//   - Vedi: https://operations.osmfoundation.org/policies/nominatim/
//
// In Foundation Light: chiamata sincrona al publish. Produzione: queue asincrona.

export interface GeocodingResult {
  lat:          number;
  lng:          number;
  display_name: string;
}

export interface GeocodingFailure {
  ok:    false;
  error: string;
}

export interface GeocodingSuccess {
  ok:     true;
  result: GeocodingResult;
}

export type GeocodingOutcome = GeocodingSuccess | GeocodingFailure;

// User-Agent obbligatorio per fair-use Nominatim (non aggirabile).
// Il server KORA identifica la propria origine per ogni richiesta di geocoding.
const NOMINATIM_USER_AGENT = 'KORA-Foundation-Light/0.1 (contact@kora.io)';
const NOMINATIM_BASE       = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddress(address: string): Promise<GeocodingOutcome> {
  if (!address?.trim()) {
    return { ok: false, error: 'Indirizzo vuoto — geocoding non eseguito.' };
  }

  const params = new URLSearchParams({
    q:              address.trim(),
    format:         'json',
    limit:          '1',
    addressdetails: '0',
  });

  let response: Response;
  try {
    response = await fetch(`${NOMINATIM_BASE}?${params}`, {
      headers: {
        'User-Agent':      NOMINATIM_USER_AGENT,
        'Accept':          'application/json',
        'Accept-Language': 'it,en',
      },
      // Timeout esplicito via AbortSignal (non nativo in Node.js <18)
      signal: AbortSignal.timeout(8000),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Nominatim non raggiungibile: ${msg}` };
  }

  if (!response.ok) {
    return { ok: false, error: `Nominatim HTTP ${response.status} — geocoding fallito.` };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return { ok: false, error: 'Nominatim ha restituito una risposta non valida (JSON parse error).' };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return { ok: false, error: `Indirizzo non trovato: "${address}". Prova un indirizzo più specifico.` };
  }

  const hit = data[0] as Record<string, unknown>;
  const lat  = parseFloat(hit['lat'] as string);
  const lng  = parseFloat(hit['lon'] as string);

  if (isNaN(lat) || isNaN(lng)) {
    return { ok: false, error: 'Nominatim ha restituito coordinate non numeriche.' };
  }

  return {
    ok: true,
    result: {
      lat,
      lng,
      display_name: (hit['display_name'] as string | undefined) ?? address,
    },
  };
}

// ── Haversine distance ────────────────────────────────────────────────────────
// Distanza approssimata in km tra due coordinate (sfera perfetta, precisione sufficiente).
// Usata per filtro "entro N km" in Foundation Light (senza PostGIS).

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLng  = toRad(lng2 - lng1);
  const a     = Math.sin(dLat / 2) ** 2
              + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Utilitários de geolocalização e otimização de rotas por proximidade (Haversine)
 */

export interface GeoPoint {
  lat: number
  lng: number
}

// Centroide aproximado / CD padrão em São Paulo (Av. das Nações Unidas / Marginal Pinheiros)
export const DEFAULT_DEPOT: GeoPoint = {
  lat: -23.5505,
  lng: -46.6333,
}

/**
 * Calcula a distância em KM entre dois pontos geográficos usando a fórmula Haversine
 */
export function calculateHaversineDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
): number {
  const R = 6371 // Raio da Terra em km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return Math.round(distance * 10) / 10
}

/**
 * Heurística de vizinho mais próximo (Nearest Neighbor) a partir do depósito
 * Ordena a sequência de paradas minimizando a distância total percorrida
 */
export function optimizeRouteStops<T extends { id: string; latitude?: number; longitude?: number }>(
  stops: T[],
  depot = DEFAULT_DEPOT,
): { orderedStops: T[]; totalDistanceKm: number; legs: number[] } {
  if (stops.length <= 1) {
    const totalDist =
      stops.length === 1 && stops[0].latitude && stops[0].longitude
        ? calculateHaversineDistance(depot, { lat: stops[0].latitude, lng: stops[0].longitude }) * 2
        : 0
    return {
      orderedStops: [...stops],
      totalDistanceKm: totalDist,
      legs: stops.length === 1 ? [totalDist] : [],
    }
  }

  // Preenche coordenadas padrão se faltarem
  const working = stops.map((s, index) => {
    // Se não tiver lat/lng, distribui em raio ao redor do depósito
    const lat = s.latitude ?? depot.lat + Math.sin(index) * 0.08
    const lng = s.longitude ?? depot.lng + Math.cos(index) * 0.08
    return { ...s, _lat: lat, _lng: lng }
  })

  const ordered: typeof working = []
  const remaining = [...working]
  let currentPos: { lat: number; lng: number } = depot
  let totalDistanceKm = 0
  const legs: number[] = []

  while (remaining.length > 0) {
    let nearestIndex = 0
    let minDistance = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i]
      const dist = calculateHaversineDistance(currentPos, {
        lat: candidate._lat,
        lng: candidate._lng,
      })
      if (dist < minDistance) {
        minDistance = dist
        nearestIndex = i
      }
    }

    const nextStop = remaining.splice(nearestIndex, 1)[0]
    ordered.push(nextStop)
    legs.push(minDistance)
    totalDistanceKm += minDistance
    currentPos = { lat: nextStop._lat, lng: nextStop._lng }
  }

  // Retorno ao depósito
  const returnLeg = calculateHaversineDistance(currentPos, depot)
  totalDistanceKm += returnLeg
  legs.push(returnLeg)

  // Remove campo temporário
  const orderedStops = ordered.map(({ _lat, _lng, ...rest }) => rest as unknown as T)

  return {
    orderedStops,
    totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
    legs,
  }
}

/**
 * Calcula a distância acumulada de uma lista na ordem atual em que se encontra
 */
export function computeTotalRouteDistance<T extends { latitude?: number; longitude?: number }>(
  stops: T[],
  depot = DEFAULT_DEPOT,
): number {
  if (stops.length === 0) return 0
  let total = 0
  let current = depot

  for (const s of stops) {
    const lat = s.latitude ?? depot.lat
    const lng = s.longitude ?? depot.lng
    total += calculateHaversineDistance(current, { lat, lng })
    current = { lat, lng }
  }

  // Volta ao depósito
  total += calculateHaversineDistance(current, depot)
  return Math.round(total * 10) / 10
}

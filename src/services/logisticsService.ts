import pb from '@/lib/pocketbase/client'
import type {
  CompanySettings,
  Vehicle,
  Driver,
  Trip,
  CteDocument,
  TrafficFine,
} from '@/types/logistics'

// Empresa
export async function getCompanySettings(): Promise<CompanySettings | null> {
  try {
    const records = await pb.collection('company_settings').getList<CompanySettings>(1, 1, {
      sort: '-created',
    })
    return records.items[0] || null
  } catch (error) {
    console.error('Erro ao buscar dados da empresa:', error)
    return null
  }
}

export async function saveCompanySettings(
  data: Partial<CompanySettings>,
  id?: string,
): Promise<CompanySettings> {
  if (id) {
    return await pb.collection('company_settings').update<CompanySettings>(id, data)
  }
  return await pb.collection('company_settings').create<CompanySettings>(data)
}

// Veículos
export async function getVehicles(): Promise<Vehicle[]> {
  return await pb.collection('vehicles').getFullList<Vehicle>({
    sort: '-created',
  })
}

export async function createVehicle(
  data: Omit<Vehicle, 'id' | 'created' | 'updated'>,
): Promise<Vehicle> {
  return await pb.collection('vehicles').create<Vehicle>(data)
}

export async function updateVehicle(id: string, data: Partial<Vehicle>): Promise<Vehicle> {
  return await pb.collection('vehicles').update<Vehicle>(id, data)
}

export async function deleteVehicle(id: string): Promise<boolean> {
  await pb.collection('vehicles').delete(id)
  return true
}

// Motoristas
export async function getDrivers(): Promise<Driver[]> {
  return await pb.collection('drivers').getFullList<Driver>({
    sort: 'name',
  })
}

export async function createDriver(
  data: Omit<Driver, 'id' | 'created' | 'updated'>,
): Promise<Driver> {
  return await pb.collection('drivers').create<Driver>(data)
}

export async function updateDriver(id: string, data: Partial<Driver>): Promise<Driver> {
  return await pb.collection('drivers').update<Driver>(id, data)
}

export async function deleteDriver(id: string): Promise<boolean> {
  await pb.collection('drivers').delete(id)
  return true
}

// Viagens
export async function getTrips(): Promise<Trip[]> {
  return await pb.collection('trips').getFullList<Trip>({
    sort: '-created',
    expand: 'vehicle_id,driver_id',
  })
}

export async function createTrip(
  data: Omit<Trip, 'id' | 'created' | 'updated' | 'expand'>,
): Promise<Trip> {
  return await pb.collection('trips').create<Trip>(data)
}

export async function updateTrip(id: string, data: Partial<Trip>): Promise<Trip> {
  return await pb.collection('trips').update<Trip>(id, data)
}

export async function deleteTrip(id: string): Promise<boolean> {
  await pb.collection('trips').delete(id)
  return true
}

// CT-e Documentos
export async function getCteDocuments(): Promise<CteDocument[]> {
  return await pb.collection('cte_documents').getFullList<CteDocument>({
    sort: '-created',
    expand: 'trip_id',
  })
}

export async function createCteDocument(
  data: Omit<CteDocument, 'id' | 'created' | 'updated' | 'expand'>,
): Promise<CteDocument> {
  return await pb.collection('cte_documents').create<CteDocument>(data)
}

export async function updateCteDocument(
  id: string,
  data: Partial<CteDocument>,
): Promise<CteDocument> {
  return await pb.collection('cte_documents').update<CteDocument>(id, data)
}

export async function deleteCteDocument(id: string): Promise<boolean> {
  await pb.collection('cte_documents').delete(id)
  return true
}

// Multas e Infrações
export async function getTrafficFines(): Promise<TrafficFine[]> {
  return await pb.collection('traffic_fines').getFullList<TrafficFine>({
    sort: '-infraction_date',
    expand: 'vehicle_id,driver_id',
  })
}

export async function createTrafficFine(
  data: Omit<TrafficFine, 'id' | 'created' | 'updated' | 'expand'>,
): Promise<TrafficFine> {
  return await pb.collection('traffic_fines').create<TrafficFine>(data)
}

export async function updateTrafficFine(
  id: string,
  data: Partial<TrafficFine>,
): Promise<TrafficFine> {
  return await pb.collection('traffic_fines').update<TrafficFine>(id, data)
}

export async function deleteTrafficFine(id: string): Promise<boolean> {
  await pb.collection('traffic_fines').delete(id)
  return true
}

export async function markFineAsPaid(id: string, paymentDate?: string): Promise<TrafficFine> {
  const dateStr = paymentDate || new Date().toISOString()
  return await pb.collection('traffic_fines').update<TrafficFine>(id, {
    status: 'paid',
    payment_date: dateStr,
  })
}

export async function registerFineAppeal(
  id: string,
  appealNumber: string,
  notes?: string,
): Promise<TrafficFine> {
  const updateData: Partial<TrafficFine> = {
    status: 'appealed',
    appeal_number: appealNumber,
  }
  if (notes) {
    updateData.notes = notes
  }
  return await pb.collection('traffic_fines').update<TrafficFine>(id, updateData)
}

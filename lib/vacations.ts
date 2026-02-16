import { sql } from './db'
import type { Vacation } from './types'

interface VacationSettings {
  userSettings: {
    [userName: string]: {
      anAnterior: number
      totalAllocated: number
    }
  }
}

function rowToVacation(row: Record<string, unknown>): Vacation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    userName: row.user_name as string,
    type: row.type as 'legal' | 'medical' | 'fara_plata',
    days: Number(row.days) || 0,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    imageUrl: (row.image_url as string) || '',
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
    month: 0,
    year: 0,
  }
}

export async function getVacations(): Promise<Vacation[]> {
  const result = await sql`SELECT * FROM vacations ORDER BY created_at DESC`
  return result.map(rowToVacation)
}

export async function getVacationSettings(): Promise<VacationSettings> {
  const result = await sql`
    SELECT vs.*, u.name as user_name FROM vacation_settings vs 
    JOIN users u ON u.id = vs.user_id
  `
  
  const settings: VacationSettings = { userSettings: {} }
  for (const row of result) {
    settings.userSettings[row.user_name as string] = {
      anAnterior: Number(row.an_anterior) || 0,
      totalAllocated: Number(row.total_allocated) || 21,
    }
  }
  return settings
}

export async function setAnAnterior(userName: string, days: number): Promise<boolean> {
  try {
    // Find user by name
    const users = await sql`SELECT id FROM users WHERE name = ${userName}`
    if (users.length === 0) return false
    
    const userId = users[0].id
    
    // Upsert vacation settings
    const existing = await sql`SELECT id FROM vacation_settings WHERE user_id = ${userId}::uuid`
    
    if (existing.length > 0) {
      await sql`UPDATE vacation_settings SET an_anterior = ${days} WHERE user_id = ${userId}::uuid`
    } else {
      await sql`INSERT INTO vacation_settings (user_id, an_anterior, total_allocated, year) VALUES (${userId}::uuid, ${days}, 21, 2026)`
    }
    
    return true
  } catch (error) {
    console.error('[v0] Error setting anAnterior:', error)
    return false
  }
}

export async function saveVacation(vacation: Vacation): Promise<boolean> {
  try {
    await sql`
      INSERT INTO vacations (user_id, user_name, type, days, start_date, end_date, image_url)
      VALUES (${vacation.userId}::uuid, ${vacation.userName}, ${vacation.type}, ${vacation.days}, ${vacation.startDate}, ${vacation.endDate}, ${vacation.imageUrl || null})
    `
    return true
  } catch (error) {
    console.error('[v0] Error saving vacation:', error)
    return false
  }
}

export async function getVacationsByUser(userName: string): Promise<Vacation[]> {
  const result = await sql`SELECT * FROM vacations WHERE user_name = ${userName} ORDER BY created_at DESC`
  return result.map(rowToVacation)
}

export async function getVacationsByUserAndMonth(userName: string, month: number, year: number): Promise<{
  legal: number
  medical: number
  faraPlata: number
  special: number
  vacationDays: { day: number; type: string }[]
}> {
  const vacations = await getVacationsByUser(userName)
  
  let legal = 0
  let medical = 0
  let faraPlata = 0
  let special = 0
  const vacationDays: { day: number; type: string }[] = []
  
  for (const vacation of vacations) {
    const startDate = new Date(vacation.startDate)
    const endDate = new Date(vacation.endDate)
    
    const startYear = startDate.getFullYear()
    const endYear = endDate.getFullYear()
    if (startYear < 2020 || startYear > 2100 || endYear < 2020 || endYear > 2100) {
      continue
    }
    
    const monthStart = new Date(year, month - 1, 1)
    const monthEnd = new Date(year, month, 0)
    
    const overlapStart = new Date(Math.max(startDate.getTime(), monthStart.getTime()))
    const overlapEnd = new Date(Math.min(endDate.getTime(), monthEnd.getTime()))
    
    if (overlapStart <= overlapEnd) {
      const daysInMonth = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      if (vacation.type === 'legal') legal += daysInMonth
      else if (vacation.type === 'medical') medical += daysInMonth
      else if (vacation.type === 'fara_plata') faraPlata += daysInMonth
      else if (vacation.type === 'special') special += daysInMonth
      
      for (let d = new Date(overlapStart); d <= overlapEnd; d.setDate(d.getDate() + 1)) {
        vacationDays.push({ day: d.getDate(), type: vacation.type })
      }
    }
  }
  
  return { legal, medical, faraPlata, special, vacationDays }
}

export async function getVacationStats(userName: string): Promise<{
  totalAlocat: number
  anAnterior: number
  concediuLegal: number
  concediuMedical: number
  concediuFaraPlata: number
  concediuSpecial: number
  remaining: number
}> {
  const vacations = await getVacationsByUser(userName)
  const settings = await getVacationSettings()
  
  const anAnterior = settings.userSettings[userName]?.anAnterior || 0
  const totalAlocat = settings.userSettings[userName]?.totalAllocated || 21
  
  const concediuLegal = vacations.filter(v => v.type === 'legal').reduce((sum, v) => sum + v.days, 0)
  const concediuMedical = vacations.filter(v => v.type === 'medical').reduce((sum, v) => sum + v.days, 0)
  const concediuFaraPlata = vacations.filter(v => v.type === 'fara_plata').reduce((sum, v) => sum + v.days, 0)
  const concediuSpecial = vacations.filter(v => v.type === 'special').reduce((sum, v) => sum + v.days, 0)
  
  const remaining = totalAlocat + anAnterior - concediuLegal
  
  return {
    totalAlocat,
    anAnterior,
    concediuLegal,
    concediuMedical,
    concediuFaraPlata,
    concediuSpecial,
    remaining: Math.max(0, remaining)
  }
}

export async function deleteVacation(vacationId: string): Promise<boolean> {
  try {
    await sql`DELETE FROM vacations WHERE id = ${vacationId}`
    return true
  } catch (error) {
    console.error('[v0] Error deleting vacation:', error)
    return false
  }
}

export async function updateVacationSetting(userName: string, field: 'anAnterior' | 'totalAllocated', value: number): Promise<boolean> {
  try {
    const users = await sql`SELECT id FROM users WHERE name = ${userName}`
    if (users.length === 0) return false
    
    const userId = users[0].id
    const existing = await sql`SELECT id FROM vacation_settings WHERE user_id = ${userId}::uuid`
    
    if (existing.length > 0) {
      if (field === 'anAnterior') {
        await sql`UPDATE vacation_settings SET an_anterior = ${value} WHERE user_id = ${userId}::uuid`
      } else if (field === 'totalAllocated') {
        await sql`UPDATE vacation_settings SET total_allocated = ${value} WHERE user_id = ${userId}::uuid`
      }
    } else {
      const anAnterior = field === 'anAnterior' ? value : 0
      const totalAllocated = field === 'totalAllocated' ? value : 21
      await sql`INSERT INTO vacation_settings (user_id, an_anterior, total_allocated, year) VALUES (${userId}::uuid, ${anAnterior}, ${totalAllocated}, 2026)`
    }
    
    return true
  } catch (error) {
    console.error('[v0] Error updating vacation setting:', error)
    return false
  }
}

export async function getAllVacationStats(): Promise<Map<string, {
  totalAlocat: number
  anAnterior: number
  concediuLegal: number
  concediuMedical: number
  concediuFaraPlata: number
  concediuSpecial: number
  remaining: number
}>> {
  const vacations = await getVacations()
  const settings = await getVacationSettings()
  const userStats = new Map<string, {
    totalAlocat: number
    anAnterior: number
    concediuLegal: number
    concediuMedical: number
    concediuFaraPlata: number
    concediuSpecial: number
    remaining: number
  }>()
  
  const vacationUserNames = [...new Set(vacations.map(v => v.userName))]
  const settingsUserNames = Object.keys(settings.userSettings)
  const userNames = [...new Set([...vacationUserNames, ...settingsUserNames])]
  
  for (const userName of userNames) {
    const userVacations = vacations.filter(v => v.userName === userName)
    const anAnterior = settings.userSettings[userName]?.anAnterior || 0
    const totalAlocat = settings.userSettings[userName]?.totalAllocated || 21
    
    const concediuLegal = userVacations.filter(v => v.type === 'legal').reduce((sum, v) => sum + v.days, 0)
    const concediuMedical = userVacations.filter(v => v.type === 'medical').reduce((sum, v) => sum + v.days, 0)
    const concediuFaraPlata = userVacations.filter(v => v.type === 'fara_plata').reduce((sum, v) => sum + v.days, 0)
    const concediuSpecial = userVacations.filter(v => v.type === 'special').reduce((sum, v) => sum + v.days, 0)
    
    const remaining = totalAlocat + anAnterior - concediuLegal
    
    userStats.set(userName, {
      totalAlocat,
      anAnterior,
      concediuLegal,
      concediuMedical,
      concediuFaraPlata,
      concediuSpecial,
      remaining: Math.max(0, remaining)
    })
  }
  
  return userStats
}

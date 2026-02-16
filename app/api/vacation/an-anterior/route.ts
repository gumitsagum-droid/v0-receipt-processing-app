import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { setAnAnterior, updateVacationSetting } from '@/lib/vacations'

export async function POST(request: Request) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    // Doar Boss (accessLevel 3) poate modifica setarile de concediu
    if (user.accessLevel !== 3) {
      return NextResponse.json({ error: 'Doar Boss poate modifica aceste setari' }, { status: 403 })
    }

    const body = await request.json()
    const { userName, days, field } = body

    if (!userName || days === undefined) {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 })
    }

    // Handle both string and number input
    const daysNumber = typeof days === 'number' ? days : parseInt(String(days), 10)
    
    if (isNaN(daysNumber) || daysNumber < 0) {
      return NextResponse.json({ error: 'Numar de zile invalid' }, { status: 400 })
    }

    let success = false
    
    if (field === 'totalAllocated') {
      success = await updateVacationSetting(userName, 'totalAllocated', daysNumber)
    } else {
      // Default: anAnterior (backward compatible)
      success = await setAnAnterior(userName, daysNumber)
    }

    if (!success) {
      return NextResponse.json({ error: 'Eroare la salvare' }, { status: 500 })
    }

    return NextResponse.json({ success: true, saved: daysNumber })
  } catch (error) {
    console.error('[v0] Error setting vacation setting:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

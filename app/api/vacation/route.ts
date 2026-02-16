import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getSession } from '@/lib/auth'
import { saveVacation, getVacations, deleteVacation } from '@/lib/vacations'
import type { Vacation } from '@/lib/types'

export async function POST(request: Request) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as 'legal' | 'medical' | 'fara_plata'
    const days = parseInt(formData.get('days') as string, 10)
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string

    if (!file || !type || !days || !startDate) {
      return NextResponse.json({ error: 'Date incomplete' }, { status: 400 })
    }

    // Upload image to blob
    const blob = await put(`vacations/${user.id}/${Date.now()}-${file.name}`, file, {
      access: 'public',
      contentType: file.type,
    })

    // Parse month and year from startDate (format: YYYY-MM-DD)
    const dateParts = startDate.split('-')
    const month = parseInt(dateParts[1], 10)
    const year = parseInt(dateParts[0], 10)

    // Create vacation record
    const vacation: Vacation = {
      id: `vac_${Date.now()}`,
      userId: user.id,
      userName: user.name,
      type,
      days,
      startDate,
      endDate: endDate || startDate,
      imageUrl: blob.url,
      createdAt: new Date().toISOString(),
      month,
      year
    }

    await saveVacation(vacation)

    return NextResponse.json({ success: true, vacation })
  } catch (error) {
    console.error('[v0] Vacation upload error:', error)
    return NextResponse.json({ error: 'Eroare la incarcare' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const vacations = await getVacations()
    
    // Admin vede toate, user vede doar ale lui
    const filteredVacations = user.role === 'admin' 
      ? vacations 
      : vacations.filter(v => v.userId === user.id)

    return NextResponse.json({ vacations: filteredVacations })
  } catch (error) {
    console.error('[v0] Get vacations error:', error)
    return NextResponse.json({ error: 'Eroare' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    // Doar Boss (accessLevel 3) poate sterge concedii
    if (user.accessLevel !== 3) {
      return NextResponse.json({ error: 'Doar Boss poate sterge concedii' }, { status: 403 })
    }

    const { vacationId } = await request.json()
    
    if (!vacationId) {
      return NextResponse.json({ error: 'ID concediu lipsa' }, { status: 400 })
    }

    const success = await deleteVacation(vacationId)
    
    if (!success) {
      return NextResponse.json({ error: 'Eroare la stergere' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Delete vacation error:', error)
    return NextResponse.json({ error: 'Eroare' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession, updateUserAccessLevel } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }
    
    // Only Boss (level 3) can change access levels
    const currentAccessLevel = session.accessLevel || (session.role === 'admin' ? 2 : 1)
    if (currentAccessLevel !== 3) {
      return NextResponse.json({ error: 'Doar Boss poate modifica nivelurile de acces' }, { status: 403 })
    }
    
    const { userId, accessLevel } = await request.json()
    
    if (!userId || ![1, 2, 3].includes(accessLevel)) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
    }
    
    const success = await updateUserAccessLevel(userId, accessLevel)
    
    if (!success) {
      return NextResponse.json({ error: 'Utilizator negasit' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating access level:', error)
    return NextResponse.json({ error: 'Eroare la actualizare' }, { status: 500 })
  }
}

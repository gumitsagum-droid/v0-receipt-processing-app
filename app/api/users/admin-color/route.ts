import { NextResponse } from 'next/server'
import { getSession, updateUserAdminColor } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }
    
    const accessLevel = user.accessLevel || (user.role === 'admin' ? 2 : 1)
    
    // Doar Boss poate schimba culorile adminilor
    if (accessLevel !== 3) {
      return NextResponse.json({ error: 'Doar Boss poate atribui culori' }, { status: 403 })
    }
    
    const { userId, color } = await request.json()
    
    if (!userId || !color) {
      return NextResponse.json({ error: 'Date lipsa' }, { status: 400 })
    }
    
    const success = await updateUserAdminColor(userId, color)
    
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: 'Utilizator negasit' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error updating admin color:', error)
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 })
  }
}

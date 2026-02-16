import { NextResponse } from 'next/server'
import { getSession, deleteUser } from '@/lib/auth'

const BOSS_PIN = '240697'

export async function DELETE(request: Request) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }
    
    // Doar Boss poate sterge utilizatori
    const accessLevel = user.accessLevel || (user.role === 'admin' ? 2 : 1)
    if (accessLevel !== 3) {
      return NextResponse.json({ error: 'Doar Boss poate sterge utilizatori' }, { status: 403 })
    }
    
    const { userId, pin } = await request.json()
    
    // Verifica PIN-ul
    if (pin !== BOSS_PIN) {
      return NextResponse.json({ error: 'PIN incorect' }, { status: 403 })
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'ID utilizator lipsa' }, { status: 400 })
    }
    
    // Nu permite stergerea propriului cont
    if (userId === user.id) {
      return NextResponse.json({ error: 'Nu poti sterge propriul cont' }, { status: 400 })
    }
    
    const success = await deleteUser(userId)
    
    if (!success) {
      return NextResponse.json({ error: 'Utilizatorul nu a fost gasit' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, message: 'Utilizatorul a fost sters' })
    
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'A aparut o eroare' }, { status: 500 })
  }
}

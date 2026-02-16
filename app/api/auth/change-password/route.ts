import { NextResponse } from 'next/server'
import { changePassword } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email si parola noua sunt obligatorii' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Parola trebuie sa aiba minim 6 caractere' }, { status: 400 })
    }

    const result = await changePassword(email, newPassword)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Parola a fost schimbata cu succes' })
  } catch (error) {
    console.error('Error changing password:', error)
    return NextResponse.json({ error: 'A aparut o eroare' }, { status: 500 })
  }
}

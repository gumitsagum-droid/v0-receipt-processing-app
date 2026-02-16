import { cookies } from 'next/headers'
import { sql } from './db'
import type { User } from './types'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + 'decontufr-salt-2024')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    password: row.password as string,
    role: row.role as 'user' | 'admin',
    accessLevel: row.access_level as 1 | 2 | 3,
    adminColor: row.admin_color as string | undefined,
    plainPassword: row.plain_password as string | undefined,
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : new Date().toISOString(),
  }
}

export async function createUser(email: string, password: string, name: string): Promise<User | null> {
  // Check if user already exists
  const existing = await sql`SELECT id FROM users WHERE email = ${email}`
  if (existing.length > 0) return null
  
  const hashedPassword = await hashPassword(password)
  
  // Check if first user
  const countResult = await sql`SELECT COUNT(*) as count FROM users`
  const isFirstUser = Number(countResult[0].count) === 0
  const isXenia = name.toLowerCase() === 'xenia'
  
  const role = isFirstUser || isXenia ? 'admin' : 'user'
  const accessLevel = isXenia ? 3 : (isFirstUser ? 2 : 1)
  
  const result = await sql`
    INSERT INTO users (email, name, password, plain_password, role, access_level)
    VALUES (${email}, ${name}, ${hashedPassword}, ${password}, ${role}, ${accessLevel})
    RETURNING *
  `
  
  return rowToUser(result[0])
}

export async function verifyUser(email: string, password: string): Promise<User | null> {
  const hashedPassword = await hashPassword(password)
  const result = await sql`SELECT * FROM users WHERE email = ${email} AND password = ${hashedPassword}`
  if (result.length === 0) return null
  return rowToUser(result[0])
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await sql`SELECT * FROM users WHERE id = ${id}::uuid`
  if (result.length === 0) return null
  return rowToUser(result[0])
}

export async function getAllUsers(): Promise<User[]> {
  const result = await sql`SELECT * FROM users ORDER BY created_at ASC`
  return result.map(rowToUser)
}

export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<boolean> {
  const result = await sql`UPDATE users SET role = ${role} WHERE id = ${userId}::uuid RETURNING id`
  return result.length > 0
}

export async function updateUserAccessLevel(userId: string, accessLevel: 1 | 2 | 3): Promise<boolean> {
  const role = accessLevel >= 2 ? 'admin' : 'user'
  const result = await sql`
    UPDATE users SET access_level = ${accessLevel}, role = ${role} 
    WHERE id = ${userId}::uuid RETURNING id
  `
  return result.length > 0
}

export async function getUserByName(name: string): Promise<User | null> {
  const result = await sql`SELECT * FROM users WHERE LOWER(name) = ${name.toLowerCase()}`
  if (result.length === 0) return null
  return rowToUser(result[0])
}

export async function createSession(userId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('session', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })
}

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')
  
  if (!sessionCookie) return null
  
  const user = await getUserById(sessionCookie.value)
  
  // Auto-upgrade Xenia to Boss if not already
  if (user && user.name.toLowerCase() === 'xenia' && user.accessLevel !== 3) {
    await updateUserAccessLevel(user.id, 3)
    user.accessLevel = 3
    user.role = 'admin'
  }
  
  return user
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function changePassword(email: string, newPassword: string): Promise<{ success: boolean, error?: string }> {
  const hashedPassword = await hashPassword(newPassword)
  const result = await sql`
    UPDATE users SET password = ${hashedPassword}, plain_password = ${newPassword}
    WHERE email = ${email} RETURNING id
  `
  
  if (result.length === 0) {
    return { success: false, error: 'Email-ul nu a fost gasit' }
  }
  
  return { success: true }
}

export async function updateUserAdminColor(userId: string, color: string): Promise<boolean> {
  const result = await sql`
    UPDATE users SET admin_color = ${color} WHERE id = ${userId}::uuid RETURNING id
  `
  return result.length > 0
}

export async function getAdmins(): Promise<User[]> {
  const result = await sql`SELECT * FROM users WHERE access_level >= 2 ORDER BY name ASC`
  return result.map(rowToUser)
}

export async function deleteUser(userId: string): Promise<boolean> {
  const result = await sql`DELETE FROM users WHERE id = ${userId}::uuid RETURNING id`
  return result.length > 0
}

// Culori predefinite pentru admini
export const ADMIN_COLORS = [
  { name: 'Rosu', value: '#ef4444', bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700' },
  { name: 'Albastru', value: '#3b82f6', bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
  { name: 'Verde', value: '#22c55e', bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' },
  { name: 'Mov', value: '#a855f7', bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' },
  { name: 'Portocaliu', value: '#f97316', bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-700' },
  { name: 'Roz', value: '#ec4899', bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-700' },
  { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-700' },
  { name: 'Galben', value: '#eab308', bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700' },
]

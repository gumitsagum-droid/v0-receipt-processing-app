'use server'

import { redirect } from 'next/navigation'
import { createUser, verifyUser, createSession, clearSession, getSession, updateUserRole } from '@/lib/auth'

export async function registerAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string

  if (!email || !password || !name) {
    return { error: 'Toate campurile sunt obligatorii' }
  }

  if (password.length < 6) {
    return { error: 'Parola trebuie sa aiba minim 6 caractere' }
  }

  const user = await createUser(email, password, name)

  if (!user) {
    return { error: 'Un cont cu acest email exista deja' }
  }

  await createSession(user.id)
  redirect('/dashboard')
}

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email si parola sunt obligatorii' }
  }

  const user = await verifyUser(email, password)

  if (!user) {
    return { error: 'Email sau parola incorecte' }
  }

  await createSession(user.id)
  redirect('/dashboard')
}

export async function logoutAction() {
  await clearSession()
  redirect('/login')
}

export async function getCurrentUser() {
  return await getSession()
}

export async function makeAdminAction(userId: string) {
  const currentUser = await getSession()
  
  if (!currentUser || currentUser.role !== 'admin') {
    return { error: 'Nu aveti permisiuni pentru aceasta actiune' }
  }
  
  const success = await updateUserRole(userId, 'admin')
  
  if (!success) {
    return { error: 'Utilizatorul nu a fost gasit' }
  }
  
  return { success: true }
}

export async function removeAdminAction(userId: string) {
  const currentUser = await getSession()
  
  if (!currentUser || currentUser.role !== 'admin') {
    return { error: 'Nu aveti permisiuni pentru aceasta actiune' }
  }
  
  if (currentUser.id === userId) {
    return { error: 'Nu va puteti scoate propriul rol de admin' }
  }
  
  const success = await updateUserRole(userId, 'user')
  
  if (!success) {
    return { error: 'Utilizatorul nu a fost gasit' }
  }
  
  return { success: true }
}

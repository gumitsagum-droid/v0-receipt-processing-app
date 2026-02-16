import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { updateReceipt, getAllReceipts, deleteReceipt } from '@/lib/receipts'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const { id } = await params
    const updates = await request.json()

    // Check if user owns the receipt or is admin
    const allReceipts = await getAllReceipts()
    const receipt = allReceipts.find(r => r.id === id)
    
    if (!receipt) {
      return NextResponse.json({ error: 'Bonul nu a fost gasit' }, { status: 404 })
    }

    if (receipt.userId !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Nu ai permisiunea de a edita acest bon' }, { status: 403 })
    }

    const accessLevel = user.accessLevel || (user.role === 'admin' ? 2 : 1)

    // Only include fields that are actually being updated (not undefined)
    const cleanUpdates: Record<string, unknown> = {}
    if (updates.amount !== undefined) cleanUpdates.amount = Number(updates.amount)
    if (updates.storeName !== undefined) cleanUpdates.storeName = updates.storeName
    if (updates.date !== undefined) cleanUpdates.date = updates.date
    if (updates.receiptNumber !== undefined) cleanUpdates.receiptNumber = updates.receiptNumber
    // Doar Boss (accessLevel 3) si Stelian Covrig pot edita avansDecont
    const isBossOrStelian = accessLevel === 3 || 
      (user.name.toLowerCase().includes('covrig') && user.name.toLowerCase().includes('stelian'))
    
    if (updates.avansDecont !== undefined) {
      if (!isBossOrStelian) {
        return NextResponse.json({ error: 'Nu ai permisiunea de a modifica Avans spre Decontare' }, { status: 403 })
      }
      cleanUpdates.avansDecont = updates.avansDecont
      // Auto-set avansDate to today (dd.mm.yyyy) when setting avansDecont, only if not already editing avansDate too
      if (updates.avansDate === undefined) {
        const now = new Date()
        const dd = String(now.getDate()).padStart(2, '0')
        const mm = String(now.getMonth() + 1).padStart(2, '0')
        const yyyy = now.getFullYear()
        cleanUpdates.avansDate = `${dd}.${mm}.${yyyy}`
      }
    }
    if (updates.avansDate !== undefined) {
      if (!isBossOrStelian) {
        return NextResponse.json({ error: 'Nu ai permisiunea de a modifica Data Avans' }, { status: 403 })
      }
      cleanUpdates.avansDate = updates.avansDate
    }
    if (updates.observatiiLucrare !== undefined) cleanUpdates.observatiiLucrare = updates.observatiiLucrare

    // Daca este admin si modifica bonul altcuiva, salveaza cine a modificat
    if (accessLevel >= 2) {
      // Adminii pot modifica orice bon - salvam intotdeauna cine a modificat
      // Covrig Stelian apare ca "Sefu la Banii"
      const displayName = user.name.toLowerCase().includes('covrig') && user.name.toLowerCase().includes('stelian')
        ? 'Sefu la Banii'
        : user.name
      cleanUpdates.modifiedBy = displayName
      cleanUpdates.modifiedByColor = user.adminColor || '#6b7280'
      cleanUpdates.modifiedAt = new Date().toISOString()
    }

    const updatedReceipt = await updateReceipt(id, cleanUpdates)

    if (!updatedReceipt) {
      return NextResponse.json({ error: 'Eroare la actualizare' }, { status: 500 })
    }

    return NextResponse.json({ success: true, receipt: updatedReceipt })
  } catch (error) {
    console.error('Update receipt error:', error)
    return NextResponse.json({ error: 'Eroare la actualizare' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    // Doar Boss (accessLevel 3) poate sterge bonuri
    const accessLevel = user.accessLevel || (user.role === 'admin' ? 2 : 1)
    if (accessLevel !== 3) {
      return NextResponse.json({ error: 'Doar Boss poate sterge bonuri' }, { status: 403 })
    }

    const { id } = await params
    const success = await deleteReceipt(id)

    if (!success) {
      return NextResponse.json({ error: 'Eroare la stergere' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete receipt error:', error)
    return NextResponse.json({ error: 'Eroare la stergere' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createReceipt } from '@/lib/receipts'
import { getCardFirma } from '@/lib/card-mapping'

export async function POST(request: Request) {
  try {
    const user = await getSession()
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const { amount, storeName, date, receiptNumber } = await request.json()

    if (!amount || !storeName || !date) {
      return NextResponse.json({ error: 'Suma, magazinul si data sunt obligatorii' }, { status: 400 })
    }

    const receipt = await createReceipt({
      userId: user.id,
      userName: user.name,
      amount: Number(amount),
      storeName,
      date,
      receiptNumber: receiptNumber || 'N/A',
      imageUrl: '',
      cardFirma: getCardFirma(user.name),
    })

    return NextResponse.json({ success: true, receipt })
  } catch (error) {
    console.error('[v0] Manual receipt error:', error)
    return NextResponse.json({ error: 'Eroare la salvare' }, { status: 500 })
  }
}

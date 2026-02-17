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

    const body = await request.json()
    const { amount, storeName, date, receiptNumber } = body

    if (!amount || !storeName || !date) {
      return NextResponse.json({ error: 'Suma, magazinul si data sunt obligatorii' }, { status: 400 })
    }

    const receipt = await createReceipt({
      userId: user.id,
      userName: user.name,
      amount: parseFloat(amount),
      storeName: storeName,
      date: date,
      receiptNumber: receiptNumber || 'N/A',
      imageUrl: '',
      cardFirma: getCardFirma(user.name),
    })

    return NextResponse.json({ success: true, receipt })
  } catch (error) {
    console.error('[v0] Manual receipt creation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscuta'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

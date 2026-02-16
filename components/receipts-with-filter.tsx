'use client'

import { useState, useMemo } from 'react'
import type { Receipt } from '@/lib/types'
import { ReceiptsTable } from '@/components/receipts-table'
import { DownloadDecontSection } from '@/components/download-decont-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ReceiptsWithFilterProps {
  receipts: Receipt[]
  userName: string
  canEdit?: boolean
  canEditAllFields?: boolean
}

export function ReceiptsWithFilter({ 
  receipts, 
  userName,
  canEdit = false,
  canEditAllFields = false
}: ReceiptsWithFilterProps) {
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  
  // Filtreaza bonurile pe baza lunii si anului selectat
  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      if (!receipt.date) return false
      
      // Parse date - poate fi format DD.MM.YYYY sau YYYY-MM-DD
      let receiptMonth: number
      let receiptYear: number
      
      if (receipt.date.includes('.')) {
        // Format DD.MM.YYYY
        const parts = receipt.date.split('.')
        receiptMonth = parseInt(parts[1])
        receiptYear = parseInt(parts[2])
      } else if (receipt.date.includes('-')) {
        // Format YYYY-MM-DD
        const parts = receipt.date.split('-')
        receiptYear = parseInt(parts[0])
        receiptMonth = parseInt(parts[1])
      } else {
        return false
      }
      
      return receiptMonth === filterMonth && receiptYear === filterYear
    })
  }, [receipts, filterMonth, filterYear])
  
  const handleFilterChange = (month: number, year: number) => {
    setFilterMonth(month)
    setFilterYear(year)
  }

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground">Bonurile mele</CardTitle>
        <DownloadDecontSection 
          userName={userName} 
          onFilterChange={handleFilterChange}
        />
      </CardHeader>
      <CardContent>
        {filteredReceipts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nu exista bonuri pentru luna selectata
          </div>
        ) : (
          <ReceiptsTable 
            receipts={filteredReceipts} 
            showUserColumn={false}
            canDownload={true}
            canEdit={canEdit}
            canEditAllFields={canEditAllFields}
          />
        )}
      </CardContent>
    </Card>
  )
}

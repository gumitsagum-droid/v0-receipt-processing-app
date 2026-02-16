'use client'

import { useState, useMemo } from 'react'
import type { Receipt } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, FileText, Pencil, Check, X } from 'lucide-react'
import { mutate } from 'swr'

interface DecontReportProps {
  receipts: Receipt[]
  canEditDate?: boolean
}

const MONTHS = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
]

function parseDate(dateStr: string | undefined | null): { month: number, year: number } | null {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return null
  const str = dateStr.trim()
  if (!str) return null
  const dotMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (dotMatch) return { month: parseInt(dotMatch[2]), year: parseInt(dotMatch[3]) }
  const d = new Date(str)
  if (!isNaN(d.getTime())) return { month: d.getMonth() + 1, year: d.getFullYear() }
  return null
}

function getAvansDateStr(r: Receipt): string {
  if (r.avansDate && r.avansDate !== 'null' && r.avansDate !== 'undefined' && r.avansDate.trim()) return r.avansDate
  return ''
}

export function DecontReport({ receipts, canEditDate = false }: DecontReportProps) {
  const currentDate = new Date()
  const [startMonth, setStartMonth] = useState(currentDate.getMonth() + 1)
  const [startYear, setStartYear] = useState(currentDate.getFullYear())
  const [endMonth, setEndMonth] = useState(currentDate.getMonth() + 1)
  const [endYear, setEndYear] = useState(currentDate.getFullYear())
  const [downloading, setDownloading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDateValue, setEditDateValue] = useState('')
  const [saving, setSaving] = useState(false)

  const allAvansReceipts = useMemo(() => {
    return receipts.filter(r => {
      const val = parseFloat(r.avansDecont || '0')
      return !isNaN(val) && val > 0
    })
  }, [receipts])

  const decontReceipts = useMemo(() => {
    return allAvansReceipts.filter(r => {
      const dateStr = getAvansDateStr(r) || r.date || ''
      const parsed = parseDate(dateStr)
      if (!parsed) return true
      const startVal = startYear * 12 + startMonth
      const endVal = endYear * 12 + endMonth
      const receiptVal = parsed.year * 12 + parsed.month
      return receiptVal >= startVal && receiptVal <= endVal
    }).sort((a, b) => (a.userName || '').localeCompare(b.userName || ''))
  }, [allAvansReceipts, startMonth, startYear, endMonth, endYear])

  const totalAvans = decontReceipts.reduce((sum, r) => {
    const val = parseFloat(r.avansDecont || '0')
    return sum + (isNaN(val) ? 0 : val)
  }, 0)

  const handleEditDate = (receipt: Receipt) => {
    setEditingId(receipt.id)
    setEditDateValue(getAvansDateStr(receipt))
  }

  const handleSaveDate = async (receiptId: string) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avansDate: editDateValue }),
      })
      if (response.ok) {
        setEditingId(null)
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || 'Eroare la salvare')
      }
    } catch {
      alert('Eroare la salvare')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditDateValue('')
  }

  const handleDownloadHTML = () => {
    setDownloading(true)
    try {
      const rows = decontReceipts.map((r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${r.userName || '-'}</td>
          <td>${getAvansDateStr(r) || '-'}</td>
          <td class="right">${parseFloat(r.avansDecont || '0').toFixed(2)}</td>
        </tr>
      `).join('')

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Decont Avansuri</title>
<style>
  body { font-family: Arial, sans-serif; margin: 20px; }
  h2 { text-align: center; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 12px; }
  th { background-color: #d9e2f3; font-weight: bold; }
  .right { text-align: right; }
  .total { background-color: #e2efda; font-weight: bold; }
  @media print { body { margin: 0; } }
</style></head>
<body>
  <h2>DECONT AVANSURI</h2>
  <p style="text-align: center;">Perioada: ${MONTHS[startMonth - 1]} ${startYear}${startMonth !== endMonth || startYear !== endYear ? ` - ${MONTHS[endMonth - 1]} ${endYear}` : ''}</p>
  <table>
    <thead>
      <tr>
        <th style="width: 5%;">Nr.</th>
        <th style="width: 40%;">Numele Persoanei</th>
        <th style="width: 25%;">Data</th>
        <th style="width: 30%;">Suma (RON)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total">
        <td></td>
        <td>TOTAL</td>
        <td></td>
        <td class="right">${totalAvans.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
</body></html>`

      const encoder = new TextEncoder()
      const encoded = encoder.encode(html)
      const blob = new Blob([encoded], { type: 'text/html; charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const safePeriod = `${startMonth}-${startYear}${startMonth !== endMonth || startYear !== endYear ? `_${endMonth}-${endYear}` : ''}`
      link.download = `decont-avansuri-${safePeriod}.html`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading HTML:', error)
    } finally {
      setDownloading(false)
    }
  }

  const periodLabel = startMonth === endMonth && startYear === endYear
    ? `${MONTHS[startMonth - 1]} ${startYear}`
    : `${MONTHS[startMonth - 1]} ${startYear} - ${MONTHS[endMonth - 1]} ${endYear}`

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5" />
          Decont Avansuri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">De la</label>
            <div className="flex gap-2">
              <Select value={startMonth.toString()} onValueChange={(v) => setStartMonth(parseInt(v))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={startYear.toString()} onValueChange={(v) => setStartYear(parseInt(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Pana la</label>
            <div className="flex gap-2">
              <Select value={endMonth.toString()} onValueChange={(v) => setEndMonth(parseInt(v))}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={endYear.toString()} onValueChange={(v) => setEndYear(parseInt(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2025, 2026, 2027].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleDownloadHTML} disabled={downloading || decontReceipts.length === 0} className="gap-2">
            <Download className="w-4 h-4" />
            Descarca Decont
          </Button>
        </div>

        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">Perioada: <strong className="text-foreground">{periodLabel}</strong></span>
          <span className="text-sm text-muted-foreground">Total intrari: <strong className="text-foreground">{decontReceipts.length}</strong></span>
          <span className="text-sm text-muted-foreground">Total avans: <strong className="text-foreground text-green-700 dark:text-green-400">{totalAvans.toFixed(2)} RON</strong></span>
        </div>

        {decontReceipts.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nu exista deconturi in perioada selectata</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold w-12">Nr.</TableHead>
                  <TableHead className="font-semibold">Numele Persoanei</TableHead>
                  <TableHead className="font-semibold">Data Avans</TableHead>
                  <TableHead className="font-semibold">Suma (RON)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {decontReceipts.map((receipt, index) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{receipt.userName || '-'}</TableCell>
                    <TableCell>
                      {editingId === receipt.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editDateValue}
                            onChange={(e) => setEditDateValue(e.target.value)}
                            placeholder="dd.mm.yyyy"
                            className="w-32 h-8 text-sm"
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSaveDate(receipt.id)} disabled={saving}>
                            <Check className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancelEdit}>
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span>{getAvansDateStr(receipt) || '-'}</span>
                          {canEditDate && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditDate(receipt)}>
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-green-700 dark:text-green-400">
                      {parseFloat(receipt.avansDecont || '0').toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell></TableCell>
                  <TableCell className="text-foreground">TOTAL</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-green-700 dark:text-green-400">{totalAvans.toFixed(2)} RON</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

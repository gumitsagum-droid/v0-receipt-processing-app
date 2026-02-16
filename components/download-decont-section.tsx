'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download } from 'lucide-react'

interface DownloadDecontSectionProps {
  userName: string
  onFilterChange?: (month: number, year: number) => void
}

export function DownloadDecontSection({ userName, onFilterChange }: DownloadDecontSectionProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [downloading, setDownloading] = useState(false)
  
  // Notifica parintele cand se schimba filtrul
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(selectedMonth, selectedYear)
    }
  }, [selectedMonth, selectedYear, onFilterChange])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/generate-pdf?userName=${encodeURIComponent(userName)}&month=${selectedMonth}&year=${selectedYear}&type=decont`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `decont-${userName.toLowerCase().replace(/\s+/g, '-')}-${selectedMonth}-${selectedYear}.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error downloading decont:', error)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
            <SelectItem key={m} value={m.toString()}>
              {new Date(2000, m - 1).toLocaleString('ro-RO', { month: 'long' })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2025">2025</SelectItem>
          <SelectItem value="2026">2026</SelectItem>
        </SelectContent>
      </Select>
      <Button 
        onClick={handleDownload}
        disabled={downloading}
        size="sm"
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        Decont
      </Button>
    </div>
  )
}

export default DownloadDecontSection

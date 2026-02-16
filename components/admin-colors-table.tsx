'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Palette } from 'lucide-react'

const ADMIN_COLORS = [
  { name: 'Rosu', value: '#ef4444', bg: 'bg-red-100', border: 'border-red-400' },
  { name: 'Albastru', value: '#3b82f6', bg: 'bg-blue-100', border: 'border-blue-400' },
  { name: 'Verde', value: '#22c55e', bg: 'bg-green-100', border: 'border-green-400' },
  { name: 'Mov', value: '#a855f7', bg: 'bg-purple-100', border: 'border-purple-400' },
  { name: 'Portocaliu', value: '#f97316', bg: 'bg-orange-100', border: 'border-orange-400' },
  { name: 'Roz', value: '#ec4899', bg: 'bg-pink-100', border: 'border-pink-400' },
  { name: 'Cyan', value: '#06b6d4', bg: 'bg-cyan-100', border: 'border-cyan-400' },
  { name: 'Galben', value: '#eab308', bg: 'bg-yellow-100', border: 'border-yellow-400' },
]

interface AdminColorsTableProps {
  admins: User[]
  isBoss: boolean
}

export function AdminColorsTable({ admins: initialAdmins, isBoss }: AdminColorsTableProps) {
  const [admins, setAdmins] = useState(initialAdmins)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleColorChange = async (userId: string, color: string) => {
    setLoadingId(userId)
    setError(null)
    
    try {
      const response = await fetch('/api/users/admin-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, color })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Actualizeaza local instant
        setAdmins(prev => prev.map(admin => 
          admin.id === userId ? { ...admin, adminColor: color } : admin
        ))
        router.refresh()
      } else {
        setError(data.error || 'A aparut o eroare')
      }
    } catch {
      setError('A aparut o eroare')
    } finally {
      setLoadingId(null)
    }
  }

  const getColorName = (colorValue: string | undefined) => {
    const color = ADMIN_COLORS.find(c => c.value === colorValue)
    return color?.name || 'Neatribuit'
  }

  const getColorStyle = (colorValue: string | undefined) => {
    const color = ADMIN_COLORS.find(c => c.value === colorValue)
    return color || null
  }

  if (admins.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nu exista administratori
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">Culori Administratori</h3>
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      <p className="text-sm text-muted-foreground mb-4">
        Fiecare admin are o culoare atribuita. Cand un admin modifica datele unui utilizator, modificarea va fi marcata cu culoarea adminului.
      </p>
      
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-foreground font-semibold">Admin</TableHead>
              <TableHead className="text-foreground font-semibold">Nivel</TableHead>
              <TableHead className="text-foreground font-semibold">Culoare Curenta</TableHead>
              {isBoss && <TableHead className="text-foreground font-semibold text-center">Schimba Culoare</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => {
              const colorStyle = getColorStyle(admin.adminColor)
              
              return (
                <TableRow key={admin.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-foreground">
                    {admin.name}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="default"
                      className={admin.accessLevel === 3 ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
                    >
                      {admin.accessLevel === 3 ? 'Boss' : 'Admin'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {colorStyle ? (
                      <div className="flex items-center gap-2">
                        <div 
                          className={`w-6 h-6 rounded-full border-2 ${colorStyle.border}`}
                          style={{ backgroundColor: admin.adminColor }}
                        />
                        <span className="text-sm">{getColorName(admin.adminColor)}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Neatribuit</span>
                    )}
                  </TableCell>
                  {isBoss && (
                    <TableCell className="text-center">
                      {loadingId === admin.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        <Select
                          value={admin.adminColor || ''}
                          onValueChange={(value) => handleColorChange(admin.id, value)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue placeholder="Selecteaza" />
                          </SelectTrigger>
                          <SelectContent>
                            {ADMIN_COLORS.map((color) => (
                              <SelectItem key={color.value} value={color.value}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-4 h-4 rounded-full border"
                                    style={{ backgroundColor: color.value }}
                                  />
                                  {color.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Legenda culori */}
      <div className="mt-4 p-4 bg-muted/30 rounded-lg">
        <p className="text-sm font-medium mb-2">Legenda:</p>
        <div className="flex flex-wrap gap-3">
          {ADMIN_COLORS.map((color) => (
            <div key={color.value} className="flex items-center gap-1.5">
              <div 
                className="w-4 h-4 rounded-full border"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-xs text-muted-foreground">{color.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

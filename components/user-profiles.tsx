'use client'

import { useState } from 'react'
import type { User, Vacation, Receipt } from '@/lib/types'
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
import { Calendar, Receipt as ReceiptIcon, Pencil, Check, X, Shield, ArrowLeft, Download, Eye, User as UserIcon, Trash2, ImageIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ReceiptsTable } from '@/components/receipts-table'

interface UserProfilesProps {
  users: User[]
  vacations: Vacation[]
  receipts: Receipt[]
  vacationStats: Map<string, {
    totalAlocat: number
    anAnterior: number
    concediuLegal: number
    concediuMedical: number
    concediuFaraPlata: number
    concediuSpecial: number
    remaining: number
  }>
  currentUserAccessLevel?: number
  canEditAvans?: boolean
}

type ViewMode = 'main' | 'atribuire-nivel' | 'bonuri' | 'concediu'
type SubViewMode = 'list' | 'detail'

export function UserProfiles({ users, vacations, receipts, vacationStats, currentUserAccessLevel = 1, canEditAvans = false }: UserProfilesProps) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('main')
  const [subViewMode, setSubViewMode] = useState<SubViewMode>('list')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<{ userName: string, field: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [deletingVacation, setDeletingVacation] = useState<string | null>(null)
  const [savingAccessLevel, setSavingAccessLevel] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadingMultiPdf, setDownloadingMultiPdf] = useState(false)
  const [showMultiMonth, setShowMultiMonth] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [monthFrom, setMonthFrom] = useState(1)
  const [yearFrom, setYearFrom] = useState(new Date().getFullYear())
  const [monthTo, setMonthTo] = useState(new Date().getMonth() + 1)
  const [yearTo, setYearTo] = useState(new Date().getFullYear())
  
  const isBoss = currentUserAccessLevel === 3

  const getUserReceipts = (userName: string) => {
    return receipts.filter(r => r.userName === userName)
  }

  const getUserVacations = (userName: string) => {
    return vacations.filter(v => v.userName === userName)
  }

  const getVacationStatsForUser = (userName: string) => {
    return vacationStats.get(userName) || {
      totalAlocat: 21,
      anAnterior: 0,
      concediuLegal: 0,
      concediuMedical: 0,
      concediuFaraPlata: 0,
      concediuSpecial: 0,
      remaining: 21
    }
  }

  const handleEditStart = (userName: string, field: string, currentValue: number) => {
    setEditingUser({ userName, field })
    setEditValue(currentValue.toString())
  }

  const handleEditCancel = () => {
    setEditingUser(null)
    setEditValue('')
  }

  const handleEditSave = async (userName: string) => {
    if (!editingUser) return
    setSaving(true)
    try {
      const response = await fetch('/api/vacation/an-anterior', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName, days: parseInt(editValue) || 0, field: editingUser.field })
      })
      
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error saving vacation setting:', error)
    } finally {
      setSaving(false)
      setEditingUser(null)
      setEditValue('')
    }
  }

  const handleDeleteVacation = async (vacationId: string) => {
    if (!confirm('Esti sigur ca vrei sa stergi acest concediu?')) return
    setDeletingVacation(vacationId)
    try {
      const response = await fetch('/api/vacation', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacationId })
      })
      
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error deleting vacation:', error)
    } finally {
      setDeletingVacation(null)
    }
  }

  const handleAccessLevelChange = async (userId: string, newLevel: string) => {
    setSavingAccessLevel(userId)
    try {
      const response = await fetch('/api/users/access-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, accessLevel: parseInt(newLevel) })
      })
      
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Error updating access level:', error)
    } finally {
      setSavingAccessLevel(null)
    }
  }

  const handleDownloadPdf = async (userName: string, type: 'decont' | 'cheltuieli') => {
    setDownloadingPdf(true)
    try {
      const response = await fetch(`/api/generate-pdf?userName=${encodeURIComponent(userName)}&month=${selectedMonth}&year=${selectedYear}&type=${type}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type}-${userName.toLowerCase()}-${selectedMonth}-${selectedYear}.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('[v0] PDF download failed:', response.status, errorData)
        alert(`Eroare la descarcare: ${errorData.error || 'Eroare necunoscuta'}`)
      }
    } catch (error) {
      console.error('[v0] Error downloading PDF:', error)
      alert('Eroare la descarcare. Verificati consola.')
    
    } finally {
      setDownloadingPdf(false)
    }
  }

  const handleDownloadMultiMonthPdf = async (userName: string) => {
    setDownloadingMultiPdf(true)
    try {
      const response = await fetch(`/api/generate-pdf?userName=${encodeURIComponent(userName)}&monthFrom=${monthFrom}&yearFrom=${yearFrom}&monthTo=${monthTo}&yearTo=${yearTo}&type=decont`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `decont-${userName.toLowerCase()}-${monthFrom}-${yearFrom}_${monthTo}-${yearTo}.html`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('[v0] Multi-month PDF download failed:', response.status, errorData)
        alert(`Eroare la descarcare: ${errorData.error || 'Eroare necunoscuta'}`)
      }
    } catch (error) {
      console.error('[v0] Error downloading multi-month PDF:', error)
      alert('Eroare la descarcare. Verificati consola.')
    } finally {
      setDownloadingMultiPdf(false)
    }
  }

  const getAccessLevelLabel = (level: number | undefined) => {
    switch (level) {
      case 3: return 'Boss'
      case 2: return 'Admin'
      default: return 'User'
    }
  }

  const getAccessLevelColor = (level: number | undefined) => {
    switch (level) {
      case 3: return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 2: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'legal': return 'Legal'
      case 'medical': return 'Medical'
      case 'fara_plata': return 'Fara plata'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'legal': return 'bg-blue-100 text-blue-800'
      case 'medical': return 'bg-orange-100 text-orange-800'
      case 'fara_plata': return 'bg-amber-100 text-amber-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleBack = () => {
    if (subViewMode === 'detail') {
      setSubViewMode('list')
      setSelectedUser(null)
    } else {
      setViewMode('main')
    }
  }

  const handleSelectUser = (user: User) => {
    setSelectedUser(user)
    setSubViewMode('detail')
  }

  // Main view with 3 buttons
  if (viewMode === 'main') {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isBoss && (
            <Card 
              className="border-border hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => setViewMode('atribuire-nivel')}
            >
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <Shield className="w-12 h-12 text-purple-600 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-semibold text-foreground">Atribuire Nivel</h3>
                <p className="text-sm text-muted-foreground mt-1">Seteaza nivelul de acces pentru utilizatori</p>
              </CardContent>
            </Card>
          )}
          
          <Card 
            className="border-border hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group"
            onClick={() => setViewMode('bonuri')}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <ReceiptIcon className="w-12 h-12 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold text-foreground">Bonuri</h3>
              <p className="text-sm text-muted-foreground mt-1">Vezi bonurile fiecarui utilizator</p>
            </CardContent>
          </Card>
          
          <Card 
            className="border-border hover:border-green-500 hover:shadow-md transition-all cursor-pointer group"
            onClick={() => setViewMode('concediu')}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
              <Calendar className="w-12 h-12 text-green-600 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-lg font-semibold text-foreground">Concediu</h3>
              <p className="text-sm text-muted-foreground mt-1">Vezi concediile fiecarui utilizator</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Atribuire Nivel view
  if (viewMode === 'atribuire-nivel') {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={handleBack} className="gap-2 bg-transparent">
          <ArrowLeft className="w-4 h-4" />
          Inapoi
        </Button>
        
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Shield className="w-5 h-5" />
              Atribuire Niveluri de Acces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Nivel 1 = User (acces doar la propriile date) | Nivel 2 = Admin (acces extins) | Nivel 3 = Boss (acces total)
            </p>
            <div className="rounded-lg border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Nume</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Nivel Actual</TableHead>
                    <TableHead className="font-semibold">Schimba Nivel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const accessLevel = user.accessLevel || (user.role === 'admin' ? 2 : 1)
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccessLevelColor(accessLevel)}`}>
                            {getAccessLevelLabel(accessLevel)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={accessLevel.toString()}
                            onValueChange={(value) => handleAccessLevelChange(user.id, value)}
                            disabled={savingAccessLevel === user.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">User</SelectItem>
                              <SelectItem value="2">Admin</SelectItem>
                              <SelectItem value="3">Boss</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Bonuri view - list or detail
  if (viewMode === 'bonuri') {
    if (subViewMode === 'detail' && selectedUser) {
      const userReceipts = getUserReceipts(selectedUser.name)
      const stats = getVacationStatsForUser(selectedUser.name)
      
      return (
        <div className="space-y-6">
          <Button variant="outline" onClick={handleBack} className="gap-2 bg-transparent">
            <ArrowLeft className="w-4 h-4" />
            Inapoi la lista
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-foreground">{selectedUser.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
            </div>
            
            {/* Download buttons */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <SelectItem key={m} value={m.toString()}>
                        {new Date(2000, m-1).toLocaleString('ro-RO', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={() => handleDownloadPdf(selectedUser.name, 'decont')}
                disabled={downloadingPdf}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Decont
              </Button>
              <Button 
                onClick={() => setShowMultiMonth(!showMultiMonth)}
                variant={showMultiMonth ? "secondary" : "outline"}
                className="gap-2"
              >
                <Calendar className="w-4 h-4" />
                Multi-Luna
              </Button>
            </div>
          </div>

          {/* Multi-month selector */}
          {showMultiMonth && selectedUser && (
            <Card className="border-border bg-muted/30">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium text-foreground">De la:</span>
                  <Select value={monthFrom.toString()} onValueChange={(v) => setMonthFrom(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <SelectItem key={m} value={m.toString()}>
                          {new Date(2000, m-1).toLocaleString('ro-RO', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={yearFrom.toString()} onValueChange={(v) => setYearFrom(parseInt(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm font-medium text-foreground">Pana la:</span>
                  <Select value={monthTo.toString()} onValueChange={(v) => setMonthTo(parseInt(v))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                        <SelectItem key={m} value={m.toString()}>
                          {new Date(2000, m-1).toLocaleString('ro-RO', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={yearTo.toString()} onValueChange={(v) => setYearTo(parseInt(v))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => handleDownloadMultiMonthPdf(selectedUser.name)}
                    disabled={downloadingMultiPdf}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {downloadingMultiPdf ? 'Se descarca...' : 'Descarca Decont'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Stats Card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Nr. Bonuri</p>
                <p className="text-2xl font-bold text-foreground">{userReceipts.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Bonuri</p>
                <p className="text-2xl font-bold text-accent">{userReceipts.reduce((sum, r) => sum + (r.amount || 0), 0).toFixed(2)} RON</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Zile Concediu Ramase</p>
                <p className="text-2xl font-bold text-green-600">{stats.remaining}</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Balanta Cumulata</p>
                {(() => {
                  // Balanta = Total Bonuri - Avans spre Decontare
                  const totalAvans = userReceipts.reduce((sum, r) => {
                    const avans = parseFloat(r.avansDecont || '0') || 0
                    return sum + avans
                  }, 0)
                  const totalBonuri = userReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
                  const balanta = totalBonuri - totalAvans
                  const isPositive = balanta >= 0
                  return (
                    <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {balanta.toFixed(2)} RON
                    </p>
                  )
                })()}
              </CardContent>
            </Card>
          </div>
          
          {/* Receipts Table */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Bonurile lui {selectedUser.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <ReceiptsTable 
                receipts={userReceipts}
                showUserColumn={false}
                canDownload={true}
                canEdit={true}
                canEditAllFields={true}
                canEditAvans={canEditAvans}
              />
            </CardContent>
          </Card>
        </div>
      )
    }
    
    // User list for bonuri
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={handleBack} className="gap-2 bg-transparent">
          <ArrowLeft className="w-4 h-4" />
          Inapoi
        </Button>
        
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ReceiptIcon className="w-5 h-5" />
              Selecteaza un utilizator pentru a vedea bonurile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => {
                const userReceipts = getUserReceipts(user.name)
                const total = userReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
                
                return (
                  <Card 
                    key={user.id}
                    className="border-border hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleSelectUser(user)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{user.name}</h4>
                          <p className="text-sm text-muted-foreground">{userReceipts.length} bonuri - {total.toFixed(2)} RON</p>
                        </div>
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Concediu view - list or detail
  if (viewMode === 'concediu') {
    if (subViewMode === 'detail' && selectedUser) {
      const userVacations = getUserVacations(selectedUser.name)
      const stats = getVacationStatsForUser(selectedUser.name)
      const isEditingAlocat = editingUser?.userName === selectedUser.name && editingUser?.field === 'totalAllocated'
      const isEditingAnAnterior = editingUser?.userName === selectedUser.name && editingUser?.field === 'anAnterior'
      
      return (
        <div className="space-y-6">
          <Button variant="outline" onClick={handleBack} className="gap-2 bg-transparent">
            <ArrowLeft className="w-4 h-4" />
            Inapoi la lista
          </Button>
          
          <div>
            <h3 className="text-xl font-bold text-foreground">{selectedUser.name}</h3>
            <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
          </div>
          
          {/* Vacation Summary */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Sumar Concedii</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold bg-emerald-100 dark:bg-emerald-900/30">Alocat</TableHead>
                      <TableHead className="font-semibold bg-indigo-100 dark:bg-indigo-900/30">An Anterior</TableHead>
                      <TableHead className="font-semibold bg-blue-100 dark:bg-blue-900/30">Legal</TableHead>
                      <TableHead className="font-semibold bg-orange-100 dark:bg-orange-900/30">Medical</TableHead>
                      <TableHead className="font-semibold bg-amber-100 dark:bg-amber-900/30">Fara Plata</TableHead>
                      <TableHead className="font-semibold bg-green-100 dark:bg-green-900/30">Total Disponibil</TableHead>
                      <TableHead className="font-semibold bg-green-200 dark:bg-green-800/30">Ramas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="bg-emerald-50 dark:bg-emerald-900/10">
                        {isBoss && isEditingAlocat ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-16 h-7 text-sm"
                              min="0"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEditSave(selectedUser.name)}
                              disabled={saving}
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={handleEditCancel}
                              disabled={saving}
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ) : isBoss ? (
                          <div className="flex items-center gap-2">
                            <span>{stats.totalAlocat}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEditStart(selectedUser.name, 'totalAllocated', stats.totalAlocat)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span>{stats.totalAlocat}</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-indigo-50 dark:bg-indigo-900/10">
                        {isBoss && isEditingAnAnterior ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-16 h-7 text-sm"
                              min="0"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => handleEditSave(selectedUser.name)}
                              disabled={saving}
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={handleEditCancel}
                              disabled={saving}
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        ) : isBoss ? (
                          <div className="flex items-center gap-2">
                            <span>{stats.anAnterior}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEditStart(selectedUser.name, 'anAnterior', stats.anAnterior)}
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <span>{stats.anAnterior}</span>
                        )}
                      </TableCell>
                      <TableCell className="bg-blue-50 dark:bg-blue-900/10">{stats.concediuLegal}</TableCell>
                      <TableCell className="bg-orange-50 dark:bg-orange-900/10">{stats.concediuMedical}</TableCell>
                      <TableCell className="bg-amber-50 dark:bg-amber-900/10">{stats.concediuFaraPlata}</TableCell>
                      <TableCell className="bg-green-50 dark:bg-green-900/10 font-semibold">{stats.totalAlocat + stats.anAnterior}</TableCell>
                      <TableCell className="bg-green-100 dark:bg-green-800/10 font-bold text-green-700 dark:text-green-400">{stats.remaining}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {/* Vacation History */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Istoric Concedii</CardTitle>
            </CardHeader>
            <CardContent>
              {userVacations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nu exista concedii inregistrate</p>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Tip</TableHead>
                        <TableHead className="font-semibold">Zile</TableHead>
                        <TableHead className="font-semibold">Data Inceput</TableHead>
                        <TableHead className="font-semibold">Data Sfarsit</TableHead>
                        <TableHead className="font-semibold">Document</TableHead>
                        {isBoss && <TableHead className="font-semibold">Actiuni</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userVacations.map((vacation) => (
                        <TableRow key={vacation.id}>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(vacation.type)}`}>
                              {getTypeLabel(vacation.type)}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">{vacation.days}</TableCell>
                          <TableCell>{vacation.startDate}</TableCell>
                          <TableCell>{vacation.endDate}</TableCell>
                          <TableCell>
                            {vacation.imageUrl ? (
                              <a
                                href={vacation.imageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                              >
                                <ImageIcon className="w-4 h-4" />
                                Vizualizeaza
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          {isBoss && (
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteVacation(vacation.id)}
                                disabled={deletingVacation === vacation.id}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }
    
    // User list for concediu
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={handleBack} className="gap-2 bg-transparent">
          <ArrowLeft className="w-4 h-4" />
          Inapoi
        </Button>
        
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="w-5 h-5" />
              Selecteaza un utilizator pentru a vedea concediile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => {
                const stats = getVacationStatsForUser(user.name)
                
                return (
                  <Card 
                    key={user.id}
                    className="border-border hover:border-green-500 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleSelectUser(user)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{user.name}</h4>
                          <p className="text-sm text-muted-foreground">{stats.remaining} zile ramase din {stats.totalAlocat + stats.anAnterior}</p>
                        </div>
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

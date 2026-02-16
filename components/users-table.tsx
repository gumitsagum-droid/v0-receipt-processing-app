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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Loader2, Trash2, Eye, EyeOff, Pencil } from 'lucide-react'

interface UsersTableProps {
  users: User[]
  currentUserId: string
  currentUserAccessLevel?: number
}

export function UsersTable({ users, currentUserId, currentUserAccessLevel = 1 }: UsersTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [editPasswordUser, setEditPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const router = useRouter()
  
  const isBoss = currentUserAccessLevel === 3
  
  const togglePassword = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }))
  }
  
  const openEditPassword = (user: User) => {
    setEditPasswordUser(user)
    setNewPassword('')
    setPasswordError('')
  }
  
  const handleSavePassword = async () => {
    if (!editPasswordUser) return
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Parola trebuie sa aiba minim 6 caractere')
      return
    }
    
    setSavingPassword(true)
    setPasswordError('')
    
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: editPasswordUser.email, newPassword })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setEditPasswordUser(null)
        setNewPassword('')
        router.refresh()
      } else {
        setPasswordError(data.error || 'A aparut o eroare')
      }
    } catch {
      setPasswordError('A aparut o eroare de conexiune')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user)
    setPin('')
    setPinError('')
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (pin !== '240697') {
      setPinError('PIN incorect')
      return
    }
    
    if (!userToDelete) return
    
    setDeleting(true)
    setPinError('')
    
    try {
      const response = await fetch('/api/users/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userToDelete.id, pin })
      })
      
      if (response.ok) {
        setDeleteDialogOpen(false)
        setUserToDelete(null)
        setPin('')
        router.refresh()
      } else {
        const data = await response.json()
        setPinError(data.error || 'A aparut o eroare')
      }
    } catch {
      setPinError('A aparut o eroare')
    } finally {
      setDeleting(false)
    }
  }

  const handleAccessLevelChange = async (userId: string, newLevel: string) => {
    setLoadingId(userId)
    setError(null)
    
    try {
      const response = await fetch('/api/users/access-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, accessLevel: parseInt(newLevel) })
      })
      
      if (response.ok) {
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.error || 'A aparut o eroare')
      }
    } catch {
      setError('A aparut o eroare')
    } finally {
      setLoadingId(null)
    }
  }

  const getAccessLevelLabel = (level: number | undefined, role?: string) => {
    if (level === 3) return 'Boss'
    if (level === 2 || role === 'admin') return 'Admin'
    return 'User'
  }

  const getAccessLevelColor = (level: number | undefined, role?: string) => {
    if (level === 3) return 'bg-purple-600 text-white'
    if (level === 2 || role === 'admin') return 'default'
    return 'secondary'
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nu exista utilizatori
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {/* Dialog confirmare stergere cu PIN */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Sterge Utilizator</DialogTitle>
            <DialogDescription>
              Esti sigur ca vrei sa stergi utilizatorul <strong>{userToDelete?.name}</strong>?
              <br />
              Aceasta actiune este ireversibila si va sterge toate datele asociate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Introdu PIN-ul pentru confirmare:</label>
              <Input
                type="password"
                placeholder="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full"
              />
              {pinError && (
                <p className="text-sm text-red-500">{pinError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="bg-transparent"
            >
              Anuleaza
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting || !pin}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se sterge...
                </>
              ) : (
                'Sterge'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-foreground font-semibold">Nume</TableHead>
              <TableHead className="text-foreground font-semibold">Email</TableHead>
              {isBoss && (
                <TableHead className="text-foreground font-semibold">Parola</TableHead>
              )}
              <TableHead className="text-foreground font-semibold">Nivel Acces</TableHead>
              <TableHead className="text-foreground font-semibold">Inregistrat</TableHead>
              <TableHead className="text-foreground font-semibold text-center">Actiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const accessLevel = user.accessLevel || (user.role === 'admin' ? 2 : 1)
              
              return (
                <TableRow key={user.id} className="hover:bg-muted/30">
                  <TableCell className="font-medium text-foreground">
                    {user.name}
                    {user.id === currentUserId && (
                      <span className="text-xs text-muted-foreground ml-2">(tu)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  {isBoss && (
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {showPasswords[user.id] 
                            ? (user.plainPassword || '***') 
                            : '********'
                          }
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => togglePassword(user.id)}
                          title={showPasswords[user.id] ? 'Ascunde parola' : 'Arata parola'}
                        >
                          {showPasswords[user.id] 
                            ? <EyeOff className="w-3 h-3" /> 
                            : <Eye className="w-3 h-3" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-primary hover:text-primary"
                          onClick={() => openEditPassword(user)}
                          title="Schimba parola"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Badge 
                      variant={getAccessLevelColor(accessLevel, user.role) as "default" | "secondary"}
                      className={accessLevel === 3 ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
                    >
                      {getAccessLevelLabel(accessLevel, user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString('ro-RO')}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {user.id !== currentUserId ? (
                        <>
                          {loadingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Select
                              value={accessLevel.toString()}
                              onValueChange={(value) => handleAccessLevelChange(user.id, value)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">User</SelectItem>
                                <SelectItem value="2">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {isBoss && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(user)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-100"
                              title="Sterge utilizator"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* Dialog Schimbare Parola de catre Boss */}
      <Dialog open={!!editPasswordUser} onOpenChange={(open) => { if (!open) setEditPasswordUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schimba parola pentru {editPasswordUser?.name}</DialogTitle>
            <DialogDescription>
              Introdu noua parola pentru utilizatorul {editPasswordUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="boss-new-password">Parola Noua</Label>
              <Input
                id="boss-new-password"
                type="text"
                placeholder="Minim 6 caractere"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditPasswordUser(null)}
              disabled={savingPassword}
              className="bg-transparent"
            >
              Anuleaza
            </Button>
            <Button
              onClick={handleSavePassword}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se salveaza...
                </>
              ) : (
                'Salveaza Parola'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

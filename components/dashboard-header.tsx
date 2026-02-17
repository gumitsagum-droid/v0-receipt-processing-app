'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { User } from '@/lib/types'
import { logoutAction } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User as UserIcon, LogOut, Shield, ChevronDown } from 'lucide-react'

interface DashboardHeaderProps {
  user: User
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter()
  
  // Get access level
  const accessLevel = user.accessLevel || (user.role === 'admin' ? 2 : 1)
  const isAdminOrBoss = accessLevel >= 2
  
  const getAccessLevelLabel = () => {
    switch (accessLevel) {
      case 3: return 'Boss'
      case 2: return 'Admin'
      default: return 'User'
    }
  }
  
  const getAccessLevelColor = () => {
    switch (accessLevel) {
      case 3: return 'bg-purple-600 text-white'
      case 2: return 'bg-primary text-primary-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const handleLogout = async () => {
    await logoutAction()
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image 
              src="/logo.png" 
              alt="Ultrafilter Logo" 
              width={40} 
              height={32}
              className="object-contain"
              style={{ width: "auto", height: "auto" }}
            />
            <h1 className="text-xl font-bold text-primary">DecontUfr</h1>
          </Link>

          <div className="flex items-center gap-4">
            {isAdminOrBoss && (
              <Link href="/admin">
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Shield className="w-4 h-4" />
                  Panou Admin
                </Button>
              </Link>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <UserIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{user.name}</span>
                  {accessLevel >= 2 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getAccessLevelColor()}`}>
                      {getAccessLevelLabel()}
                    </span>
                  )}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled className="text-muted-foreground">
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Deconectare
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}

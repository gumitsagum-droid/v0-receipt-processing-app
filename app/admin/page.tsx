import { redirect } from 'next/navigation'
import { getSession, getAllUsers, getAdmins } from '@/lib/auth'
import { getAllReceipts } from '@/lib/receipts'
import { getVacations, getAllVacationStats } from '@/lib/vacations'
import { DashboardHeader } from '@/components/dashboard-header'
import { ReceiptsTable } from '@/components/receipts-table'
import { UsersTable } from '@/components/users-table'
import { UserProfiles } from '@/components/user-profiles'
import { AdminColorsTable } from '@/components/admin-colors-table'
import { DecontReport } from '@/components/decont-report'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function AdminPage() {
  const user = await getSession()
  
  if (!user) {
    redirect('/login')
  }

  // Check access level - allow Admin (2) and Boss (3)
  const accessLevel = user.accessLevel || (user.role === 'admin' ? 2 : 1)
  if (accessLevel < 2) {
    redirect('/dashboard')
  }

  const [allReceipts, allUsers, allVacations, vacationStats, admins] = await Promise.all([
    getAllReceipts(),
    getAllUsers(),
    getVacations(),
    getAllVacationStats(),
    getAdmins(),
  ])
  
  // Calculate stats
  const totalAmount = allReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalReceipts = allReceipts.length
  const totalUsers = allUsers.length
  const adminUsers = allUsers.filter(u => u.role === 'admin').length
  
  // Doar Boss (accessLevel 3) si Stelian Covrig pot edita Avans spre Decontare
  const isBossOrStelian = accessLevel === 3 || 
    (user.name.toLowerCase().includes('covrig') && user.name.toLowerCase().includes('stelian'))

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Panou Administrare</h2>
          <p className="text-muted-foreground">Gestioneaza utilizatorii si vezi toate bonurile</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Suma
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-accent">{totalAmount.toFixed(2)} RON</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Bonuri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalReceipts}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Utilizatori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
            </CardContent>
          </Card>
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Administratori
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{adminUsers}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="receipts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="receipts">Toate Bonurile</TabsTrigger>
            <TabsTrigger value="profiles">Profile Angajati</TabsTrigger>
            <TabsTrigger value="decont">Decont</TabsTrigger>
            <TabsTrigger value="users">Utilizatori</TabsTrigger>
          </TabsList>
          
          <TabsContent value="receipts">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Toate bonurile incarcate</CardTitle>
              </CardHeader>
              <CardContent>
                <ReceiptsTable 
                  receipts={allReceipts} 
                  showUserColumn={true}
                  canDownload={true}
                  canEdit={true}
                  canEditAllFields={true}
                  canEditAvans={isBossOrStelian}
                  isBoss={accessLevel === 3}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="profiles">
            <UserProfiles 
              users={allUsers}
              vacations={allVacations}
              receipts={allReceipts}
              vacationStats={vacationStats}
              currentUserAccessLevel={accessLevel}
              canEditAvans={isBossOrStelian}
            />
          </TabsContent>
          
          <TabsContent value="decont">
            <DecontReport receipts={allReceipts} canEditDate={isBossOrStelian} />
          </TabsContent>
          
          <TabsContent value="users">
            <div className="space-y-6">
              {/* Tabel culori admini */}
              <Card className="border-border">
                <CardContent className="pt-6">
                  <AdminColorsTable admins={admins} isBoss={accessLevel === 3} />
                </CardContent>
              </Card>
              
              {/* Tabel utilizatori */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Gestionare Utilizatori</CardTitle>
                </CardHeader>
                <CardContent>
                  <UsersTable users={allUsers} currentUserId={user.id} currentUserAccessLevel={accessLevel} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getAllReceipts } from '@/lib/receipts'
import { getVacations, getAllVacationStats } from '@/lib/vacations'
import { DashboardHeader } from '@/components/dashboard-header'
import { ReceiptsWithFilter } from '@/components/receipts-with-filter'
import { VacationSection } from '@/components/vacation-section'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActionButtons } from '@/components/action-buttons'
import { Receipt, Calendar, Shield, Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'


export default async function DashboardPage() {
  const user = await getSession()
  
  if (!user) {
    redirect('/login')
  }

  const allReceipts = await getAllReceipts()
  const allVacations = await getVacations()
  const vacationStats = await getAllVacationStats()
  
  // Fiecare user vede DOAR propriile bonuri si concedii
  const accessLevel = user.accessLevel || (user.role === 'admin' ? 2 : 1)
  const isAdminOrBoss = accessLevel >= 2
  
  // Filtreaza pentru utilizatorul curent - TOTI vad doar propriile date aici
  const myReceipts = allReceipts.filter(r => r.userName === user.name)
  const myVacations = allVacations.filter(v => v.userId === user.id || v.userName === user.name)
  
  // Calculeaza statisticile personale
  const totalBonuri = myReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
  const totalAvans = myReceipts.reduce((sum, r) => {
    const avans = parseFloat(r.avansDecont || '0') || 0
    return sum + avans
  }, 0)
  // Balanta = Total Bonuri - Avans spre Decontare
  // Pozitiv = firma iti datoreaza bani, Negativ = mai ai de justificat din avans
  const balantaCumulata = totalBonuri - totalAvans
  const userVacationStats = vacationStats.get(user.name) || {
    totalAlocat: 21,
    anAnterior: 0,
    remaining: 21
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />
      
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Action Buttons */}
        <ActionButtons />
        
        {/* Statistici Personale - 4 carduri + legenda */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Nr. Bonuri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {myReceipts.length}
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Total Bonuri
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-accent">
                {totalBonuri.toFixed(2)} RON
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Zile Concediu Ramase
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">
                {userVacationStats.remaining}
              </p>
              <p className="text-xs text-muted-foreground">
                din {userVacationStats.totalAlocat + userVacationStats.anAnterior} disponibile
              </p>
            </CardContent>
          </Card>
          
          <Card className={`border-2 ${balantaCumulata >= 0 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                {balantaCumulata >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                Balanta Cumulata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${balantaCumulata >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balantaCumulata.toFixed(2)} RON
              </p>
              <p className="text-xs text-muted-foreground">
                Avans: {totalAvans.toFixed(2)} RON
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Legenda Balanta */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-green-700 dark:text-green-400">Suma de primit</span>
            <span className="text-xs text-green-600 dark:text-green-500">(bonuri {'>'} avans)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm font-medium text-red-700 dark:text-red-400">Suma de restituit</span>
            <span className="text-xs text-red-600 dark:text-red-500">(bonuri {'<'} avans)</span>
          </div>
        </div>
        
        {/* Link Panou Admin pentru Admin/Boss */}
        {isAdminOrBoss && (
          <div className="mb-8">
            <Link href="/admin">
              <Card className="border-border hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="font-semibold text-foreground">Panou Administrativ</p>
                      <p className="text-sm text-muted-foreground">Gestioneaza utilizatori si date</p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-purple-600">
                    {accessLevel === 3 ? 'Boss' : 'Admin'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Bonurile mele Section */}
        <div id="receipts-section" className="mb-8">
          <ReceiptsWithFilter 
            receipts={myReceipts}
            userName={user.name}
            canEdit={true}
          />
        </div>

        {/* Concediu Section */}
        <div id="vacation-section">
          <VacationSection 
            vacations={myVacations}
            vacationStats={vacationStats}
            isAdmin={false}
            currentUserName={user.name}
          />
        </div>
      </main>
    </div>
  )
}

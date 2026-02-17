import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Receipt, Shield, Users, Upload } from 'lucide-react'

export default async function HomePage() {
  const user = await getSession()
  
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image 
                src="/logo.png" 
                alt="Ultrafilter Logo" 
                width={40} 
                height={32}
                className="object-contain"
                style={{ width: 'auto', height: 'auto' }}
              />
              <h1 className="text-xl font-bold text-primary">DecontUfr</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Autentificare</Button>
              </Link>
              <Link href="/register">
                <Button>Inregistrare</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 max-w-7xl">
        <section className="py-20 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-balance">
            Gestioneaza bonurile fiscale cu usurinta
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
            Incarca poza cu bonul si aplicatia extrage automat toate informatiile importante. 
            Tine evidenta cheltuielilor intr-un mod simplu si eficient.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                <Upload className="w-5 h-5" />
                Incepe acum
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Am deja cont
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-t border-border">
          <h3 className="text-2xl font-bold text-foreground text-center mb-12">
            Cum functioneaza
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link href="/register" className="text-center p-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-md transition-all cursor-pointer">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">Incarca poza</h4>
              <p className="text-muted-foreground">
                Fotografiaza bonul si incarca-l in aplicatie
              </p>
            </Link>
            <div className="text-center p-6 rounded-lg bg-card border border-border">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">Extragere automata</h4>
              <p className="text-muted-foreground">
                AI-ul extrage suma, magazinul, data si numarul bonului
              </p>
            </div>
            <Link href="/register" className="text-center p-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-md transition-all cursor-pointer">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">Colaborare</h4>
              <p className="text-muted-foreground">
                Toti utilizatorii vad bonurile incarcate de echipa
              </p>
            </Link>
          </div>
        </section>

        {/* Admin feature */}
        <section className="py-16 border-t border-border">
          <div className="flex flex-col md:flex-row items-center gap-8 bg-card p-8 rounded-lg border border-border">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h4 className="text-xl font-semibold text-foreground mb-2">Panou de administrare</h4>
              <p className="text-muted-foreground">
                Administratorii pot vedea toate bonurile, descarca pozele si gestiona utilizatorii. 
                Primul utilizator care se inregistreaza devine automat administrator.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 max-w-7xl text-center text-muted-foreground">
          <p>DecontUfr - Gestionare bonuri fiscale</p>
        </div>
      </footer>
    </div>
  )
}

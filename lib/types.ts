export interface User {
  id: string
  email: string
  name: string
  password: string
  role: 'user' | 'admin'
  accessLevel: 1 | 2 | 3 // 1 = User, 2 = Admin, 3 = Boss
  adminColor?: string // Culoarea atribuita adminului
  plainPassword?: string // Parola in clar (vizibila doar pentru Boss)
  createdAt: string
}

export interface Receipt {
  id: string
  userId: string
  userName: string
  amount: number
  storeName: string
  date: string
  receiptNumber: string
  imageUrl: string
  createdAt: string
  cardFirma?: string
  // Coloane noi
  avansDecont?: string
  avansDate?: string // Data cand Stelian a introdus avansul
  observatiiLucrare?: string
  concediuLegal?: number
  concediuMedical?: number
  concediuFaraPlata?: number
  concediuAlocat?: number
  concediuAnAnterior?: number
  // Tracking modificari
  modifiedBy?: string // Numele adminului care a modificat
  modifiedByColor?: string // Culoarea adminului
  modifiedAt?: string // Data modificarii
}

export interface Vacation {
  id: string
  userId: string
  userName: string
  type: 'legal' | 'medical' | 'fara_plata'
  days: number
  startDate: string
  endDate: string
  imageUrl: string
  createdAt: string
  month: number
  year: number
}

export interface UsersData {
  users: User[]
}

export interface ReceiptsData {
  receipts: Receipt[]
}

export interface VacationsData {
  vacations: Vacation[]
}

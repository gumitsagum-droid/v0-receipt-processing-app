import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getAllReceipts } from '@/lib/receipts'
import { getVacationStats, getVacationsByUserAndMonth } from '@/lib/vacations'

// Logo Ultrafilter ca SVG inline
function getLogoAsBase64(): string {
  const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="75" viewBox="0 0 120 75">
    <rect x="10" y="5" width="100" height="8" fill="#0066b3"/>
    <rect x="10" y="15" width="100" height="8" fill="#0066b3"/>
    <rect x="10" y="25" width="100" height="8" fill="#0066b3"/>
    <rect x="10" y="35" width="100" height="8" fill="#0066b3"/>
    <rect x="10" y="45" width="100" height="8" fill="#0066b3"/>
    <rect x="10" y="55" width="100" height="8" fill="#0066b3"/>
    <text x="60" y="72" font-family="Arial" font-size="14" font-weight="bold" fill="#0066b3" text-anchor="middle">ultrafilter</text>
  </svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svgLogo).toString('base64')}`
}

export async function GET(request: Request) {
  try {
    const user = await getSession()
    
    if (!user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userName = searchParams.get('userName')
    const filterMonth = searchParams.get('month') // Luna specifica pentru filtrare (optional)
    const filterYear = searchParams.get('year') // Anul specific pentru filtrare (optional)
    const monthFrom = searchParams.get('monthFrom') // Multi-month: luna de start
    const yearFrom = searchParams.get('yearFrom') // Multi-month: anul de start
    const monthTo = searchParams.get('monthTo') // Multi-month: luna de sfarsit
    const yearTo = searchParams.get('yearTo') // Multi-month: anul de sfarsit
    const isMultiMonth = monthFrom && yearFrom && monthTo && yearTo

    if (!userName) {
      return NextResponse.json({ error: 'Numele utilizatorului lipseste' }, { status: 400 })
    }

    // Verifica daca utilizatorul poate accesa datele:
    // - Admini/Boss pot descarca pentru oricine
    // - Userii normali pot descarca doar pentru ei insisi
    const accessLevel = user.accessLevel || (user.role === 'admin' ? 2 : 1)
    const isAdminOrBoss = accessLevel >= 2
    
    if (!isAdminOrBoss && user.name !== userName) {
      return NextResponse.json({ error: 'Nu ai permisiunea sa descarci decontul altui utilizator' }, { status: 403 })
    }

    console.log('[v0] generate-pdf: STEP 1 - getting all receipts')
    const allReceipts = await getAllReceipts()
    console.log('[v0] generate-pdf: STEP 2 - total receipts:', allReceipts.length, 'userName:', userName, 'month:', filterMonth, 'year:', filterYear, 'isMultiMonth:', !!isMultiMonth)
    
    // Filtreaza bonurile pentru utilizatorul selectat
    const allUserReceipts = allReceipts.filter(r => r.userName === userName)
    console.log('[v0] generate-pdf: user receipts:', allUserReceipts.length)

    // Functie pentru a extrage luna si anul din data bonului (format DD.MM.YYYY)
    const getMonthYear = (dateStr: string): { month: number; year: number } | null => {
      if (!dateStr) return null
      const parts = dateStr.split('.')
      if (parts.length === 3) {
        return {
          month: parseInt(parts[1], 10),
          year: parseInt(parts[2], 10)
        }
      }
      return null
    }

    // Determina luna si anul pentru filtrare
    let month: number
    let year: number

    if (filterMonth && filterYear) {
      // Foloseste luna si anul din parametri
      month = parseInt(filterMonth, 10)
      year = parseInt(filterYear, 10)
    } else if (allUserReceipts.length > 0 && allUserReceipts[0].date) {
      // Extrage din primul bon
      const firstDate = getMonthYear(allUserReceipts[0].date)
      if (firstDate) {
        month = firstDate.month
        year = firstDate.year
      } else {
        const now = new Date()
        month = now.getMonth() + 1
        year = now.getFullYear()
      }
    } else {
      const now = new Date()
      month = now.getMonth() + 1
      year = now.getFullYear()
    }

    // Filtreaza bonurile
    let userReceipts
    if (isMultiMonth) {
      const mFrom = parseInt(monthFrom, 10)
      const yFrom = parseInt(yearFrom, 10)
      const mTo = parseInt(monthTo, 10)
      const yTo = parseInt(yearTo, 10)
      const startVal = yFrom * 12 + mFrom
      const endVal = yTo * 12 + mTo
      
      userReceipts = allUserReceipts.filter(r => {
        const dateInfo = getMonthYear(r.date)
        if (!dateInfo) return false
        const val = dateInfo.year * 12 + dateInfo.month
        return val >= startVal && val <= endVal
      })
    } else {
      userReceipts = allUserReceipts.filter(r => {
        const dateInfo = getMonthYear(r.date)
        if (!dateInfo) return false
        return dateInfo.month === month && dateInfo.year === year
      })
    }

    console.log('[v0] generate-pdf: STEP 3 - filtered receipts:', userReceipts.length)
    // Sorteaza bonurile dupa data
    userReceipts.sort((a, b) => {
      const dateA = getMonthYear(a.date)
      const dateB = getMonthYear(b.date)
      if (!dateA || !dateB) return 0
      const dayA = parseInt(a.date.split('.')[0], 10)
      const dayB = parseInt(b.date.split('.')[0], 10)
      return dayA - dayB
    })

    // Calculeaza totalul
    const total = userReceipts.reduce((sum, r) => sum + r.amount, 0)
    console.log('[v0] generate-pdf: STEP 4 - total:', total)

    // Fetch vacation stats for this user (total vacation days taken)
    console.log('[v0] generate-pdf: STEP 5 - getting vacation stats')
    const vacationStats = await getVacationStats(userName)
    console.log('[v0] generate-pdf: STEP 5 done - vacationStats:', JSON.stringify(vacationStats))
    
    // Fetch vacation data for this specific month
    console.log('[v0] generate-pdf: STEP 6 - getting vacations by month')
    const vacationThisMonth = await getVacationsByUserAndMonth(userName, month, year)
    console.log('[v0] generate-pdf: STEP 6 done - vacationThisMonth:', JSON.stringify(vacationThisMonth))

    // Get the logo as base64
    const logoBase64 = getLogoAsBase64()
    console.log('[v0] generate-pdf: STEP 7 - generating HTML')

    // Genereaza HTML pentru PDF
    const periodLabel = isMultiMonth 
      ? `${new Date(2000, parseInt(monthFrom, 10) - 1).toLocaleString('ro-RO', { month: 'long' })} ${yearFrom} - ${new Date(2000, parseInt(monthTo, 10) - 1).toLocaleString('ro-RO', { month: 'long' })} ${yearTo}`
      : undefined
    const html = generatePDFHtml(userName, userReceipts, month, year, total, logoBase64, {
      legalTotal: vacationStats.concediuLegal,
      medicalTotal: vacationStats.concediuMedical,
      faraPlataTotal: vacationStats.concediuFaraPlata,
      legalThisMonth: vacationThisMonth.legal,
      medicalThisMonth: vacationThisMonth.medical,
      faraPlataThisMonth: vacationThisMonth.faraPlata,
      totalAlocat: vacationStats.totalAlocat,
      anAnterior: vacationStats.anAnterior,
      remaining: vacationStats.remaining
    }, periodLabel)

    // Returneaza HTML ca fisier - encodam explicit in UTF-8 pentru caractere romanesti
    const encoder = new TextEncoder()
    const encoded = encoder.encode(html)
    // Sanitize userName for Content-Disposition header (remove diacritics)
    const safeUserName = userName
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
    const periodPart = isMultiMonth ? `${monthFrom}-${yearFrom}_${monthTo}-${yearTo}` : `${month}-${year}`
    return new NextResponse(encoded, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="decont-${safeUserName}-${periodPart}.html"`,
      },
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : ''
    console.error('[v0] PDF generation error:', errMsg, errStack)
    return NextResponse.json({ error: `Eroare la generarea PDF: ${errMsg}` }, { status: 500 })
  }
}

interface ReceiptData {
  date: string
  receiptNumber: string
  amount: number
  storeName: string
  cardFirma?: string
  avansDecont?: string
  avansDate?: string
  observatiiLucrare?: string
}

interface VacationInfo {
  legalTotal: number
  medicalTotal: number
  faraPlataTotal: number
  legalThisMonth: number
  medicalThisMonth: number
  faraPlataThisMonth: number
  totalAlocat: number
  anAnterior: number
  remaining: number
}

function generatePDFHtml(
  userName: string, 
  receipts: ReceiptData[], 
  month: number, 
  year: number,
  total: number,
  logoBase64: string,
  vacationInfo: VacationInfo,
  periodLabel?: string
): string {
  // Genereaza randurile tabelului cu datele bonurilor - ordinea: Data, Nr. Bon, Furnizor, Valoare, Card personal, Card UFR
  const rows = receipts.map(r => `
    <tr>
      <td>${r.date || ''}</td>
      <td>${r.receiptNumber || 'N/A'}</td>
      <td class="left">${(r.storeName || '').toUpperCase()}</td>
      <td class="right">${r.amount.toFixed(2)}</td>
      <td>${r.cardFirma ? '' : 'X'}</td>
      <td>${r.cardFirma || ''}</td>
    </tr>
  `).join('')

  // Adauga randuri goale pentru a completa pana la 47 de randuri
  const emptyRowsCount = Math.max(0, 47 - receipts.length)
  const emptyRows = Array(emptyRowsCount).fill(`
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  `).join('')

  // Randuri pentru pagina 2 (landscape) - cu coloane suplimentare (12 coloane total)
  const rowsPage2 = receipts.map(r => `
    <tr>
      <td>${r.date || ''}</td>
      <td>${r.receiptNumber || 'N/A'}</td>
      <td class="left">${(r.storeName || '').toUpperCase()}</td>
      <td class="right">${r.amount.toFixed(2)}</td>
      <td>${r.cardFirma ? '' : 'X'}</td>
      <td>${r.cardFirma || ''}</td>
      <td style="background-color: #e8f5e9;">${r.avansDecont || ''}</td>
      <td style="background-color: #e8f5e9;">${r.avansDate || ''}</td>
      <td>${r.observatiiLucrare || ''}</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  `).join('')

  // Randuri goale pentru pagina 2 (12 coloane) - 15 randuri pentru a lasa loc totalurilor
  const emptyRowsPage2Count = Math.max(0, 15 - receipts.length)
  
  // Primul rand gol va contine zilele de concediu din luna curenta
  const firstEmptyRowPage2 = `
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td style="background-color: #e6f0ff; font-weight: bold;">${vacationInfo.legalThisMonth > 0 ? vacationInfo.legalThisMonth : ''}</td>
      <td style="background-color: #fff0e6; font-weight: bold;">${vacationInfo.medicalThisMonth > 0 ? vacationInfo.medicalThisMonth : ''}</td>
      <td style="background-color: #fff9e6; font-weight: bold;">${vacationInfo.faraPlataThisMonth > 0 ? vacationInfo.faraPlataThisMonth : ''}</td>
      <td>&nbsp;</td>
    </tr>
  `
  
  // Restul randurilor goale
  const remainingEmptyRowsPage2 = Array(Math.max(0, emptyRowsPage2Count - 1)).fill(`
    <tr>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  `).join('')
  
  const emptyRowsPage2 = emptyRowsPage2Count > 0 ? firstEmptyRowPage2 + remainingEmptyRowsPage2 : ''

  // Calculeaza totalul avansurilor
  const totalAvans = receipts.reduce((sum, r) => {
    const val = parseFloat(r.avansDecont || '0')
    return sum + (isNaN(val) ? 0 : val)
  }, 0)
  
  // Diferenta: Bonuri - Avans (pozitiv = firma datoreaza angajatului, negativ = angajatul datoreaza firmei)
  const diferenta = total - totalAvans

  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>Decont de cheltuieli - ${userName}</title>
  <style>
    @media print {
      html, body {
        width: 210mm;
        height: 297mm;
        margin: 0;
        padding: 0;
      }
      @page {
        size: A4 portrait;
        margin: 5mm 8mm 5mm 8mm;
      }
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 210mm;
      height: 297mm;
    }
    body {
      font-family: Arial, sans-serif;
      font-size: 8pt;
      padding: 5mm 8mm;
    }
    .container {
      width: 100%;
      height: 100%;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    .header-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      vertical-align: middle;
      text-align: center;
      font-size: 10pt;
    }
    .col1 { width: 17%; }
    .col2 { width: 17%; }
    .col3 { width: 52%; }
    .col4 { width: 14%; }
    .title-main {
      font-size: 16pt;
      font-weight: bold;
      margin: 4px 0;
    }
    .title-nr {
      font-size: 22pt;
      font-weight: bold;
      margin: 4px 0;
    }
    .title-name {
      font-size: 12pt;
      font-weight: bold;
      margin: 4px 0;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-top: 0;
    }
    .data-table th {
      border: 1px solid #000;
      padding: 3px;
      text-align: center;
      font-weight: bold;
      font-size: 9pt;
      height: 28px;
    }
    .data-table td {
      border: 1px solid #000;
      padding: 2px 3px;
      font-size: 9pt;
      text-align: center;
      height: 14px;
      overflow: hidden;
    }
    .data-table td.right {
      text-align: right;
    }
    .data-table td.left {
      text-align: left;
    }
    .total-row td {
      font-weight: bold;
      background-color: #f0f0f0;
      height: 14px;
    }

    /* Pagina 2 - Landscape (rotita pe pagina A4 portrait) */
    .page-break {
      page-break-before: always;
    }
    .page2-wrapper {
      width: 210mm;
      height: 297mm;
      position: relative;
      overflow: hidden;
    }
    .page2 {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 280mm;
      height: 190mm;
      transform: translate(-50%, -50%) rotate(90deg);
      transform-origin: center center;
      padding: 3mm;
      overflow: visible;
    }
    @media print {
      .page2-wrapper {
        page-break-before: always;
      }
    }
    .page2 .header-table {
      width: 100%;
      table-layout: fixed;
    }
    .page2 .header-table td {
      font-size: 10pt;
      padding: 4px 6px;
    }
    .page2 .title-main {
      font-size: 16pt;
    }
    .page2 .title-nr {
      font-size: 20pt;
    }
    .page2 .title-name {
      font-size: 12pt;
    }
    .page2 .data-table {
      width: 100%;
      table-layout: fixed;
    }
    .page2 .data-table th {
      font-size: 9pt;
      padding: 3px;
      height: 26px;
      line-height: 1.1;
    }
    .page2 .data-table td {
      font-size: 9pt;
      padding: 2px 3px;
      height: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header EXACT ca in model - 3 randuri, 4 coloane -->
    <table class="header-table">
      <tr>
        <td class="col1">
          Data:<br><strong>12.12.2025</strong>
        </td>
        <td class="col2">
          Varianta<br><strong>F010-02</strong>
        </td>
        <td class="col3" rowspan="3">
          <div class="title-main">DECONT DE CHELTUIELI</div>
          <div class="title-nr">${periodLabel ? `Perioada: ${periodLabel}` : `NR. ${month}____ /${year}`}</div>
          <div class="title-name">Nume:......${userName}......</div>
        </td>
        <td class="col4" rowspan="3">
          <img src="${logoBase64}" alt="Ultrafilter" style="width: 75px; height: auto;">
        </td>
      </tr>
      <tr>
        <td class="col1">
          Intocmit de:<br><strong>Timaru Cristina</strong>
        </td>
        <td class="col2">
          Verificat, aprobat:<br><strong>Moroianu Mihai</strong>
        </td>
      </tr>
      <tr>
        <td class="col1">
          Semnatura:<br>&nbsp;
        </td>
        <td class="col2">
          Semnatura:<br>&nbsp;
        </td>
      </tr>
    </table>

    <!-- Tabel date bonuri - ordinea exacta din original -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 9%; background-color: #fff;">Data</th>
          <th style="width: 11%; background-color: #fff;">Nr. Bon</th>
          <th style="width: 28%; background-color: #5b9bd5;">Furnizor</th>
          <th style="width: 12%; background-color: #bdd7ee;">Valoare bon</th>
          <th style="width: 20%; background-color: #f4b183;">Card personal<br>(se noteaza cu X)</th>
          <th style="width: 20%; background-color: #bdd7ee;">Card UFR<br>(ultimele 4 cifre)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
        ${emptyRows}
        <tr class="total-row">
          <td colspan="3" style="text-align: right; padding-right: 10px;"><strong>Total</strong></td>
          <td class="right"><strong>${total.toFixed(2)}</strong></td>
          <td colspan="2"></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- PAGINA 2 - LANDSCAPE (rotita pe pagina A4) -->
  <div class="page2-wrapper page-break">
  <div class="page2">
    <!-- Header pentru pagina 2 -->
    <table class="header-table">
      <tr>
        <td class="col1">
          Data:<br><strong>12.12.2025</strong>
        </td>
        <td class="col2">
          Varianta<br><strong>F010-02</strong>
        </td>
        <td class="col3" rowspan="3">
          <div class="title-main">DECONT DE CHELTUIELI</div>
          <div class="title-nr">${periodLabel ? `Perioada: ${periodLabel}` : `NR. ${month}____ /${year}`}</div>
          <div class="title-name">Nume:......${userName}......</div>
        </td>
        <td class="col4" rowspan="3">
          <img src="${logoBase64}" alt="Ultrafilter" style="width: 75px; height: auto;">
        </td>
      </tr>
      <tr>
        <td class="col1">
          Intocmit de:<br><strong>Timaru Cristina</strong>
        </td>
        <td class="col2">
          Verificat, aprobat:<br><strong>Moroianu Mihai</strong>
        </td>
      </tr>
      <tr>
        <td class="col1">
          Semnatura:<br>&nbsp;
        </td>
        <td class="col2">
          Semnatura:<br>&nbsp;
        </td>
      </tr>
    </table>

    <!-- Tabel date bonuri - cu coloane Avans Decont, Observatii si Concediu -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 6%; background-color: #fff;">Data</th>
          <th style="width: 6%; background-color: #fff;">Nr. Bon</th>
          <th style="width: 16%; background-color: #5b9bd5;">Furnizor</th>
          <th style="width: 7%; background-color: #bdd7ee;">Valoare bon</th>
          <th style="width: 7%; background-color: #f4b183;">Card pers.<br>(X)</th>
          <th style="width: 7%; background-color: #bdd7ee;">Card UFR<br>(4 cifre)</th>
          <th style="width: 7%; background-color: #c6efce;">Avans<br>Decont</th>
          <th style="width: 6%; background-color: #a8d8a8;">Data Avans<br>Decont</th>
          <th style="width: 9%; background-color: #d9d9d9;">Observatii<br>Lucrare</th>
          <th style="width: 8%; background-color: #b4c6e7;">Concediu<br>Legal</th>
          <th style="width: 8%; background-color: #f8cbad;">Concediu<br>Medical</th>
          <th style="width: 8%; background-color: #ffe699;">Concediu<br>Fara plata</th>
          <th style="width: 8%; background-color: #c6efce;">Concediu<br>Alocat</th>
        </tr>
      </thead>
      <tbody>
        ${rowsPage2}
        ${emptyRowsPage2}
        <tr class="total-row">
          <td colspan="3" style="text-align: right; padding-right: 10px;"><strong>Total</strong></td>
          <td class="right"><strong>${total.toFixed(2)}</strong></td>
          <td colspan="2"></td>
          <td style="background-color: #c6efce;"><strong>${totalAvans.toFixed(2)}</strong></td>
          <td></td>
          <td></td>
          <td style="background-color: #b4c6e7;"><strong>${vacationInfo.legalTotal}</strong></td>
          <td style="background-color: #f8cbad;"><strong>${vacationInfo.medicalTotal}</strong></td>
          <td style="background-color: #ffe699;"><strong>${vacationInfo.faraPlataTotal}</strong></td>
          <td style="background-color: #c6efce;"><strong>${vacationInfo.totalAlocat + vacationInfo.anAnterior}</strong></td>
        </tr>
        <tr>
          <td colspan="3" style="text-align: right; padding-right: 10px; font-weight: bold; background-color: ${diferenta >= 0 ? '#e8f5e9' : '#ffebee'};">
            ${diferenta >= 0 ? 'Firma datoreaza angajatului:' : 'Angajatul datoreaza firmei:'}
          </td>
          <td class="right" style="font-weight: bold; font-size: 10pt; background-color: ${diferenta >= 0 ? '#c8e6c9' : '#ffcdd2'};">
            <strong>${Math.abs(diferenta).toFixed(2)} RON</strong>
          </td>
          <td colspan="5"></td>
          <td colspan="3" style="text-align: right; background-color: #e2efda; font-weight: bold;">Zile ramase concediu:</td>
          <td style="background-color: #c6efce; font-weight: bold;">${vacationInfo.remaining}</td>
        </tr>
      </tbody>
    </table>
  </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
  `
}

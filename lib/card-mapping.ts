// Mapping intre numele utilizatorilor si ultimele 4 cifre ale cardului de firma
// Adauga aici utilizatorii si cardurile lor

export const CARD_FIRMA_MAPPING: Record<string, string> = {
  'Moroianu Marius-Mihai': '5029',
  'Moroianu Mihai': '5029',
  // Adauga aici mai multi utilizatori dupa necesitate
  // 'Nume Prenume': 'XXXX',
}

export function getCardFirma(userName: string): string {
  // Cauta exact
  if (CARD_FIRMA_MAPPING[userName]) {
    return CARD_FIRMA_MAPPING[userName]
  }
  
  // Cauta partial (daca numele contine)
  for (const [name, card] of Object.entries(CARD_FIRMA_MAPPING)) {
    if (userName.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(userName.toLowerCase())) {
      return card
    }
  }
  
  return ''
}

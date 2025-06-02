import React from 'react';
import { CaseWithCustomer } from '@shared/schema';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

interface PrintFollowupLayoutProps {
  caseData: CaseWithCustomer;
  onPrint?: () => void;
}

const formatTreatment = (treatment: string) => {
  const treatments = {
    'repair': 'Reparation',
    'warranty': 'Reklamation',
    'setup': 'Klargøring',
    'other': 'Andet'
  };
  return treatments[treatment as keyof typeof treatments] || treatment;
};

const formatPriority = (priority: string) => {
  const priorities = {
    'asap': 'Snarest muligt',
    'first_priority': 'Første prioritet',
    'four_days': '4 dage',
    'free_diagnosis': 'Gratis diagnose'
  };
  return priorities[priority as keyof typeof priorities] || priority;
};

const formatDeviceType = (deviceType: string) => {
  const deviceTypes = {
    'pc': 'PC',
    'laptop': 'Bærbar',
    'printer': 'Printer',
    'other': 'Andet'
  };
  return deviceTypes[deviceType as keyof typeof deviceTypes] || deviceType;
};

export function PrintFollowupLayout({ caseData, onPrint }: PrintFollowupLayoutProps) {
  const handlePrint = () => {
    window.print();
    onPrint?.();
  };

  // Hent navn fra caseData.customer?.name eller caseData.customerName
  const customerName = (caseData as any).customer?.name || (caseData as any).customerName || "Ukendt";
  // Hent telefon
  const customerPhone = (caseData as any).customer?.phone || (caseData as any).customerPhone || "Ikke angivet";
  // Hent email
  const customerEmail = (caseData as any).customer?.email || (caseData as any).customerEmail || "Ikke angivet";
  // Købt her og købsdato
  const purchasedHere = (caseData.purchasedHere || (caseData as any).customer?.purchasedHere) ? "Ja" : "Nej";
  const purchaseDate = caseData.purchaseDate ? new Date(caseData.purchaseDate) : ((caseData as any).customer?.purchaseDate ? new Date((caseData as any).customer.purchaseDate) : null);
  // Oprettelsesdato
  const createdAt = caseData.createdAt ? new Date(caseData.createdAt) : null;
  // Medarbejdernavn - først tjek for createdByName fra status history, så case data, så fallback
  let createdByName = null;
  
  // Først forsøg at hente fra initial status history (sag oprettet)
  if ((caseData as any).statusHistory) {
    const initialStatus = (caseData as any).statusHistory.find((sh: any) => 
      sh.comment === 'Sag oprettet'
    );
    if (initialStatus && initialStatus.createdByName) {
      createdByName = initialStatus.createdByName;
    }
  }
  
  // Hvis ikke fundet i status history, tjek case data direkte
  if (!createdByName && (caseData as any).createdByName && typeof (caseData as any).createdByName === 'string') {
    createdByName = (caseData as any).createdByName;
  }
  
  // Fallback til andre metoder hvis intet er fundet
  if (!createdByName) {
    createdByName = (caseData as any).createdByUser?.name || 
                   (caseData as any).user?.name || 
                   (caseData as any).createdBy || 
                   'System';
  }
  // Beregn 4 hverdage frem hvis prioritering er 'four_days'
  let fourDaysDate = null;
  if (caseData.priority === 'four_days' && createdAt) {
    let days = 0;
    let date = new Date(createdAt);
    while (days < 4) {
      date.setDate(date.getDate() + 1);
      // 0 = søndag, 6 = lørdag
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        days++;
      }
    }
    fourDaysDate = date;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white">
      {/* Print styles */}
      <style>{`
        .header-vigtigt {
          background: #fff;
          color: #b00;
          font-weight: bold;
          font-size: 17px;
          padding: 12px 16px;
          margin-bottom: 14px;
          border-radius: 7px;
          box-shadow: 0 2px 8px #0002;
          text-align: center;
          letter-spacing: 0.5px;
        }
        .print-footerbox {
          font-size: 22px;
          line-height: 1.5;
          padding: 38px 28px 38px 28px;
          background: #fffbe6;
          border: 3px solid #b00;
          border-radius: 14px;
          font-weight: bold;
          box-shadow: 0 2px 8px #0002;
          margin-top: 0 !important;
          width: 100%;
          box-sizing: border-box;
          margin-bottom: 0 !important;
          display: block;
        }
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .print-content {
            font-family: Arial, sans-serif;
            font-size: 15px;
            line-height: 1.28;
            padding: 0 !important;
            background: #fff;
            width: 100%;
            box-sizing: border-box;
          }
          .print-header {
            font-size: 1em !important;
            margin-bottom: 10px !important;
            padding-top: 0 !important;
          }
          .print-header .header-title {
            display: block;
            font-size: 22px !important;
            font-weight: bold;
            text-align: center;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }
          .print-header .header-sub {
            display: none;
          }
          .print-header .header-info {
            font-size: 1em !important;
            margin-bottom: 8px !important;
          }
          .print-header .header-grid {
            gap: 12px !important;
          }
          .print-header .header-label {
            font-weight: bold;
          }
          .print-header .header-value {
            font-size: 1em !important;
          }
          .print-header .header-vigtigt {
            background: #fff !important;
            color: #b00 !important;
            font-weight: bold;
            font-size: 17px !important;
            padding: 12px 16px !important;
            margin-bottom: 14px !important;
            border-radius: 7px;
            box-shadow: 0 2px 8px #0002;
            text-align: center;
            letter-spacing: 0.5px;
          }
          h1, h2, h3 {
            font-size: 1.22em;
            margin-bottom: 0.22em;
            color: #b00;
            font-weight: bold;
          }
          .section { margin-bottom: 7px; }
          .grid-cols-2 { gap: 6px !important; }
          .mb-8, .mb-6, .mb-3, .mb-2 { margin-bottom: 6px !important; }
          .p-4, .p-6, .p-2, .p-1 { padding: 2px !important; }
          .print-divider {
            margin-top: 8px !important;
            margin-bottom: 8px !important;
            border-top: 2px dashed #b00 !important;
          }
          .main-content {
            margin-bottom: 0 !important;
            margin-top: 0 !important;
          }
          .print-footerbox {
            font-size: 28px !important;
            line-height: 1.6 !important;
            padding: 48px 32px 48px 32px !important;
            border-radius: 18px !important;
            margin-bottom: 0 !important;
            margin-top: 0 !important;
            width: 100% !important;
            box-sizing: border-box;
            display: block;
          }
          .section:last-child {
            margin-bottom: 0 !important;
          }
        }
        @page {
          margin: 8mm;
          size: A4;
        }
      `}</style>

      {/* Print button - visible only on screen */}
      <div className="no-print mb-4 text-center">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Print følgeseddel
        </button>
      </div>

      {/* Print content */}
      <div className="print-content p-2">
        <div className="main-content">
          {/* Stor og tydelig header */}
          <div className="print-header">
            <div className="header-title">FØLGESEDDEL HOS TJDATA</div>
            <div className="header-vigtigt">VIGTIGT: Denne seddel SKAL medbringes ved enhver henvendelse om sagen.</div>
            <div className="header-info grid grid-cols-2 header-grid mb-2">
              <div>
                <span className="header-label">Navn:</span> <span className="header-value">{customerName}</span><br/>
                <span className="header-label">Tlf:</span> <span className="header-value">{customerPhone}</span><br/>
                <span className="header-label">Email:</span> <span className="header-value">{customerEmail}</span>
              </div>
              <div>
                <span className="header-label">Sagsnr.:</span> <span className="header-value">#{caseData.caseNumber}</span><br/>
                <span className="header-label">Oprettet:</span> <span className="header-value">{format(new Date(caseData.createdAt), "d. MMM yyyy", { locale: da })}</span><br/>
                <span className="header-label">Behandling:</span> <span className="header-value">{formatTreatment(caseData.treatment)}</span><br/>
                <span className="header-label">Prioritet:</span> <span className="header-value">{formatPriority(caseData.priority)}</span>
              </div>
            </div>
          </div>
          {/* Sagsdetaljer */}
          <div className="section">
            <div><b>Titel:</b> {caseData.title}</div>
            <div><b>Beskrivelse:</b> {caseData.description}</div>
            <div><b>Enhed:</b> {formatDeviceType(caseData.deviceType)}</div>
            {caseData.accessories && <div><b>Tilbehør:</b> {caseData.accessories}</div>}
            {caseData.importantNotes && <div><b>Vigtige bemærkninger:</b> {caseData.importantNotes}</div>}
          </div>
          {/* Status tracking */}
          <div className="section">
            <b>Status:</b> Følg sagen på <b>eoside.com</b> med tlf. og sagsnr.
            <div className="text-xs">Angiv dit telefonnummer og sagsnummer for at se opdateringer.</div>
          </div>
          {/* Betingelser */}
          <div className="section">
            <h3 className="font-bold mb-1">Betingelser</h3>
            <div className="text-xs space-y-1">
              <p><b>Ved alle henvendelser om reparationer af varer fra TJData skal der forevises faktura.</b></p>
              <p>Ved manglende faktura vil henvendelse blive afvist som garantireparation.</p>
              <p>Reparation kan også afvises hvis løsdele ikke bliver indleveret i forsvarlig emballage (Typisk antistatisk pose eller org. emballage til f.eks. RAM, Grafikkort m.fl.)</p>
              <p>TJData påtager sig intet ansvar for følgeskade eller tabt data som følge af reparation.</p>
              <p><b>BEMÆRK: Færdige reparationssager SKAL være afhentet senest 3 mdr. Efter færdiggørelse, da de ellers vil blive destrueret.</b></p>
            </div>
          </div>
          {/* Prisliste */}
          <div className="section">
            <h3 className="font-bold mb-1">Prisliste - Fejlsøgning</h3>
            <div className="text-xs space-y-1">
              <p><b>Dele fra TJData (op til 2 år efter køb)</b></p>
              <p>Løsdele Gratis*</p>
              <p>PC (+bundkort) Gratis*</p>
              <p>Bærbar Gratis*</p>
              <p className="text-xs">*Hvis varen konstateres fejlfri beregnes et testgebyr på henholdsvis 50.- eller 150.-</p>
              <p className="text-xs">**Bærbare med 1 års garanti (2 års reklamationsret) beregnes et testgebyr på 750.- hvis den ikke er dækket af reklamationsretten</p>
              <p><b>Alle reparationer der dækket af garanti er uden beregning.</b></p>
              <p>Ved telefonisk henvendelse ang. Sag ring 46932061 og tast 3, vi giver selvfølgelig besked når sagen er afsluttet.</p>
            </div>
          </div>
        </div>
        {/* Klippestreg */}
        <div className="border-t-2 border-dashed border-gray-400 print-divider"></div>
        {/* Bund sektion */}
        <div className="bg-gray-50 print-footerbox border">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div><b>Kundens navn:</b> {customerName}</div>
              <div><b>Telefon:</b> {customerPhone}</div>
              <div><b>Email:</b> {customerEmail}</div>
            </div>
            <div>
              <div><b>Sagsnummer:</b> #{caseData.caseNumber}</div>
              <div><b>Oprettelsesdato:</b> {format(new Date(caseData.createdAt), "d. MMM yyyy", { locale: da })}</div>
              <div><b>Behandling:</b> {formatTreatment(caseData.treatment)}</div>
              <div><b>Prioritet:</b> {formatPriority(caseData.priority)}</div>
            </div>
          </div>
          <div className="mt-1 text-xs">
            <div><b>Beskrivelse:</b> {caseData.description}</div>
            <div><b>Enhed:</b> {formatDeviceType(caseData.deviceType)}</div>
            <div><b>Tilbehør:</b> {caseData.accessories || 'Ingen'}</div>
          </div>
          <div className="mt-1 text-xs">
            <div><b>Bemærkninger:</b> {caseData.importantNotes || '-'}</div>
            <div className="print-footer">
              {caseData.priority === 'four_days' && createdAt && fourDaysDate ? (
                <span>4 hverdage: Oprettet {createdAt.toLocaleDateString("da-DK")}, påbegyndes senest {fourDaysDate.toLocaleDateString("da-DK")}. </span>
              ) : null}
              <span>Oprettet af medarbejderen {createdByName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
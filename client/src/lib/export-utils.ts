import { format } from "date-fns";
import { da } from "date-fns/locale";

export function exportToCSV(data: any) {
  const { customer, cases, orders, rmas } = data;
  
  // Start med kundedata
  let csv = "Kundedata\n";
  csv += "Navn,Email,Telefon,Adresse\n";
  csv += `${customer.name},${customer.email},${customer.phone},${customer.address}\n\n`;
  
  // Tilføj sager hvis de findes
  if (cases?.length) {
    csv += "Sager\n";
    csv += "ID,Status,Prioritet,Oprettet,Opdateret\n";
    cases.forEach((case_: any) => {
      csv += `${case_.id},${case_.status},${case_.priority},${format(new Date(case_.createdAt), "dd/MM/yyyy", { locale: da })},${format(new Date(case_.updatedAt), "dd/MM/yyyy", { locale: da })}\n`;
    });
    csv += "\n";
  }
  
  // Tilføj bestillinger hvis de findes
  if (orders?.length) {
    csv += "Bestillinger\n";
    csv += "ID,Status,Dato\n";
    orders.forEach((order: any) => {
      csv += `${order.id},${order.status},${format(new Date(order.date), "dd/MM/yyyy", { locale: da })}\n`;
    });
    csv += "\n";
  }
  
  // Tilføj RMA hvis de findes
  if (rmas?.length) {
    csv += "RMA\n";
    csv += "ID,Status,Dato\n";
    rmas.forEach((rma: any) => {
      csv += `${rma.id},${rma.status},${format(new Date(rma.date), "dd/MM/yyyy", { locale: da })}\n`;
    });
  }
  
  // Download CSV-filen
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `kunde_${customer.id}_${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(data: any) {
  // TODO: Implementer PDF-eksport med jsPDF eller lignende
  console.log("PDF eksport ikke implementeret endnu");
}

export function printData(data: any) {
  const { customer, cases, orders, rmas } = data;
  
  // Opret print-venligt HTML
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  
  printWindow.document.write(`
    <html>
      <head>
        <title>Kundedata - ${customer.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; }
          h2 { color: #666; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>Kundedata</h1>
        <table>
          <tr><th>Navn</th><td>${customer.name}</td></tr>
          <tr><th>Email</th><td>${customer.email}</td></tr>
          <tr><th>Telefon</th><td>${customer.phone}</td></tr>
          <tr><th>Adresse</th><td>${customer.address}</td></tr>
        </table>
        
        ${cases?.length ? `
          <h2>Sager</h2>
          <table>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Prioritet</th>
              <th>Oprettet</th>
              <th>Opdateret</th>
            </tr>
            ${cases.map((case_: any) => `
              <tr>
                <td>${case_.id}</td>
                <td>${case_.status}</td>
                <td>${case_.priority}</td>
                <td>${format(new Date(case_.createdAt), "dd/MM/yyyy", { locale: da })}</td>
                <td>${format(new Date(case_.updatedAt), "dd/MM/yyyy", { locale: da })}</td>
              </tr>
            `).join("")}
          </table>
        ` : ""}
        
        ${orders?.length ? `
          <h2>Bestillinger</h2>
          <table>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Dato</th>
            </tr>
            ${orders.map((order: any) => `
              <tr>
                <td>${order.id}</td>
                <td>${order.status}</td>
                <td>${format(new Date(order.date), "dd/MM/yyyy", { locale: da })}</td>
              </tr>
            `).join("")}
          </table>
        ` : ""}
        
        ${rmas?.length ? `
          <h2>RMA</h2>
          <table>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Dato</th>
            </tr>
            ${rmas.map((rma: any) => `
              <tr>
                <td>${rma.id}</td>
                <td>${rma.status}</td>
                <td>${format(new Date(rma.date), "dd/MM/yyyy", { locale: da })}</td>
              </tr>
            `).join("")}
          </table>
        ` : ""}
      </body>
    </html>
  `);
  
  printWindow.document.close();
  printWindow.print();
} 
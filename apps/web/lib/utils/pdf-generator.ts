import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface RevenueBreakdownItem {
  clientId: string;
  clientName: string | null;
  clientEmail: string;
  subscriptionStatus: string | null;
  planType: "monthly" | "annual" | null;
  monthlyRevenue: number;
  platformFee: number;
  remainingAfterFee: number;
  commercialProfit: number;
  chatokayProfit: number;
  hasPromotion: boolean;
}

interface RevenueTotals {
  totalMonthlyRevenue: number;
  totalPlatformFee: number;
  totalCommercialProfit: number;
  totalChatokayProfit: number;
  platformFeePercentage: number;
}

export async function generateRevenuePDF(
  breakdown: RevenueBreakdownItem[],
  totals: RevenueTotals,
  commercialName: string
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const lineHeight = 7;
  let yPos = margin;

  // Helper function to add a new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPos + requiredSpace > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Load and add logo
  try {
    const logoUrl = "/chatokay-logo.png";
    const logoResponse = await fetch(logoUrl);
    const logoBlob = await logoResponse.blob();
    const logoBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(logoBlob);
    });

    // Add logo at the top (centered)
    const logoWidth = 30;
    const logoHeight = 30;
    doc.addImage(
      logoBase64,
      "PNG",
      pageWidth / 2 - logoWidth / 2,
      yPos,
      logoWidth,
      logoHeight
    );
    yPos += logoHeight + lineHeight * 1.5;
  } catch (error) {
    console.error("Error loading logo:", error);
    // Continue without logo if it fails to load
  }

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Ingresos Estimados del Mes", pageWidth / 2, yPos, {
    align: "center",
  });
  yPos += lineHeight * 1.5;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  const currentDate = new Date();
  const monthName = currentDate.toLocaleString("es-ES", { month: "long" });
  const year = currentDate.getFullYear();
  doc.text(
    `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
    pageWidth / 2,
    yPos,
    { align: "center" }
  );
  yPos += lineHeight;

  doc.text(`Comercial: ${commercialName}`, pageWidth / 2, yPos, {
    align: "center",
  });
  yPos += lineHeight * 2;

  // Summary totals
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen Total", margin, yPos);
  yPos += lineHeight * 1.5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryData = [
    ["Concepto", "Importe (€)"],
    [
      "Ingresos Mensuales Totales",
      totals.totalMonthlyRevenue.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ],
    [
      `Coste Plataforma (${totals.platformFeePercentage}%)`,
      totals.totalPlatformFee.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ],
    [
      "Beneficio Comercial (50%)",
      totals.totalCommercialProfit.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ],
    [
      "Beneficio ChatOkay (50%)",
      totals.totalChatokayProfit.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ],
  ];

  // Calculate table width to match the detailed breakdown table
  const tableWidth = 160; // Same width as detailed breakdown table
  const leftMargin = (pageWidth - tableWidth) / 2;

  autoTable(doc, {
    startY: yPos,
    margin: { left: leftMargin, right: leftMargin },
    head: summaryData[0] ? [summaryData[0]] : [],
    body: summaryData.slice(1),
    theme: "striped",
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: "bold",
    },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 100, halign: "left" },
      1: { cellWidth: 60, halign: "right" },
    },
    tableWidth: "auto",
  });

  yPos = (doc as any).lastAutoTable.finalY + lineHeight * 2;

  // Detailed breakdown
  checkNewPage(lineHeight * 3);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Desglose por Suscripción", pageWidth / 2, yPos, {
    align: "center",
  });
  yPos += lineHeight * 1.5;

  if (breakdown.length === 0) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("No hay suscripciones activas", pageWidth / 2, yPos, {
      align: "center",
    });
  } else {
    // Table headers
    const tableData = breakdown.map((item) => [
      item.clientName || item.clientEmail,
      item.planType === "monthly"
        ? "Mensual"
        : item.planType === "annual"
          ? "Anual"
          : "-",
      item.monthlyRevenue.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      item.platformFee.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      item.commercialProfit.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      item.chatokayProfit.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    ]);

    // Use same width and margins as summary table for consistency
    const tableWidth = 160; // Same width as summary table
    const leftMargin = (pageWidth - tableWidth) / 2;

    autoTable(doc, {
      startY: yPos,
      margin: { left: leftMargin, right: leftMargin },
      head: [
        [
          "Cliente",
          "Plan",
          "Ingresos",
          "Coste Plataforma",
          "Beneficio Comercial",
          "Beneficio ChatOkay",
        ],
      ],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: { fontSize: 6, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 40, halign: "left" },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: 25, halign: "right" },
        3: { cellWidth: 25, halign: "right" },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 25, halign: "right" },
      },
      tableWidth: "auto",
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
    doc.text(
      `Generado el ${new Date().toLocaleString("es-ES")}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 5,
      { align: "center" }
    );
  }

  return doc;
}

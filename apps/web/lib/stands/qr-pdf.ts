import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { slugify } from "@/lib/utils";

type DownloadStandQrPdfOptions = {
  standName: string;
  eventName?: string | null;
  captureUrl: string;
};

async function loadLogoDataUrl(): Promise<string> {
  const response = await fetch("/logo.png");
  if (!response.ok) throw new Error("Logo introuvable");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function downloadStandQrPdf({
  standName,
  eventName,
  captureUrl,
}: DownloadStandQrPdfOptions): Promise<void> {
  const [qrDataUrl, logoDataUrl] = await Promise.all([
    QRCode.toDataURL(captureUrl, {
      width: 1024,
      margin: 2,
      errorCorrectionLevel: "H",
    }),
    loadLogoDataUrl(),
  ]);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;

  const logoSize = 22;
  let y = 24;
  pdf.addImage(logoDataUrl, "PNG", (pageWidth - logoSize) / 2, y, logoSize, logoSize);
  y += logoSize + 14;

  pdf.setTextColor(15, 23, 42);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  const titleLines = pdf.splitTextToSize(standName, pageWidth - margin * 2);
  pdf.text(titleLines, pageWidth / 2, y, { align: "center" });
  y += titleLines.length * 11;

  if (eventName) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(13);
    pdf.setTextColor(100, 116, 139);
    const eventLines = pdf.splitTextToSize(eventName, pageWidth - margin * 2);
    pdf.text(eventLines, pageWidth / 2, y + 4, { align: "center" });
    y += eventLines.length * 7 + 4;
  }

  y = Math.max(y + 10, 80);
  const qrSize = 110;
  const qrX = (pageWidth - qrSize) / 2;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.4);
  pdf.roundedRect(qrX - 6, y - 6, qrSize + 12, qrSize + 12, 4, 4, "S");
  pdf.addImage(qrDataUrl, "PNG", qrX, y, qrSize, qrSize);

  y += qrSize + 22;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(15, 23, 42);
  pdf.text("Scannez pour laisser vos coordonnées", pageWidth / 2, y, { align: "center" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(71, 85, 105);
  pdf.text(
    "Recevez notre catalogue directement sur WhatsApp",
    pageWidth / 2,
    y + 10,
    { align: "center" }
  );

  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  const urlLines = pdf.splitTextToSize(captureUrl, pageWidth - margin * 2);
  pdf.text(urlLines, pageWidth / 2, pageHeight - 14, { align: "center" });

  const filename = `qr-${slugify(standName) || "stand"}.pdf`;
  pdf.save(filename);
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ================== HELPERS ================== */

const isBullet = (line) => line.trim().startsWith("-");

const ensurePageSpace = (doc, currentY, requiredHeight) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + requiredHeight > pageHeight - 20) {
    doc.addPage();
    return 30;
  }
  return currentY;
};

/* ================== PARSER ================== */

const parseArabicContent = (text) => {
  const sections = [];
  const contacts = [];

  const blocks = text.split("\n\n");
  let currentSection = null;

  blocks.forEach((block) => {
    if (block.startsWith("#")) {
      currentSection = {
        title: block.replace("#", "").trim(),
        content: [],
      };
      sections.push(currentSection);
    } else if (block.includes("الاسم:")) {
      const lines = block.split("\n");
      const contact = {};

      lines.forEach((line) => {
        if (line.startsWith("الاسم:"))
          contact.name = line.replace("الاسم:", "").trim();
        if (line.startsWith("الجهة:"))
          contact.org = line.replace("الجهة:", "").trim();
        if (line.startsWith("الصفة"))
          contact.role = line.split(":")[1]?.trim();
        if (line.includes("@"))
          contact.email = line.split(":")[0].trim();
        if (line.startsWith("رقم الهاتف"))
          contact.phone = line.replace("رقم الهاتف:", "").trim();
      });

      contacts.push(contact);
    } else if (currentSection) {
      currentSection.content.push(block);
    }
  });

  return { sections, contacts };
};

/* ================== MAIN PDF ================== */

export const generatePDF = (resultText) => {
  const doc = new jsPDF("p", "mm", "a4");
  doc.setFont("NotoNaskhArabic", "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const rightX = pageWidth - 20;
  let y = 50;

  const { sections, contacts } = parseArabicContent(resultText);

  /* ===== HEADER ===== */
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 35, "F");

  doc.setFillColor(6, 95, 70);
  doc.circle(pageWidth - 15, 10, 25, "F");

  doc.setFillColor(52, 211, 153);
  doc.circle(15, 25, 20, "F");

  doc.setFontSize(22);
  doc.setTextColor(255);
  doc.text("مذكرة تفاهم", pageWidth / 2, 22, { align: "center" });

  doc.setDrawColor(255);
  doc.line(pageWidth / 2 - 30, 27, pageWidth / 2 + 30, 27);

  doc.setTextColor(0);

  /* ===== SECTIONS ===== */
  sections.forEach((sec) => {
    y = ensurePageSpace(doc, y, 22);

    const titleWidth = pageWidth - 30;
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(15, y - 7, titleWidth, 14, 3, 3, "F");

    doc.setFillColor(16, 185, 129);
    doc.roundedRect(pageWidth - 20, y - 7, 4, 14, 2, 2, "F");

    doc.setFontSize(14);
    doc.setTextColor(6, 95, 70);
    doc.text(sec.title, rightX - 8, y + 2, { align: "right" });

    y += 18;

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);

    sec.content.forEach((block) => {
      const lines = block.split("\n");

      lines.forEach((line) => {
        if (!line.trim()) {
          y += 4;
          return;
        }

        const bullet = isBullet(line);
        const cleanText = bullet ? line.replace("-", "").trim() : line;
        const wrapped = doc.splitTextToSize(cleanText, bullet ? 150 : 165);

        const requiredHeight = wrapped.length * 6 + 4;
        y = ensurePageSpace(doc, y, requiredHeight);

        wrapped.forEach((wLine, idx) => {
          if (bullet && idx === 0) {
            doc.setFillColor(16, 185, 129);
            doc.circle(rightX - 5, y - 1.5, 1.2, "F");
          }

          doc.text(
            wLine,
            bullet ? rightX - 10 : rightX,
            y,
            { align: "right" }
          );
          y += 6;
        });

        y += 2;
      });
    });

    y += 10;
  });

  /* ===== CONTACT TABLE ===== */
  if (contacts.length) {
    y = ensurePageSpace(doc, y, 60);

    doc.setFillColor(236, 253, 245);
    doc.roundedRect(15, y - 7, pageWidth - 30, 12, 3, 3, "F");

    doc.setFillColor(16, 185, 129);
    doc.rect(pageWidth - 20, y - 7, 4, 12, "F");

    doc.setFontSize(14);
    doc.setTextColor(6, 95, 70);
    doc.text("بيانات منسقي الاتصال", rightX - 8, y, { align: "right" });

    y += 15;

    autoTable(doc, {
      startY: y,
      styles: {
        font: "NotoNaskhArabic",
        fontSize: 10,
        halign: "right",
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontSize: 11,
      },
      bodyStyles: {
        fillColor: [248, 250, 252],
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244],
      },
      head: [[
        "الهاتف",
        "البريد الإلكتروني",
        "الصفة / الدور",
        "الجهة",
        "الاسم",
      ]],
      body: contacts.map((c) => [
        c.phone || "",
        c.email || "",
        c.role || "",
        c.org || "",
        c.name || "",
      ]),
    });

    y = doc.lastAutoTable.finalY + 15;
  }

  /* ===== FOOTER ===== */
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "تم إنشاء هذا المستند تلقائيًا",
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );

  doc.save("مذكرة-تفاهم.pdf");
};

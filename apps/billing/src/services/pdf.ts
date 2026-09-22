import {
  PDFDocument,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  concatTransformationMatrix,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { BillingDocument, Workspace } from "../domain/types";
import { documentLabels } from "../domain/types";
import { formatDate, money } from "../domain/dates";
import { status } from "../domain/selectors";
import { documentContent } from "./document-content";
export interface PdfAssets {
  regular: Uint8Array;
  semibold: Uint8Array;
  logo: string;
}
const PAGE_W = 595.28,
  PAGE_H = 841.89,
  LEFT = 36,
  WIDTH = PAGE_W - LEFT * 2,
  BOTTOM = 55;
const navy = rgb(11 / 255, 43 / 255, 69 / 255),
  teal = rgb(8 / 255, 124 / 255, 128 / 255),
  muted = rgb(0.42, 0.51, 0.57),
  rule = rgb(0.88, 0.92, 0.94);
function hex(value: string) {
  return rgb(
    parseInt(value.slice(1, 3), 16) / 255,
    parseInt(value.slice(3, 5), 16) / 255,
    parseInt(value.slice(5, 7), 16) / 255,
  );
}
function drawLogo(
  page: PDFPage,
  svg: string,
  x: number,
  top: number,
  width: number,
) {
  const viewBox = svg
      .match(/viewBox="([^"]+)"/)?.[1]
      .split(/\s+/)
      .map(Number),
    scale = width / (viewBox?.[2] || 392);
  // Only the trusted, local, path-only Hitech logo is consumed here. No SVG scripts, remote resources or fonts.
  for (const match of svg.matchAll(/<path\b([^>]+)\/?\s*>/g)) {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
    );
    if (!attrs.d) continue;
    const translate = attrs.transform
        ?.match(/translate\(([^)]+)\)/)?.[1]
        .split(/[ ,]+/)
        .map(Number) || [0, 0],
      s = attrs.transform
        ?.match(/scale\(([^)]+)\)/)?.[1]
        .split(/[ ,]+/)
        .map(Number) || [1, 1];
    page.pushOperators(
      pushGraphicsState(),
      concatTransformationMatrix(
        scale * s[0],
        0,
        0,
        scale * (s[1] ?? s[0]),
        x + scale * translate[0],
        top - scale * (translate[1] || 0),
      ),
    );
    page.drawSvgPath(attrs.d, {
      x: 0,
      y: 0,
      color: attrs.fill?.startsWith("#") ? hex(attrs.fill) : navy,
    });
    page.pushOperators(popGraphicsState());
  }
}
export async function createDocumentPdf(
  w: Workspace,
  d: BillingDocument,
  assets: PdfAssets,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(assets.regular, { subset: true }),
    semibold = await pdf.embedFont(assets.semibold, { subset: true });
  pdf.setTitle(`${documentLabels[d.kind]} ${d.number}`);
  pdf.setAuthor(w.settings.name);
  pdf.setSubject("Demo document — not for accounting use");
  const c = documentContent(w, d);
  let page!: PDFPage;
  let y = 0;
  function text(
    value: string,
    x: number,
    at: number,
    size = 9,
    bold = false,
    color = navy,
    align: "left" | "right" = "left",
  ) {
    const font = bold ? semibold : regular;
    const safe = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
    page.drawText(safe, {
      x: align === "right" ? x - font.widthOfTextAtSize(safe, size) : x,
      y: at,
      size,
      font,
      color,
    });
  }
  function wrap(
    value: string,
    width: number,
    size = 9,
    font: PDFFont = regular,
  ) {
    const lines: string[] = [];
    for (const paragraph of value.replace(/\r/g, "").split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= width) {
          line = candidate;
          continue;
        }
        if (line) {
          lines.push(line);
          line = "";
        }
        if (font.widthOfTextAtSize(word, size) <= width) line = word;
        else {
          for (const char of word) {
            if (font.widthOfTextAtSize(line + char, size) > width && line) {
              lines.push(line);
              line = "";
            }
            line += char;
          }
        }
      }
      lines.push(line);
    }
    return lines;
  }
  function line(at: number) {
    page.drawLine({
      start: { x: LEFT, y: at },
      end: { x: PAGE_W - LEFT, y: at },
      color: rule,
      thickness: 0.5,
    });
  }
  function newPage() {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    text(
      "DEMO DOCUMENT · NOT FOR ACCOUNTING USE",
      LEFT,
      813,
      6.5,
      false,
      muted,
    );
    drawLogo(page, assets.logo, LEFT, 791, 182);
    text(
      documentLabels[d.kind].toUpperCase(),
      PAGE_W - LEFT,
      779,
      13,
      true,
      navy,
      "right",
    );
    text(d.number || "DRAFT", PAGE_W - LEFT, 760, 9.5, true, teal, "right");
    text(
      `${formatDate(d.date)} · ${status(w, d).replaceAll("-", " ").toUpperCase()}`,
      PAGE_W - LEFT,
      746,
      7.5,
      false,
      muted,
      "right",
    );
    line(728);
    y = 711;
  }
  function ensure(height: number) {
    if (y - height < BOTTOM) newPage();
  }
  function paragraph(value: string, size = 8.5, bold = false, color = navy) {
    for (const v of wrap(value, WIDTH, size, bold ? semibold : regular)) {
      ensure(size + 7);
      text(v, LEFT, y, size, bold, color);
      y -= size + 5;
    }
  }
  newPage();
  if (c.business.name !== "Hitech Lab & Surgical Solutions")
    paragraph(c.business.name, 10, true);
  for (const v of c.businessLines) paragraph(v, 8, false, muted);
  y -= 10;
  ensure(80);
  const partyY = y;
  const leftLines = [
    {
      v: d.kind.startsWith("purchase") ? "SUPPLIER" : "BILL TO",
      size: 7,
      bold: true,
      color: muted,
    },
    {
      v: c.party?.name || "Contact not selected",
      size: 10,
      bold: true,
      color: navy,
    },
    ...[
      d.billingAddress || c.party?.billingAddress,
      c.party?.gstin ? `GSTIN: ${c.party.gstin}` : "",
      c.party?.phone,
    ]
      .filter(Boolean)
      .map((v) => ({ v: v!, size: 8, bold: false, color: muted })),
  ];
  // Use full-width stacked sections for arbitrarily long addresses, so nothing can overlap the item table.
  for (const row of leftLines) paragraph(row.v, row.size, row.bold, row.color);
  const details = [
    d.dueDate
      ? `${d.kind === "quotation" ? "Valid until" : "Due date"}: ${formatDate(d.dueDate)}`
      : "",
    d.placeOfSupply ? `Place of supply: ${d.placeOfSupply}` : "",
    d.reference ? `Reference: ${d.reference}` : "",
    d.paymentTerms ? `Payment terms: ${d.paymentTerms}` : "",
    d.salesperson ? `Salesperson: ${d.salesperson}` : "",
    d.deliveryReference ? `Delivery: ${d.deliveryReference}` : "",
  ].filter(Boolean);
  if (
    partyY - y <= 80 &&
    leftLines.every((row) =>
      row.v
        .split("\n")
        .every(
          (v) =>
            (row.bold ? semibold : regular).widthOfTextAtSize(v, row.size) <=
            260,
        ),
    ) &&
    details.every((v) => regular.widthOfTextAtSize(v, 8) < 220)
  ) {
    let rightY = partyY;
    for (const v of details) {
      text(v, PAGE_W - LEFT, rightY, 8, false, muted, "right");
      rightY -= 14;
    }
    y = Math.min(y, rightY);
  } else for (const v of details) paragraph(v, 8, false, muted);
  if (d.shippingAddress && d.shippingAddress !== d.billingAddress) {
    y -= 6;
    paragraph(`Ship to: ${d.shippingAddress}`, 8, false, muted);
  }
  y -= 17;
  const widths = [18, 153, 40, 38, 59, 31, 31, WIDTH - 470],
    labels = [
      "#",
      "DESCRIPTION",
      "HSN",
      "QTY",
      "RATE",
      "DISC.",
      "GST",
      "AMOUNT",
    ];
  function tableHeader() {
    ensure(35);
    page.drawRectangle({
      x: LEFT,
      y: y - 9,
      width: WIDTH,
      height: 22,
      color: navy,
    });
    let x = LEFT;
    labels.forEach((label, i) => {
      text(
        label,
        i >= 3 ? x + widths[i] - 5 : x + 4,
        y - 1,
        6.1,
        true,
        rgb(1, 1, 1),
        i >= 3 ? "right" : "left",
      );
      x += widths[i];
    });
    y -= 27;
  }
  tableHeader();
  d.items.forEach((item, index) => {
    const batch = w.batches.find((b) => b.id === item.batchId),
      values = [
        String(index + 1),
        [item.name, item.description, batch ? `Lot: ${batch.lot}` : ""]
          .filter(Boolean)
          .join("\n"),
        item.hsn || "—",
        `${item.quantityMilli / 1000}\n${item.unit}`,
        money(item.ratePaise),
        `${item.discountBps / 100}%`,
        d.taxPolicy.enabled ? `${item.taxBps / 100}%` : "—",
        `${money(c.total.lines[index].total)}\nNet ${money(c.total.lines[index].taxable)}`,
      ],
      cells = values.map((v, i) =>
        wrap(v, widths[i] - 9, i === 7 ? 7 : 7.5, i === 1 ? semibold : regular),
      ),
      count = Math.max(...cells.map((c) => c.length)),
      rowHeight = count * 11 + 10;
    if (rowHeight <= PAGE_H - 210 && y - rowHeight < BOTTOM) {
      newPage();
      tableHeader();
    }
    for (let row = 0; row < count; row++) {
      if (y - 14 < BOTTOM) {
        newPage();
        tableHeader();
        text(`Item ${index + 1} continued`, LEFT + 4, y, 7, false, muted);
        y -= 13;
      }
      let x = LEFT;
      cells.forEach((cell, i) => {
        if (cell[row])
          text(
            cell[row],
            i >= 3 ? x + widths[i] - 5 : x + 4,
            y,
            i === 7 ? 7 : 7.5,
            i === 1 && row === 0,
            row > 0 ? muted : navy,
            i >= 3 ? "right" : "left",
          );
        x += widths[i];
      });
      y -= 11;
    }
    y -= 10;
    line(y + 8);
  });
  y -= 15;
  ensure(c.summary.length * 21 + 14);
  for (const [label, value] of c.summary) {
    const grand = label === "Grand total";
    if (grand)
      page.drawRectangle({
        x: 300,
        y: y - 6,
        width: PAGE_W - LEFT - 300,
        height: 22,
        color: rgb(0.91, 0.96, 0.95),
      });
    text(label, 307, y, grand ? 9 : 8, grand, grand ? teal : muted);
    text(
      value,
      PAGE_W - LEFT - 7,
      y,
      grand ? 11 : 9,
      true,
      grand ? teal : navy,
      "right",
    );
    y -= 21;
  }
  for (const [title, value] of [
    ["Notes", d.notes],
    ["Payment details", c.bank.map(([k, v]) => `${k}: ${v}`).join("\n")],
    ["Terms & conditions", d.terms],
  ] as const) {
    if (!value) continue;
    y -= 17;
    ensure(35);
    paragraph(title.toUpperCase(), 7, true, muted);
    paragraph(value, 8, false, muted);
  }
  ensure(95);
  y -= 24;
  text(`For ${c.business.name}`, PAGE_W - LEFT, y, 8, true, navy, "right");
  y -= 48;
  text(
    c.business.signature || "Authorized signatory",
    PAGE_W - LEFT,
    y,
    8,
    false,
    muted,
    "right",
  );
  if (c.business.footer) {
    y -= 25;
    paragraph(c.business.footer, 7.5, false, muted);
  }
  const pages = pdf.getPages();
  pages.forEach((p, index) => {
    page = p;
    line(42);
    text(c.business.website || c.business.name, LEFT, 27, 7, false, muted);
    text(
      `Demo workspace · Page ${index + 1} of ${pages.length}`,
      PAGE_W - LEFT,
      27,
      7,
      false,
      muted,
      "right",
    );
  });
  return pdf.save();
}
export async function downloadDocumentPdf(w: Workspace, d: BillingDocument) {
  const c = documentContent(w, d);
  const urls = [
    "/fonts/manrope-regular.ttf",
    "/fonts/manrope-semibold.ttf",
    c.business.logo,
  ];
  const responses = await Promise.all(urls.map((url) => fetch(url)));
  if (responses.some((r) => !r.ok))
    throw new Error(
      "A local PDF font or logo could not be loaded. Retry after reloading this page.",
    );
  const [regular, semibold, logo] = await Promise.all([
    responses[0].arrayBuffer(),
    responses[1].arrayBuffer(),
    responses[2].text(),
  ]);
  const bytes = await createDocumentPdf(w, d, {
    regular: new Uint8Array(regular),
    semibold: new Uint8Array(semibold),
    logo,
  });
  const url = URL.createObjectURL(
      new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `${d.number.replaceAll("/", "-") || "draft"}.pdf`;
  document.body.append(a);
  a.click();
  a.remove();
  return url;
}

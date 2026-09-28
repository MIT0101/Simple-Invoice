import {
  Document,
  Font,
  // Aliased so the jsx-a11y rule for next/image does not apply to the PDF primitive.
  Image as PdfImage,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { formatDate } from "@/lib/dates";
import { summaryLines } from "@/lib/invoice-form";
import { formatMoney, formatQuantity, lineAmountCents } from "@/lib/money";
import type { InvoiceItem, InvoiceWithItems } from "@/server/invoices";
import type { Settings } from "@/server/settings";

// Keep words whole (react-pdf hyphenates by default); split only long unbroken tokens such as URLs.
const LONG_TOKEN_LENGTH = 30;
Font.registerHyphenationCallback((word) =>
  word.length > LONG_TOKEN_LENGTH ? (word.match(/[\s\S]{1,15}/g) ?? [word]) : [word],
);

/** Splits a URL into short inline pieces so it wraps inside a narrow column without inserted hyphens. */
export function urlBreakPieces(url: string, maxLength = 12): string[] {
  const pieces: string[] = [];
  for (const segment of url.split(/(?<=[/?&=#._~-])/)) {
    for (let start = 0; start < segment.length; start += maxLength) {
      pieces.push(segment.slice(start, start + maxLength));
    }
  }
  return pieces;
}

const SIGNATURE_DATA_URL = /^data:image\/(png|jpe?g);base64,/;

const colors = {
  text: "#111827",
  secondary: "#4b5563",
  muted: "#6b7280",
  rule: "#e5e7eb",
  link: "#1d4ed8",
  draft: "#b91c1c",
  watermark: "#f3f4f6",
};

const PAGE_MARGIN = 42;

// react-pdf multiplies a numeric lineHeight by fontSize again on every re-layout for `render`
// content, so lineHeight is set on the `body` view only, never on the page or page-number text.
const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_MARGIN,
    paddingBottom: 58,
    paddingHorizontal: PAGE_MARGIN,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.text,
  },
  body: { fontSize: 9, lineHeight: 1.45 },
  watermark: {
    position: "absolute",
    top: 340,
    left: 0,
    right: 0,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
    fontSize: 130,
    color: colors.watermark,
    transform: "rotate(-30deg)",
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  titleRow: { flexDirection: "row", alignItems: "center" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 24, lineHeight: 1.1, letterSpacing: 2 },
  draftBadge: {
    marginLeft: 10,
    paddingTop: 3,
    paddingBottom: 2,
    paddingHorizontal: 6,
    borderWidth: 1.2,
    borderColor: colors.draft,
    color: colors.draft,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    lineHeight: 1.2,
    letterSpacing: 1.5,
  },
  meta: { width: 190, paddingTop: 2 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 1 },
  metaLabel: { color: colors.muted },
  metaValue: { fontFamily: "Helvetica-Bold" },
  rule: { marginVertical: 16, borderBottomWidth: 0.75, borderBottomColor: colors.rule },
  parties: { flexDirection: "row" },
  party: { flex: 1 },
  partyGap: { width: 24 },
  sectionLabel: {
    marginBottom: 5,
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    lineHeight: 1.3,
    letterSpacing: 1,
    color: colors.muted,
  },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 10.5, lineHeight: 1.4 },
  secondary: { color: colors.secondary },
  placeholder: { color: colors.muted },
  section: { marginTop: 18 },
  bulletRow: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 10, color: colors.muted },
  bulletText: { flex: 1, color: colors.secondary },
  table: { marginTop: 20 },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
  },
  th: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    lineHeight: 1.3,
    letterSpacing: 0.8,
    color: colors.muted,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 7,
    borderBottomWidth: 0.75,
    borderBottomColor: colors.rule,
  },
  colIndex: { width: 22 },
  colService: { flex: 1, paddingRight: 14 },
  colQty: { width: 44, textAlign: "right" },
  colMoney: { width: 92, textAlign: "right" },
  index: { color: colors.muted },
  itemTitle: { fontFamily: "Helvetica-Bold" },
  itemDescription: { marginTop: 2, color: colors.secondary },
  workLink: { marginTop: 3, color: colors.link, textDecoration: "underline" },
  url: { flexDirection: "row", flexWrap: "wrap", marginTop: 1, textDecoration: "none" },
  urlPiece: { fontSize: 7, lineHeight: 1.35, color: colors.muted },
  totals: {
    alignSelf: "flex-end",
    width: 236,
    marginTop: 10,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.2,
    borderTopColor: colors.text,
  },
  total: { fontFamily: "Helvetica-Bold", fontSize: 11, lineHeight: 1.3 },
  closing: { flexDirection: "row", marginTop: 22 },
  closingText: { flex: 1, paddingRight: 28, rowGap: 12 },
  signature: { width: 200, alignSelf: "flex-end" },
  signatureImage: {
    width: 200,
    height: 56,
    objectFit: "contain",
    objectPosition: "left bottom",
  },
  signatureSpace: { height: 56 },
  signatureLine: {
    marginTop: 4,
    paddingTop: 5,
    borderTopWidth: 0.75,
    borderTopColor: colors.text,
  },
  signatureTitle: { color: colors.secondary },
  footerRule: {
    position: "absolute",
    left: PAGE_MARGIN,
    right: PAGE_MARGIN,
    bottom: 38,
    height: 0,
    borderTopWidth: 0.5,
    borderTopColor: colors.rule,
  },
  footerText: { position: "absolute", bottom: 24, fontSize: 7.5, color: colors.muted },
  footerLeft: { left: PAGE_MARGIN },
  footerRight: { right: PAGE_MARGIN },
});

type InvoiceDocumentProps = {
  invoice: InvoiceWithItems;
  settings: Settings;
};

/** A4 invoice in the built-in Helvetica font, which covers Latin (WinAnsi) characters only. */
export function InvoiceDocument({ invoice, settings }: InvoiceDocumentProps) {
  return (
    <Document
      title={invoice.number ?? "Draft invoice"}
      author={settings.fullName || undefined}
      subject={`Invoice for ${invoice.clientName}`}
      creator="Invoice Generator"
      producer="Invoice Generator"
      language="en"
    >
      <Page size="A4" style={styles.page}>
        {invoice.status === "draft" ? (
          <Text style={styles.watermark} fixed>
            DRAFT
          </Text>
        ) : null}
        <PageFooter label={invoice.number ?? "Draft invoice"} />

        <View style={styles.body}>
          <Header invoice={invoice} />
          <View style={styles.rule} />
          <Parties invoice={invoice} settings={settings} />
          <Summary lines={summaryLines(invoice.summary)} />
          <ItemsTable items={invoice.items} currency={invoice.currency} />
          <View style={styles.totals} wrap={false}>
            <Text style={styles.total}>Total</Text>
            <Text style={styles.total}>{formatMoney(invoice.totalCents, invoice.currency)}</Text>
          </View>
          <Closing invoice={invoice} settings={settings} />
        </View>
      </Page>
    </Document>
  );
}

function PageFooter({ label }: { label: string }) {
  return (
    <>
      <View style={styles.footerRule} fixed />
      <Text style={[styles.footerText, styles.footerLeft]} fixed>
        {label}
      </Text>
      <Text
        style={[styles.footerText, styles.footerRight]}
        fixed
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </>
  );
}

function Header({ invoice }: { invoice: InvoiceWithItems }) {
  return (
    <View style={styles.header} wrap={false}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>INVOICE</Text>
        {invoice.status === "draft" ? <Text style={styles.draftBadge}>DRAFT</Text> : null}
      </View>
      <View style={styles.meta}>
        <MetaRow label="Invoice No." value={invoice.number ?? "Draft"} />
        <MetaRow label="Issue date" value={formatDate(invoice.issueDate)} />
        {invoice.dueDate ? <MetaRow label="Due date" value={formatDate(invoice.dueDate)} /> : null}
      </View>
    </View>
  );
}

function Parties({ invoice, settings }: InvoiceDocumentProps) {
  return (
    <View style={styles.parties} wrap={false}>
      <View style={styles.party}>
        <SectionLabel>FROM</SectionLabel>
        <PartyLines
          name={settings.fullName}
          lines={[settings.jobTitle, settings.email, settings.phone, settings.address, settings.website]}
        />
      </View>
      <View style={styles.partyGap} />
      <View style={styles.party}>
        <SectionLabel>BILL TO</SectionLabel>
        <PartyLines name={invoice.clientName} lines={[invoice.clientDetails]} />
      </View>
    </View>
  );
}

function Summary({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  const [first, ...rest] = lines;
  return (
    <View style={styles.section}>
      {/* Keeps the label on the same page as the first bullet. */}
      <View wrap={false}>
        <SectionLabel>SUMMARY OF COMPLETED WORK</SectionLabel>
        <Bullet text={first} />
      </View>
      {rest.map((line, index) => (
        <Bullet key={index} text={line} />
      ))}
    </View>
  );
}

function ItemsTable({ items, currency }: { items: InvoiceItem[]; currency: string }) {
  return (
    <>
      {/* Starts the table on the next page when under 110pt remain, so the header is never stranded. */}
      <View minPresenceAhead={110} />
      <View style={styles.table}>
        {/* `fixed` repeats the header on every page the table continues on. */}
        <View style={styles.tableHeader} fixed>
          <Text style={[styles.th, styles.colIndex]}>#</Text>
          <Text style={[styles.th, styles.colService]}>SERVICE</Text>
          <Text style={[styles.th, styles.colQty]}>QTY</Text>
          <Text style={[styles.th, styles.colMoney]}>UNIT PRICE</Text>
          <Text style={[styles.th, styles.colMoney]}>AMOUNT</Text>
        </View>
        {items.map((item, index) => (
          <ItemRow key={item.id} item={item} index={index} currency={currency} />
        ))}
      </View>
    </>
  );
}

function Closing({ invoice, settings }: InvoiceDocumentProps) {
  const signature =
    settings.signatureImage && SIGNATURE_DATA_URL.test(settings.signatureImage)
      ? settings.signatureImage
      : null;
  return (
    <View style={styles.closing}>
      <View style={styles.closingText}>
        {settings.paymentDetails ? (
          <TextBlock label="PAYMENT DETAILS" text={settings.paymentDetails} />
        ) : null}
        {invoice.notes ? <TextBlock label="NOTES" text={invoice.notes} /> : null}
      </View>
      <View style={styles.signature} wrap={false}>
        {signature ? (
          <PdfImage src={signature} style={styles.signatureImage} />
        ) : (
          <View style={styles.signatureSpace} />
        )}
        <View style={styles.signatureLine}>
          {settings.fullName ? <Text style={styles.itemTitle}>{settings.fullName}</Text> : null}
          {settings.jobTitle ? <Text style={styles.signatureTitle}>{settings.jobTitle}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function PartyLines({ name, lines }: { name: string; lines: string[] }) {
  const details = lines.filter((line) => line.trim() !== "");
  if (!name && details.length === 0) return <Text style={styles.placeholder}>—</Text>;
  return (
    <View>
      {name ? <Text style={styles.partyName}>{name}</Text> : null}
      {details.map((line, index) => (
        <Text key={index} style={styles.secondary}>
          {line}
        </Text>
      ))}
    </View>
  );
}

/** Keeps the label on the same page as the first line of text. */
function TextBlock({ label, text }: { label: string; text: string }) {
  const [firstLine, ...otherLines] = text.split(/\r?\n/);
  return (
    <View>
      <View wrap={false}>
        <SectionLabel>{label}</SectionLabel>
        <Text style={styles.secondary}>{firstLine}</Text>
      </View>
      {otherLines.length > 0 ? <Text style={styles.secondary}>{otherLines.join("\n")}</Text> : null}
    </View>
  );
}

function ItemRow({ item, index, currency }: { item: InvoiceItem; index: number; currency: string }) {
  return (
    <View style={styles.row} wrap={false}>
      <Text style={[styles.colIndex, styles.index]}>{index + 1}</Text>
      <View style={styles.colService}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        {item.description ? <Text style={styles.itemDescription}>{item.description}</Text> : null}
        {item.workUrl ? (
          <>
            <Link src={item.workUrl} style={styles.workLink}>
              Work unit PDF
            </Link>
            <Link src={item.workUrl} style={styles.url}>
              {urlBreakPieces(item.workUrl).map((piece, pieceIndex) => (
                <Text key={pieceIndex} style={styles.urlPiece}>
                  {piece}
                </Text>
              ))}
            </Link>
          </>
        ) : null}
      </View>
      <Text style={styles.colQty}>{formatQuantity(item.quantity)}</Text>
      <Text style={styles.colMoney}>{formatMoney(item.unitPriceCents, currency)}</Text>
      <Text style={styles.colMoney}>
        {formatMoney(lineAmountCents(item.quantity, item.unitPriceCents), currency)}
      </Text>
    </View>
  );
}

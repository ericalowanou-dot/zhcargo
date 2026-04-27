import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import {
  formatFcfa,
  formatDate,
  generateInvoiceNumber,
} from "@/lib/invoiceFormat";

export { formatFcfa, formatDate, generateInvoiceNumber } from "@/lib/invoiceFormat";

const BLUE = "#1A3C6E";
const ORANGE = "#E67E22";
const GRAY = "#6B7280";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  titleBrand: { fontSize: 22, color: BLUE, fontWeight: "bold" },
  subBrand: { fontSize: 9, color: GRAY, marginTop: 4 },
  factLabel: { fontSize: 24, color: "#9CA3AF", fontWeight: "bold" },
  factNum: { fontSize: 9, color: "#374151", marginTop: 4 },
  divider: { height: 2, backgroundColor: BLUE, marginVertical: 16 },
  sectionTitle: {
    fontSize: 8,
    color: "#374151",
    fontWeight: "bold",
    marginBottom: 6,
  },
  col: { width: "48%" },
  line: { fontSize: 8, marginBottom: 3, color: "#111827" },
  table: { marginTop: 12 },
  th: { flexDirection: "row", backgroundColor: BLUE, padding: 6 },
  thc: { fontSize: 7, color: "white", fontWeight: "bold" },
  tr: {
    flexDirection: "row",
    padding: 5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  trAlt: { backgroundColor: "#F9FAFB" },
  tc: { fontSize: 7, color: "#111827" },
  totals: { marginTop: 12, alignItems: "flex-end" },
  totalRow: { fontSize: 9, marginBottom: 2 },
  totalBig: { fontSize: 12, color: ORANGE, fontWeight: "bold", marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 7,
    color: GRAY,
  },
  footNote: { marginTop: 4, fontSize: 6, color: "#9CA3AF" },
  col1: { width: "40%" },
  col2: { width: "15%" },
  col3: { width: "22%" },
  col4: { width: "23%" },
});

/** Commande Prisma chargée : client, items (product: name seulement), payment */
export type OrderInvoiceData = {
  id: string;
  createdAt: Date;
  totalFcfa: number;
  status: string;
  deliveryFullName: string | null;
  deliveryCity: string | null;
  deliveryNeighborhood: string | null;
  deliveryLandmark: string | null;
  paymentOperator: string | null;
  paymentReference: string | null;
  estimatedDelivery: string | null;
  client: {
    name: string | null;
    phone: string;
    country: string;
    city: string | null;
    neighborhood: string | null;
    landmark: string | null;
  };
  items: {
    quantity: number;
    unitPriceFcfa: number;
    subtotalFcfa: number;
    product: { name: string };
  }[];
  payment: {
    operator: string;
    status: string;
    transactionId: string | null;
  } | null;
};

function operatorLabel(idOrKey: string | null | undefined) {
  if (!idOrKey) return "—";
  if (idOrKey.toLowerCase().includes("tmoney") || idOrKey.startsWith("tg_")) {
    return "TMoney";
  }
  if (idOrKey.toLowerCase().includes("flooz") || idOrKey.includes("flooz")) {
    return "Flooz";
  }
  if (idOrKey.toLowerCase().includes("mtn") || idOrKey.includes("mtn")) {
    return "MTN";
  }
  if (idOrKey.toLowerCase().includes("orange")) return "Orange Money";
  if (idOrKey.toLowerCase().includes("wave")) return "Wave";
  return idOrKey;
}

function InvoiceContent({ order }: { order: OrderInvoiceData }) {
  const num = generateInvoiceNumber(order.id);
  const op =
    order.payment?.operator || order.paymentOperator || order.paymentReference;
  const payRef =
    order.payment?.transactionId || order.paymentReference || "—";
  const name = order.deliveryFullName || order.client.name || "Client";
  const addr = [
    order.deliveryCity || order.client.city,
    order.deliveryNeighborhood || order.client.neighborhood,
  ]
    .filter(Boolean)
    .join(", ");
  const rep = order.deliveryLandmark || order.client.landmark || "—";
  const genAt = new Date();
  const support =
    process.env.NEXT_PUBLIC_SUPPORT_PHONE ||
    process.env.SUPPORT_PHONE ||
    process.env.NEXT_PUBLIC_WHATSAPP ||
    "+228 XX XX XX XX";
  const subtotalSum = order.items.reduce(
    (s, it) => s + it.subtotalFcfa,
    0,
  );

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.row}>
        <View>
          <Text style={styles.titleBrand}>ZH CARGO</Text>
          <Text style={styles.subBrand}>Direct depuis la Chine</Text>
        </View>
        <View>
          <Text style={styles.factLabel}>FACTURE</Text>
          <Text style={styles.factNum}>N° {num}</Text>
          <Text style={styles.factNum}>
            Date : {formatDate(new Date(order.createdAt))}
          </Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.sectionTitle}>FACTURÉ À :</Text>
          <Text style={styles.line}>{name}</Text>
          <Text style={styles.line}>{order.client.phone}</Text>
          <Text style={styles.line}>Pays : {order.client.country}</Text>
          <Text style={styles.line}>Adresse : {addr || "—"}</Text>
          <Text style={styles.line}>Repère : {rep}</Text>
        </View>
        <View style={styles.col}>
          <Text style={styles.sectionTitle}>DÉTAILS COMMANDE :</Text>
          <Text style={styles.line}>Statut : Payée</Text>
          <Text style={styles.line}>Opérateur : {operatorLabel(op)}</Text>
          <Text style={styles.line}>Réf. paiement : {String(payRef)}</Text>
          <Text style={styles.line}>
            Délai estimé : {order.estimatedDelivery || "—"}
          </Text>
        </View>
      </View>
      <View style={styles.table}>
        <View style={styles.th}>
          <Text style={[styles.thc, styles.col1]}>Produit</Text>
          <Text style={[styles.thc, styles.col2, { textAlign: "center" }]}>
            Qté
          </Text>
          <Text style={[styles.thc, styles.col3, { textAlign: "right" }]}>
            Prix unitaire
          </Text>
          <Text style={[styles.thc, styles.col4, { textAlign: "right" }]}>
            Sous-total
          </Text>
        </View>
        {order.items.map((it, i) => (
          <View key={i} style={[styles.tr, i % 2 === 1 ? styles.trAlt : {}]}>
            <Text style={[styles.tc, styles.col1]}>{it.product.name}</Text>
            <Text style={[styles.tc, styles.col2, { textAlign: "center" }]}>
              {it.quantity}
            </Text>
            <Text style={[styles.tc, styles.col3, { textAlign: "right" }]}>
              {formatFcfa(it.unitPriceFcfa)}
            </Text>
            <Text style={[styles.tc, styles.col4, { textAlign: "right" }]}>
              {formatFcfa(it.subtotalFcfa)}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.totals}>
        <Text style={styles.totalRow}>
          Sous-total : {formatFcfa(subtotalSum)}
        </Text>
        <Text style={styles.totalRow}>Frais de livraison : Inclus</Text>
        <Text style={styles.line}>────────────</Text>
        <Text style={styles.totalBig}>
          TOTAL : {formatFcfa(order.totalFcfa)}
        </Text>
      </View>
      <View style={styles.footer} fixed>
        <Text>Merci pour votre commande !</Text>
        <Text style={{ marginTop: 3 }}>Pour toute question : {support}</Text>
        <Text style={{ marginTop: 2 }}>
          ZH Cargo — Direct depuis la Chine vers l’Afrique de l’Ouest
        </Text>
        <Text style={styles.footNote}>
          Document généré automatiquement le {formatDate(genAt)}
        </Text>
      </View>
    </Page>
  );
}

function InvoiceDocument({ order }: { order: OrderInvoiceData }) {
  return (
    <Document>
      <InvoiceContent order={order} />
    </Document>
  );
}

export async function generateInvoicePDF(
  order: OrderInvoiceData,
): Promise<Buffer> {
  return (await renderToBuffer(
    <InvoiceDocument order={order} />,
  )) as unknown as Buffer;
}

import { requireAdmin } from "@/lib/adminAuth";
import { formatFcfa } from "@/lib/invoiceFormat";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  h1: { fontSize: 18, color: "#1A3C6E", fontWeight: "bold" },
  sub: { color: "#6B7280", marginTop: 4, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  card: { width: "48%", borderWidth: 1, borderColor: "#E5E7EB", padding: 8, borderRadius: 4 },
  label: { fontSize: 8, color: "#6B7280" },
  value: { fontSize: 12, fontWeight: "bold", marginTop: 2 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: "bold", marginBottom: 6, color: "#111827" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#E5E7EB", paddingVertical: 4 },
  th: { fontWeight: "bold", fontSize: 8 },
  td: { fontSize: 8 },
  c1: { width: "38%" },
  c2: { width: "16%", textAlign: "right" },
  c3: { width: "20%", textAlign: "right" },
  c4: { width: "26%", textAlign: "right" },
});

export async function GET(request: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from/to requis" }, { status: 400 });
  }

  const base = `${request.nextUrl.origin}/api/admin/rapports?from=${encodeURIComponent(
    from,
  )}&to=${encodeURIComponent(to)}`;
  const res = await fetch(base, {
    headers: { cookie: request.headers.get("cookie") || "" },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Impossible de générer le rapport" }, { status: 500 });
  }
  const data = (await res.json()) as {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    averageMargin: number;
    ordersCount: { delivered: number; transit: number; cancelled: number };
    productPerformance: {
      name: string;
      unitsSold: number;
      revenue: number;
      profit: number;
    }[];
  };

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>ZH CARGO — RAPPORT FINANCIER</Text>
        <Text style={styles.sub}>Période: du {from} au {to}</Text>

        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.label}>Chiffre d&apos;affaires</Text>
            <Text style={styles.value}>{formatFcfa(data.totalRevenue)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Coûts totaux</Text>
            <Text style={styles.value}>{formatFcfa(data.totalCost)}</Text>
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.card}>
            <Text style={styles.label}>Bénéfice net</Text>
            <Text style={styles.value}>{formatFcfa(data.totalProfit)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.label}>Marge moyenne</Text>
            <Text style={styles.value}>{data.averageMargin.toFixed(1)} %</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Commandes</Text>
          <Text style={styles.td}>
            Livrées: {data.ordersCount.delivered} | En transit: {data.ordersCount.transit} | Annulées: {data.ordersCount.cancelled}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance produits</Text>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.c1]}>Produit</Text>
            <Text style={[styles.th, styles.c2]}>Unités</Text>
            <Text style={[styles.th, styles.c3]}>Revenus</Text>
            <Text style={[styles.th, styles.c4]}>Bénéfice</Text>
          </View>
          {data.productPerformance.slice(0, 20).map((p, i) => (
            <View key={i} style={styles.tr}>
              <Text style={[styles.td, styles.c1]}>{p.name}</Text>
              <Text style={[styles.td, styles.c2]}>{p.unitsSold}</Text>
              <Text style={[styles.td, styles.c3]}>{formatFcfa(p.revenue)}</Text>
              <Text style={[styles.td, styles.c4]}>{formatFcfa(p.profit)}</Text>
            </View>
          ))}
        </View>

        <Text style={{ position: "absolute", bottom: 20, left: 28, right: 28, fontSize: 7, color: "#9CA3AF" }}>
          Document généré automatiquement le {new Date().toLocaleString("fr-FR")}
        </Text>
      </Page>
    </Document>
  );

  const pdf = (await renderToBuffer(doc)) as unknown as Buffer;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="rapport-financier-${from}-${to}.pdf"`,
    },
  });
}

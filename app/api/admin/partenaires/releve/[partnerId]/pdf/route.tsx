import { requireAdmin } from "@/lib/adminAuth";
import { formatFcfa } from "@/lib/invoiceFormat";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { NextRequest, NextResponse } from "next/server";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 18, color: "#1A3C6E", fontWeight: "bold" },
  subtitle: { color: "#6B7280", marginTop: 4, marginBottom: 10 },
  summary: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 6, padding: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  strong: { fontWeight: "bold" },
  section: { marginTop: 12 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#E5E7EB", paddingVertical: 4 },
  c1: { width: "16%" },
  c2: { width: "20%" },
  c3: { width: "34%" },
  c4: { width: "15%", textAlign: "right" },
  c5: { width: "15%", textAlign: "right" },
});

export async function GET(request: NextRequest, { params }: { params: { partnerId: string } }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from/to requis" }, { status: 400 });
  }

  const source = `${request.nextUrl.origin}/api/admin/partenaires/releve/${params.partnerId}?from=${encodeURIComponent(
    from,
  )}&to=${encodeURIComponent(to)}`;
  const res = await fetch(source, {
    headers: { cookie: request.headers.get("cookie") || "" },
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Impossible de générer le relevé" }, { status: 500 });
  }
  const data = (await res.json()) as {
    partner: { name: string; role: string; percentage: number };
    totalProfit: number;
    totalShare: number;
    breakdown: {
      date: string;
      invoiceNumber: string;
      products: string;
      orderProfit: number;
      partnerShare: number;
    }[];
  };

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>ZH CARGO — RELEVÉ PARTENAIRE</Text>
        <Text style={styles.subtitle}>
          Partenaire: {data.partner.name} ({data.partner.role}) | Période: {from} → {to}
        </Text>

        <View style={styles.summary}>
          <View style={styles.row}>
            <Text>Bénéfice net total période</Text>
            <Text style={styles.strong}>{formatFcfa(data.totalProfit)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Pourcentage</Text>
            <Text style={styles.strong}>{data.partner.percentage.toFixed(2)} %</Text>
          </View>
          <View style={styles.row}>
            <Text>Votre part</Text>
            <Text style={styles.strong}>{formatFcfa(data.totalShare)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.tr}>
            <Text style={[styles.c1, styles.strong]}>Date</Text>
            <Text style={[styles.c2, styles.strong]}>N° Commande</Text>
            <Text style={[styles.c3, styles.strong]}>Produits</Text>
            <Text style={[styles.c4, styles.strong]}>Bénéfice</Text>
            <Text style={[styles.c5, styles.strong]}>Votre part</Text>
          </View>
          {data.breakdown.slice(0, 40).map((row, idx) => (
            <View key={idx} style={styles.tr}>
              <Text style={styles.c1}>{new Date(row.date).toLocaleDateString("fr-FR")}</Text>
              <Text style={styles.c2}>{row.invoiceNumber}</Text>
              <Text style={styles.c3}>{row.products}</Text>
              <Text style={styles.c4}>{formatFcfa(row.orderProfit)}</Text>
              <Text style={styles.c5}>{formatFcfa(row.partnerShare)}</Text>
            </View>
          ))}
        </View>

        <Text
          style={{
            position: "absolute",
            bottom: 18,
            left: 28,
            right: 28,
            textAlign: "center",
            fontSize: 7,
            color: "#9CA3AF",
          }}
        >
          Document confidentiel — généré le {new Date().toLocaleString("fr-FR")}
        </Text>
      </Page>
    </Document>
  );

  const pdf = (await renderToBuffer(doc)) as unknown as Buffer;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="releve-partenaire-${params.partnerId}.pdf"`,
    },
  });
}

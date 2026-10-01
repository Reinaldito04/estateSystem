import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type AccountStatementPdfData = {
  title: string;
  agencyName: string;
  periodLabel: string;
  properties: { code: string; title: string; address: string }[];
  incomeByCurrency: { currency: string; total: number }[];
  expensesByCurrency: { currency: string; total: number }[];
  totalRepairCosts: number;
  transactions: {
    id: string;
    category: string;
    amount: unknown;
    currency: string;
    paymentDate: Date;
    paymentMethod: string;
    referenceNumber: string | null;
    property: { code: string; title: string } | null;
    lease: { contractNumber: string } | null;
  }[];
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#1f2937" },
  header: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingBottom: 10 },
  agency: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 10, color: "#6b7280", marginTop: 2 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingVertical: 4 },
  headRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#9ca3af", paddingVertical: 4 },
  cell: { flex: 1 },
  cellSmall: { width: 70 },
  head: { fontFamily: "Helvetica-Bold" },
  totals: { marginTop: 12, padding: 10, backgroundColor: "#f9fafb", borderRadius: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
});

const CATEGORY_LABELS: Record<string, string> = {
  RENT_CANON: "Canon",
  RESERVATION: "Reserva",
  SECURITY_DEPOSIT: "Depósito",
  CONTRACT_FEE: "Gastos contrato",
  CONDO_FEE: "Condominio",
  ELECTRICITY: "Electricidad",
  INTERNET: "Internet",
  OTHER_SERVICE: "Otros servicios",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatMoney(amount: unknown, currency: string) {
  return `${currency} ${Number(amount).toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;
}

export function createAccountStatementDocument(data: AccountStatementPdfData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.agency}>{data.agencyName}</Text>
          <Text style={styles.subtitle}>{data.title}</Text>
          <Text style={styles.subtitle}>Período: {data.periodLabel}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inmuebles</Text>
          {data.properties.map((property) => (
            <Text key={property.code}>
              {property.code} · {property.title} — {property.address}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Movimientos</Text>
          <View style={styles.headRow}>
            <Text style={[styles.cell, styles.head]}>Fecha</Text>
            <Text style={[styles.cell, styles.head]}>Concepto</Text>
            <Text style={[styles.cell, styles.head]}>Inmueble</Text>
            <Text style={[styles.cell, styles.head]}>Método</Text>
            <Text style={[styles.cellSmall, styles.head]}>Monto</Text>
          </View>
          {data.transactions.length === 0 ? (
            <Text style={{ marginTop: 6 }}>Sin movimientos en el período.</Text>
          ) : (
            data.transactions.map((transaction) => (
              <View key={transaction.id} style={styles.row}>
                <Text style={styles.cell}>{formatDate(transaction.paymentDate)}</Text>
                <Text style={styles.cell}>{CATEGORY_LABELS[transaction.category] || transaction.category}</Text>
                <Text style={styles.cell}>{transaction.property?.code || "—"}</Text>
                <Text style={styles.cell}>{transaction.paymentMethod}</Text>
                <Text style={styles.cellSmall}>{formatMoney(transaction.amount, transaction.currency)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.totals}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          {data.incomeByCurrency.map((row) => (
            <View key={`income-${row.currency}`} style={styles.totalRow}>
              <Text>Ingresos ({row.currency})</Text>
              <Text>{formatMoney(row.total, row.currency)}</Text>
            </View>
          ))}
          {data.expensesByCurrency.map((row) => (
            <View key={`expense-${row.currency}`} style={styles.totalRow}>
              <Text>Egresos ({row.currency})</Text>
              <Text>{formatMoney(row.total, row.currency)}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text>Costos de reparaciones</Text>
            <Text>{formatMoney(data.totalRepairCosts, "USD")}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

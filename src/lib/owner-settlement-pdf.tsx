import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { OwnerSettlementResult } from "@/lib/owner-settlement";

export type OwnerSettlementPdfData = OwnerSettlementResult & {
  agencyName: string;
  settlementNumber: string;
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
  header: { marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingBottom: 10 },
  agency: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  title: { fontSize: 12, marginTop: 4, color: "#374151" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "#6b7280" },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  headRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#9ca3af", paddingVertical: 5 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6", paddingVertical: 5 },
  cell: { flex: 1 },
  cellNum: { width: 90, textAlign: "right" },
  head: { fontFamily: "Helvetica-Bold" },
  totals: { marginTop: 16, padding: 12, backgroundColor: "#f9fafb", borderRadius: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  grand: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#9ca3af" },
  grandText: { fontFamily: "Helvetica-Bold", fontSize: 12 },
  footer: { marginTop: 24, fontSize: 8, color: "#9ca3af", textAlign: "center" },
});

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;
}

export function createOwnerSettlementDocument(data: OwnerSettlementPdfData) {
  const { currency } = data;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.agency}>{data.agencyName}</Text>
          <Text style={styles.title}>Liquidación al propietario · {data.settlementNumber}</Text>
          <View style={styles.metaRow}>
            <Text>Propietario: {data.owner.fullName}</Text>
            <Text>Período: {formatDate(data.periodStart)} - {formatDate(data.periodEnd)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle por inmueble</Text>
          <View style={styles.headRow}>
            <Text style={[styles.cell, styles.head]}>Inmueble</Text>
            <Text style={[styles.cellNum, styles.head]}>Ingresos</Text>
            <Text style={[styles.cellNum, styles.head]}>Mora</Text>
            <Text style={[styles.cellNum, styles.head]}>Comisión</Text>
            <Text style={[styles.cellNum, styles.head]}>Gastos</Text>
            <Text style={[styles.cellNum, styles.head]}>Neto</Text>
          </View>
          {data.properties.map((line) => (
            <View style={styles.row} key={line.propertyId}>
              <Text style={styles.cell}>{line.code} · {line.title}</Text>
              <Text style={styles.cellNum}>{formatMoney(line.income, currency)}</Text>
              <Text style={styles.cellNum}>{formatMoney(line.lateFees, currency)}</Text>
              <Text style={styles.cellNum}>-{formatMoney(line.commission, currency)}</Text>
              <Text style={styles.cellNum}>-{formatMoney(line.expenses, currency)}</Text>
              <Text style={styles.cellNum}>{formatMoney(line.net, currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Ingresos brutos</Text>
            <Text>{formatMoney(data.grossIncome, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Mora cobrada</Text>
            <Text>{formatMoney(data.lateFees, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Comisión agencia ({(data.commissionRate * 100).toFixed(2)}%)</Text>
            <Text>-{formatMoney(data.agencyCommission, currency)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Gastos y reparaciones</Text>
            <Text>-{formatMoney(data.expenses, currency)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grand]}>
            <Text style={styles.grandText}>Neto a transferir</Text>
            <Text style={styles.grandText}>{formatMoney(data.netPayout, currency)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Documento generado automáticamente por {data.agencyName}</Text>
      </Page>
    </Document>
  );
}

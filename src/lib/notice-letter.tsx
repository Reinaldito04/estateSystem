import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export type NoticeLetterData = {
  title: string;
  body: string;
  noticeType: "LEASE_EXPIRATION" | "RENOVATION_PROPOSAL" | "OWNER_NOTICE";
  recipientType: "OWNER" | "TENANT";
  recipientName: string;
  issueDate: Date;
  agencyName: string;
  leaseNumber: string;
  propertyLabel: string;
  propertyAddress: string;
  startDate: Date | null;
  endDate: Date | null;
  monthlyCanonAmount: number | null;
  currency: string;
  proposedCanonAmount: number | null;
  proposedStartDate: Date | null;
  proposedEndDate: Date | null;
};

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1f2937", lineHeight: 1.5 },
  header: { marginBottom: 24, borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingBottom: 12 },
  agency: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  date: { marginTop: 4, fontSize: 10, color: "#6b7280" },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 16 },
  paragraph: { marginBottom: 10 },
  block: { marginTop: 12, padding: 12, backgroundColor: "#f9fafb", borderRadius: 4 },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 150, color: "#6b7280" },
  value: { flex: 1, fontFamily: "Helvetica-Bold" },
  signature: { marginTop: 48 },
  signatureLine: { borderTopWidth: 1, borderTopColor: "#9ca3af", width: 200, marginTop: 32, paddingTop: 4, fontSize: 10 },
});

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-VE", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function formatMoney(amount: number | null, currency: string) {
  if (amount === null) return "—";
  return `${currency} ${amount.toLocaleString("es-VE", { minimumFractionDigits: 2 })}`;
}

export function createNoticeLetterDocument(data: NoticeLetterData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.agency}>{data.agencyName}</Text>
          <Text style={styles.date}>Fecha de emisión: {formatDate(data.issueDate)}</Text>
        </View>

        <Text style={styles.title}>{data.title}</Text>

        <Text style={styles.paragraph}>Estimado(a) {data.recipientName}:</Text>

        {data.body.split("\n").map((line, index) => (
          <Text key={index} style={styles.paragraph}>
            {line}
          </Text>
        ))}

        <View style={styles.block}>
          <View style={styles.row}>
            <Text style={styles.label}>Inmueble</Text>
            <Text style={styles.value}>
              {data.propertyLabel} — {data.propertyAddress}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contrato</Text>
            <Text style={styles.value}>{data.leaseNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Vigencia</Text>
            <Text style={styles.value}>
              {formatDate(data.startDate)} al {formatDate(data.endDate)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Canon vigente</Text>
            <Text style={styles.value}>{formatMoney(data.monthlyCanonAmount, data.currency)}</Text>
          </View>
          {data.noticeType === "RENOVATION_PROPOSAL" && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Canon propuesto</Text>
                <Text style={styles.value}>{formatMoney(data.proposedCanonAmount, data.currency)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Nuevo período</Text>
                <Text style={styles.value}>
                  {formatDate(data.proposedStartDate)} al {formatDate(data.proposedEndDate)}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.signature}>
          <Text>Atentamente,</Text>
          <Text style={styles.signatureLine}>{data.agencyName}</Text>
        </View>
      </Page>
    </Document>
  );
}

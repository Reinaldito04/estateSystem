import React from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", color: "#1f2937", lineHeight: 1.45 },
  agency: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  meta: { marginTop: 4, fontSize: 9, color: "#6b7280" },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 12 },
  paragraph: { marginBottom: 6 },
  footer: { marginTop: 28, fontSize: 8, color: "#6b7280" },
});

export function createTextDocument(data: {
  agencyName: string;
  title: string;
  lines: string[];
  footer?: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.agency}>{data.agencyName}</Text>
        <Text style={styles.meta}>{new Intl.DateTimeFormat("es-VE").format(new Date())}</Text>
        <Text style={styles.title}>{data.title}</Text>
        {data.lines.map((line, index) => (
          <Text key={`${index}-${line.slice(0, 12)}`} style={styles.paragraph}>
            {line || " "}
          </Text>
        ))}
        {data.footer ? <Text style={styles.footer}>{data.footer}</Text> : null}
      </Page>
    </Document>
  );
}

export function createReceiptDocument(data: {
  agencyName: string;
  receiptNumber: string;
  paymentDate: Date;
  propertyLabel: string;
  contractNumber: string | null;
  category: string;
  amount: string;
  status: string;
  method: string;
  reference: string | null;
  description: string | null;
}) {
  return createTextDocument({
    agencyName: data.agencyName,
    title: `Recibo ${data.receiptNumber}`,
    lines: [
      `Fecha: ${new Intl.DateTimeFormat("es-VE").format(data.paymentDate)}`,
      `Inmueble: ${data.propertyLabel}`,
      `Contrato: ${data.contractNumber || "Sin contrato"}`,
      `Concepto: ${data.category}`,
      `Monto: ${data.amount}`,
      `Estado: ${data.status}`,
      `Método: ${data.method}`,
      `Referencia: ${data.reference || "—"}`,
      `Detalle: ${data.description || "—"}`,
      "",
      "Este recibo acredita el movimiento registrado en el sistema. No sustituye un comprobante bancario.",
    ],
  });
}

export function createHandoverDocument(data: {
  agencyName: string;
  contractNumber: string;
  propertyLabel: string;
  address: string;
  ownerName: string;
  tenantName: string;
  startDate: string;
  endDate: string;
  keys: string[];
  assets: string[];
}) {
  return createTextDocument({
    agencyName: data.agencyName,
    title: `Acta de entrega ${data.contractNumber}`,
    lines: [
      `Inmueble: ${data.propertyLabel}`,
      `Dirección: ${data.address}`,
      `Propietario: ${data.ownerName}`,
      `Inquilino: ${data.tenantName}`,
      `Vigencia: ${data.startDate} a ${data.endDate}`,
      "",
      "Llaves",
      ...(data.keys.length ? data.keys : ["Sin llaves registradas"]),
      "",
      "Inventario entregado",
      ...(data.assets.length ? data.assets : ["Sin activos registrados"]),
      "",
      "Las partes dejan constancia de la entrega del inmueble en el estado descrito. Los daños posteriores se documentarán contra este inventario.",
    ],
    footer: "Firmas: propietario, inquilino y agencia.",
  });
}

export function createInventoryDocument(data: {
  agencyName: string;
  propertyLabel: string;
  address: string;
  assets: string[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.agency}>{data.agencyName}</Text>
          <Text style={styles.title}>Inventario {data.propertyLabel}</Text>
          <Text style={styles.paragraph}>{data.address}</Text>
          {(data.assets.length ? data.assets : ["Sin activos registrados"]).map((asset) => (
            <Text key={asset} style={styles.paragraph}>
              {asset}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  );
}

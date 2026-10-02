import { prisma } from "@/lib/prisma";
import { sendMail, isMailerConfigured } from "@/lib/mailer";
import { calculateLeaseBalance } from "@/lib/lease-balance";
import { formatCurrency, formatDate } from "@/lib/utils";

export type ReminderResult = {
  candidates: number;
  sent: { leaseId: string; contractNumber: string; email: string }[];
  skipped: { leaseId: string; reason: string }[];
  mailerConfigured: boolean;
};

export async function sendPaymentReminders(referenceDate = new Date()): Promise<ReminderResult> {
  const now = referenceDate;
  const mailerConfigured = isMailerConfigured();

  const leases = await prisma.lease.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      contractNumber: true,
      startDate: true,
      endDate: true,
      monthlyCanonAmount: true,
      currency: true,
      lateFeeType: true,
      lateFeeValue: true,
      lateFeeGraceDays: true,
      property: { select: { code: true, title: true } },
      leaseClients: { where: { role: "TENANT" }, select: { client: { select: { id: true, fullName: true, email: true } } } },
      transactions: {
        where: { status: "PAID" },
        select: { category: true, amount: true, currency: true, paymentDate: true, status: true },
      },
    },
  });

  const sent: ReminderResult["sent"] = [];
  const skipped: ReminderResult["skipped"] = [];

  for (const lease of leases) {
    const tenant = lease.leaseClients[0]?.client;
    if (!tenant?.email) {
      skipped.push({ leaseId: lease.id, reason: "Inquilino sin correo" });
      continue;
    }

    const balance = calculateLeaseBalance(
      lease.startDate,
      lease.endDate,
      Number(lease.monthlyCanonAmount),
      lease.transactions.map((t) => ({
        category: t.category,
        amount: Number(t.amount),
        paymentDate: t.paymentDate,
        status: t.status,
        currency: t.currency,
      })),
      now,
      lease.currency,
      { type: lease.lateFeeType, value: lease.lateFeeValue === null ? null : Number(lease.lateFeeValue), graceDays: lease.lateFeeGraceDays },
    );

    if (balance.debtAmount <= 0) {
      skipped.push({ leaseId: lease.id, reason: "Sin deuda pendiente" });
      continue;
    }

    const lines = [
      `Estimado(a) ${tenant.fullName},`,
      "",
      `Le recordamos que el contrato ${lease.contractNumber} del inmueble ${lease.property.code} - ${lease.property.title} presenta un saldo pendiente.`,
      "",
      `Canon mensual: ${formatCurrency(Number(lease.monthlyCanonAmount), lease.currency)}`,
      `Deuda de canon: ${formatCurrency(balance.debtAmount, lease.currency)}`,
      `Cuotas vencidas: ${balance.overdueInstallments}`,
      `Días en mora: ${balance.debtDays}`,
    ];
    if (balance.lateFeeAmount > 0) {
      lines.push(`Mora acumulada: ${formatCurrency(balance.lateFeeAmount, lease.currency)}`);
      lines.push(`Total a pagar: ${formatCurrency(balance.totalDue, lease.currency)}`);
    }
    lines.push("", `Fecha de referencia: ${formatDate(now)}`, "", "Gracias por su atención.");

    if (mailerConfigured) {
      try {
        await sendMail({
          to: tenant.email,
          subject: `Recordatorio de pago · Contrato ${lease.contractNumber}`,
          text: lines.join("\n"),
        });
        sent.push({ leaseId: lease.id, contractNumber: lease.contractNumber, email: tenant.email });
      } catch (error) {
        skipped.push({ leaseId: lease.id, reason: error instanceof Error ? error.message : "Error al enviar" });
      }
    } else {
      sent.push({ leaseId: lease.id, contractNumber: lease.contractNumber, email: tenant.email });
    }
  }

  return { candidates: leases.length, sent, skipped, mailerConfigured };
}

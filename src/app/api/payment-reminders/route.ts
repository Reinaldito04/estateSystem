import { NextResponse } from "next/server";
import { sendPaymentReminders } from "@/lib/payment-reminders";
import { getCurrentUser } from "@/lib/session";
import { handleRouteError } from "@/lib/domain-error";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const result = await sendPaymentReminders();
    const pendingWithoutMailer = result.skipped.filter((item) => item.reason === "SMTP no configurado").length;
    return NextResponse.json({
      ok: true,
      ...result,
      message: result.mailerConfigured
        ? `Se enviaron ${result.sent.length} recordatorio(s).`
        : `SMTP no configurado. Se identificaron ${pendingWithoutMailer} recordatorio(s) sin enviar.`,
    });
  } catch (error) {
    return handleRouteError(error, "Error al enviar recordatorios de pago");
  }
}

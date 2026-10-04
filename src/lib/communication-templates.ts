export type CommunicationTemplate = {
  id: string;
  label: string;
  subject: string;
  content: string;
};

export const COMMUNICATION_TEMPLATES: CommunicationTemplate[] = [
  {
    id: "payment_reminder",
    label: "Recordatorio de pago",
    subject: "Recordatorio de pago pendiente",
    content:
      "Estimado(a) {{nombre}},\n\nLe recordamos que mantiene un saldo pendiente asociado a su contrato de arrendamiento. Le agradecemos gestionar el pago a la brevedad posible.\n\nQuedamos atentos a cualquier consulta.",
  },
  {
    id: "contract_renewal",
    label: "Propuesta de renovación",
    subject: "Propuesta de renovación de contrato",
    content:
      "Estimado(a) {{nombre}},\n\nSu contrato de arrendamiento está próximo a vencer. Nos complace proponerle una renovación y comentarle las condiciones actualizadas.\n\nQuedamos atentos para coordinar los siguientes pasos.",
  },
  {
    id: "visit_confirmation",
    label: "Confirmación de visita",
    subject: "Confirmación de visita al inmueble",
    content:
      "Estimado(a) {{nombre}},\n\nConfirmamos su visita al inmueble para la fecha acordada. Por favor, confírmenos su asistencia y avísenos con antelación si necesita reprogramar.",
  },
  {
    id: "maintenance_followup",
    label: "Seguimiento de avería",
    subject: "Seguimiento de su reporte de avería",
    content:
      "Estimado(a) {{nombre}},\n\nLe informamos que su reporte de avería se encuentra en gestión. Le mantendremos al tanto del avance y de la fecha de resolución estimada.",
  },
  {
    id: "welcome",
    label: "Bienvenida",
    subject: "Bienvenido(a) a nuestra inmobiliaria",
    content:
      "Estimado(a) {{nombre}},\n\nLe damos la bienvenida y agradecemos su confianza. Quedamos a su disposición para acompañarle en la gestión de su inmueble.",
  },
];

export function renderTemplateString(text: string, variables: Record<string, string>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    const value = variables[key];
    return value === undefined ? match : value;
  });
}

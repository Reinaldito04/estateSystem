import { ClientDetailPage } from "@/features/clients/components/client-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ClientDetailPage clientId={id} />;
}

import TrackingView from "@/components/tracking/TrackingView";

export default async function TrackingCodePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  return <TrackingView code={decodeURIComponent(codigo)} />;
}

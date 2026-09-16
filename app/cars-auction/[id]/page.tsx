import { redirect } from 'next/navigation';

export default async function CarsAuctionAliasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/vehicles/${encodeURIComponent(id)}`);
}

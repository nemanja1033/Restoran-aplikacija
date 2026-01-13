import { SupplierDetailsPage } from "@/components/supplier-details-page";

export default async function SupplierDetails({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupplierDetailsPage supplierId={Number(id)} />;
}

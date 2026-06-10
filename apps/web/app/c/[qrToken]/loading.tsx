import { PageSpinner } from "@/components/dashboard/page-loading";

export default function PublicCaptureLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-accent/20">
      <PageSpinner label="Chargement du stand…" />
    </div>
  );
}

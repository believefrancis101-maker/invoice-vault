import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import Navbar from "@/components/navbar";
import CreateInvoiceForm from "@/components/create-invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Navbar user={user} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <CreateInvoiceForm />
      </main>
    </div>
  );
}

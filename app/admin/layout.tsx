import Navbar from "@/components/Navbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen bg-slate-50">
      <Navbar />
      <main>
        {children}
      </main>
    </section>
  );
}
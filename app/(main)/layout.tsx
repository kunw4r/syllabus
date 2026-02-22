import Navbar from '@/components/layout/Navbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="lg:ml-60 pt-14 lg:pt-0 pb-20 lg:pb-0 min-h-screen">
        <div className="px-4 sm:px-6 lg:px-10 py-6 lg:py-8">{children}</div>
      </main>
    </>
  );
}

import Navbar from '@/components/layout/Navbar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="pt-14 lg:pt-16 pb-20 lg:pb-0 min-h-screen">
        <div className="px-5 sm:px-8 lg:px-14 xl:px-20 2xl:px-28 py-6 lg:py-4">{children}</div>
      </main>
    </>
  );
}

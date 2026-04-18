import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen relative font-sans text-dark-text antialiased selection:bg-brand-500 selection:text-white">
      <div className="fixed inset-0 bg-noise z-0 pointer-events-none"></div>
      <Header />
      <main className="flex-1 relative z-10 w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

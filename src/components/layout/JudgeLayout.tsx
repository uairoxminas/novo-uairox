import { Outlet } from 'react-router-dom';

export default function JudgeLayout() {
  return (
    <div className="flex flex-col min-h-screen bg-[#0a0f16]">
      {/* Header focado em Mobile para Juízes (uso em quadra/arena) */}
      <header className="h-16 border-b border-white/10 flex items-center justify-center px-4 bg-uairox-space backdrop-blur-md sticky top-0 z-50">
        <h2 className="text-lg font-bold text-uairox-green">UAIROX JUDGE</h2>
      </header>
      <main className="flex-1 p-4 w-full max-w-md mx-auto">
        <Outlet />
      </main>
    </div>
  );
}

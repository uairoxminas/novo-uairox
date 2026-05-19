import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useRegisterSW } from 'virtual:pwa-register/react';
import './index.css';
import App from './App';

function PWAUpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-[999] max-w-sm mx-auto bg-[#0a0a0a] border border-[#EDAC02]/40 rounded-2xl p-4 flex items-center gap-3 shadow-xl">
      <span className="text-xl shrink-0">🔄</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-bold">Nova versão disponível</p>
        <p className="text-zinc-500 text-xs">Toque para atualizar o app</p>
      </div>
      <button
        onClick={() => updateServiceWorker(true)}
        className="shrink-0 px-3 py-1.5 rounded-lg bg-[#EDAC02] text-black text-xs font-black"
      >
        Atualizar
      </button>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PWAUpdatePrompt />
  </StrictMode>,
);

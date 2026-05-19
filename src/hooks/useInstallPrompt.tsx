import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function useInstallPrompt() {
  const [prompt, setPrompt]       = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setInstalled] = useState(false);

  const isIOS = typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(navigator as any).standalone;

  const isStandalone =
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      !!(window.navigator as any).standalone);

  useEffect(() => {
    if (isStandalone) { setInstalled(true); return; }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setPrompt(null); setInstalled(true); };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [isStandalone]);

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') { setPrompt(null); setInstalled(true); }
  };

  return {
    canInstall: !!prompt,   // Android Chrome: mostra botão nativo
    isInstalled,            // Já está instalado (standalone mode)
    isIOS,                  // iOS Safari: instrução manual
    install,
  };
}

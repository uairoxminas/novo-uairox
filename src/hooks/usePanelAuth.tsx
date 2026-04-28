import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PanelType = 'admin' | 'judge' | 'headjudge' | 'finaljudge';

const SESSION_KEY_PREFIX = 'uairox_panel_';

function getSessionKey(panel: PanelType): string {
  return `${SESSION_KEY_PREFIX}${panel}_auth`;
}

export function isPanelAuthenticated(panel: PanelType): boolean {
  return sessionStorage.getItem(getSessionKey(panel)) === 'true';
}

export function clearPanelAuth(panel: PanelType): void {
  sessionStorage.removeItem(getSessionKey(panel));
}

export function clearAllPanelAuth(): void {
  (['admin', 'judge', 'headjudge', 'finaljudge'] as PanelType[]).forEach(clearPanelAuth);
}

export function usePanelAuth(panel: PanelType) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isPanelAuthenticated(panel));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async (inputPassword: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('panel_passwords' as any)
        .select('password')
        .eq('panel', panel)
        .single();

      if (dbError) {
        setError('Erro ao verificar senha. Tente novamente.');
        setIsLoading(false);
        return false;
      }

      const storedPassword = (data as any)?.password;

      if (inputPassword === storedPassword) {
        sessionStorage.setItem(getSessionKey(panel), 'true');
        setIsAuthenticated(true);
        setIsLoading(false);
        return true;
      } else {
        setError('Senha incorreta.');
        setIsLoading(false);
        return false;
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet.');
      setIsLoading(false);
      return false;
    }
  }, [panel]);

  const logout = useCallback(() => {
    clearPanelAuth(panel);
    setIsAuthenticated(false);
  }, [panel]);

  return { isAuthenticated, isLoading, error, authenticate, logout };
}

// Hook para o admin gerenciar senhas
export function usePanelPasswords() {
  const [isLoading, setIsLoading] = useState(false);

  const fetchPasswords = useCallback(async () => {
    const { data, error } = await supabase
      .from('panel_passwords' as any)
      .select('*')
      .order('panel');
    
    if (error) throw error;
    return data as any[];
  }, []);

  const updatePassword = useCallback(async (panel: PanelType, newPassword: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('panel_passwords' as any)
        .update({ password: newPassword, updated_at: new Date().toISOString() })
        .eq('panel', panel);
      
      if (error) throw error;
      return true;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { fetchPasswords, updatePassword, isLoading };
}

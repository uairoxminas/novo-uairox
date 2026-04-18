import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, AppRole } from '@/hooks/useAuth';

type ProtectedRouteProps = {
  allowedRoles?: AppRole[];
  children?: React.ReactNode;
};

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, loading, isAdmin, isJudge } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-uairox-dark">
        <div className="w-10 h-10 border-4 border-uairox-green border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Se não tem usuário logado, joga pro login salvando a intenção
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se tem regras específicas de papel ativas:
  if (allowedRoles && allowedRoles.length > 0) {
    const isAthlete = !isAdmin && !isJudge; // se está logado e não é admin ou judge, consideramos que é atleta por default

    if (allowedRoles.includes('admin') && isAdmin) return <>{children || <Outlet />}</>;
    if (allowedRoles.includes('judge') && (isJudge || isAdmin)) return <>{children || <Outlet />}</>;
    if (allowedRoles.includes('athlete') && isAthlete) return <>{children || <Outlet />}</>;

    // Usuário sem permissão para a tela atual: redireciona para seu próprio painel adequado
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isJudge) return <Navigate to="/judge" replace />;
    return <Navigate to="/athlete" replace />;
  }

  // Se passou em tudo ou não restringe papéis, mostra a tela
  return <>{children || <Outlet />}</>;
}

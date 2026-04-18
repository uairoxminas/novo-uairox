import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
      <div>
        <h1 className="font-heading text-6xl md:text-8xl text-gradient-gold">404</h1>
        <p className="mt-4 text-lg text-[var(--uairox-zinc-light)]">Página não encontrada</p>
        <Link to="/" className="btn-primary mt-8 inline-flex">
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}

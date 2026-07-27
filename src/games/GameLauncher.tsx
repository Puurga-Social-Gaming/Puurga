import React, { Suspense, Component, type ErrorInfo, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { getGameBySlug, type GameEntry } from './catalog';
import ComingSoon from './_coming-soon/ComingSoon';

interface GameLauncherProps {
  slug: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class GameErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Game error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-950 border border-red-800 flex items-center justify-center">
              <span className="text-2xl text-red-400">!</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">Game Unavailable</p>
              <p className="text-xs text-neutral-400">
                {this.state.error?.message || 'Something went wrong loading this game.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  this.props.onReset();
                }}
                className="px-4 py-2 bg-neutral-800 border border-neutral-700 text-sm font-medium text-white rounded-xl hover:bg-neutral-700 transition-colors"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = '/puurga-games')}
                className="px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
              >
                Back to Arena
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function GameLoader({ game }: { game: GameEntry }) {
  const GameComponent = React.lazy(game.loader);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-neutral-950">
          <div className={`flex flex-col items-center gap-3 ${game.accentColor || 'text-orange-400'}`}>
            <Loader2 className="h-10 w-10 animate-spin" />
            <p className="text-sm font-mono tracking-widest">
              {game.loadingLabel || 'LOADING...'}
            </p>
          </div>
        </div>
      }
    >
      <GameComponent />
    </Suspense>
  );
}

const GameLauncher: React.FC<GameLauncherProps> = ({ slug }) => {
  const game = getGameBySlug(slug);

  if (!game) {
    return <ComingSoon gameName={slug} onExit={() => (window.location.href = '/puurga-games')} />;
  }

  if (game.status === 'coming-soon' || game.status === 'disabled') {
    return <ComingSoon gameName={game.name} onExit={() => (window.location.href = '/puurga-games')} />;
  }

  return (
    <GameErrorBoundary onReset={() => window.location.reload()}>
      <GameLoader game={game} />
    </GameErrorBoundary>
  );
};

export default GameLauncher;

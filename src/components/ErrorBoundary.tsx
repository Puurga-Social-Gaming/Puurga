import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    const isChunkError = error.message?.includes('dynamically imported module') || error.message?.includes('Loading chunk');
    return {
      hasError: true,
      errorMessage: isChunkError
        ? 'Failed to load page. This can happen after an update.'
        : error.message || 'An unexpected error occurred'
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4 z-[9999]">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 mx-auto rounded-full bg-card border border-border flex items-center justify-center shadow-theme-sm">
              <span className="text-2xl text-foreground">!</span>
            </div>
            <p className="text-muted text-sm">
              {this.state.errorMessage}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="px-5 py-2 bg-foreground text-background text-sm font-semibold rounded-xl hover:opacity-90 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2 bg-card text-foreground border border-border text-sm font-medium rounded-xl hover:bg-card-hover transition-colors"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 
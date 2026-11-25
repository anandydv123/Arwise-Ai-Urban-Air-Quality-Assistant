import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

/**
 * Top-level React error boundary providing graceful recovery if a view fails to render.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught UI error:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto my-12 max-w-lg rounded-xl border border-red-200 bg-white p-6 text-slate-900 shadow-sm dark:border-red-900/60 dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
            <div className="space-y-2">
              <h1 className="font-display text-lg font-bold">
                Something went wrong rendering this view
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {this.state.errorMessage}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Try Again</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

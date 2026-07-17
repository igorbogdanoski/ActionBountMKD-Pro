import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { captureError } from '../utils/errorReporting';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
    captureError(error, { componentStack: info.componentStack });
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 p-6">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-xl">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Настана грешка</h2>
          <p className="text-gray-400 text-sm mb-6 font-mono break-all">
            {error.message}
          </p>
          <Button
            type="button"
            variant="app-primary"
            onClick={this.reset}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            className="!px-5 !rounded-lg !font-medium !shadow-none"
          >
            Обиди се повторно
          </Button>
        </div>
      </div>
    );
  }
}

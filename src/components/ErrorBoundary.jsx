import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && (prevProps.resetKey !== this.props.resetKey || prevProps.children !== this.props.children)) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-4 font-sans">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Wystąpił problem z wyświetleniem tej sekcji</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 text-left overflow-auto max-h-32">
            {this.state.error?.message || 'Błąd renderowania komponentu.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>Spróbuj ponownego renderowania</span>
            </button>
            {this.props.onNavigateFallback && (
              <button
                onClick={() => {
                  this.handleReset();
                  this.props.onNavigateFallback();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                <Home size={14} />
                <span>Wróć do listy członków</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

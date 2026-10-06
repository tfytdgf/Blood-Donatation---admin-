import { Component } from 'react';

// Catches a crash in one page so the sidebar and the rest of the console keep working.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Send this to your error tracker (Sentry, LogRocket...) in production.
    console.error('UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto mt-10 max-w-md rounded-lg border border-slate-200 p-6 text-center">
        <h2 className="font-semibold text-slate-900">Something went wrong on this page</h2>
        <p className="mt-1 text-sm text-slate-500">The rest of the console still works. Try again, and tell your tech team if it keeps happening.</p>
        <button className="btn btn-primary mt-4" onClick={() => this.setState({ error: null })}>Try again</button>
      </div>
    );
  }
}
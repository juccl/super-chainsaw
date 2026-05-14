import { Component, ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('App crashed:', error);
  }

  private handleReset = () => {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith('business-dashboard:'));
      keys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f9fc', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 520, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24 }}>
          <h1 style={{ margin: 0, fontSize: 20, color: '#172033' }}>页面发生异常</h1>
          <p style={{ marginTop: 10, marginBottom: 16, color: '#64748b', fontSize: 14 }}>
            可能是历史缓存与新版本配置冲突。点击下面按钮清理看板缓存并重新加载页面。
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{ border: '1px solid #cbd5e1', background: '#0ea5e9', color: '#fff', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}
          >
            清理缓存并重载
          </button>
        </div>
      </div>
    );
  }
}

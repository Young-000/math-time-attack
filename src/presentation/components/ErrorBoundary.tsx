import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#F9FAFB',
          }}
        >
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#191F28',
              marginBottom: '8px',
            }}
          >
            문제가 발생했습니다
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#6B7684',
              marginBottom: '24px',
            }}
          >
            예상치 못한 오류가 발생했습니다. 새로고침해 주세요.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#FFFFFF',
              backgroundColor: '#3182F6',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            새로고침
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundary };

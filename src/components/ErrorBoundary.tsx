import { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorHandler, ErrorType, BIMError } from '../utils/errorHandler';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHandler: ErrorHandler;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.errorHandler = ErrorHandler.getInstance();
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to our error handling system
    const bimError = new BIMError(
      ErrorType.COMPONENT_ERROR,
      `React Error Boundary caught an error: ${error.message}`,
      { originalError: error, errorInfo },
      'ErrorBoundary'
    );

    this.errorHandler.handleError(bimError);

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary__content">
            <h2 className="error-boundary__heading">Something went wrong</h2>
            <p className="error-boundary__description">
              We&apos;re sorry, but something unexpected happened. The application has
              encountered an error.
            </p>

            <details className="error-boundary__details">
              <summary className="error-boundary__summary">Error Details</summary>
              <div className="error-boundary__error-info">
                <p><strong>Error:</strong> {this.state.error?.message}</p>
                {this.state.error?.stack && (
                  <pre className="error-boundary__stack">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            </details>

            <div className="error-boundary__actions">
              <button
                onClick={this.handleRetry}
                className="error-boundary__button error-boundary__button--retry"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="error-boundary__button error-boundary__button--refresh"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

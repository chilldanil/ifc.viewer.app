import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorHandler, ErrorType, BIMError } from '../utils/errorHandler';

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

const errorBoundaryStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    margin: '20px',
  } as React.CSSProperties,
  content: {
    textAlign: 'center' as const,
    maxWidth: '600px',
  } as React.CSSProperties,
  heading: {
    color: '#dc3545',
    marginBottom: '16px',
    fontSize: '24px',
  } as React.CSSProperties,
  description: {
    color: '#6c757d',
    marginBottom: '20px',
    lineHeight: '1.5',
  } as React.CSSProperties,
  details: {
    textAlign: 'left' as const,
    margin: '20px 0',
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
  } as React.CSSProperties,
  summary: {
    cursor: 'pointer',
    fontWeight: 'bold',
    marginBottom: '10px',
  } as React.CSSProperties,
  errorInfo: {
    marginTop: '10px',
  } as React.CSSProperties,
  stack: {
    backgroundColor: '#f8f9fa',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '12px',
    overflowX: 'auto' as const,
    maxHeight: '200px',
    overflowY: 'auto' as const,
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginTop: '20px',
  } as React.CSSProperties,
  button: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  retryButton: {
    backgroundColor: '#007bff',
    color: 'white',
  } as React.CSSProperties,
  refreshButton: {
    backgroundColor: '#6c757d',
    color: 'white',
  } as React.CSSProperties,
};

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
        <div style={errorBoundaryStyles.container}>
          <div style={errorBoundaryStyles.content}>
            <h2 style={errorBoundaryStyles.heading}>Something went wrong</h2>
            <p style={errorBoundaryStyles.description}>
              We&apos;re sorry, but something unexpected happened. The application has
              encountered an error.
            </p>
            
            <details style={errorBoundaryStyles.details}>
              <summary style={errorBoundaryStyles.summary}>Error Details</summary>
              <div style={errorBoundaryStyles.errorInfo}>
                <p><strong>Error:</strong> {this.state.error?.message}</p>
                {this.state.error?.stack && (
                  <pre style={errorBoundaryStyles.stack}>
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            </details>

            <div style={errorBoundaryStyles.actions}>
              <button 
                onClick={this.handleRetry}
                style={{...errorBoundaryStyles.button, ...errorBoundaryStyles.retryButton}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
              >
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                style={{...errorBoundaryStyles.button, ...errorBoundaryStyles.refreshButton}}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
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
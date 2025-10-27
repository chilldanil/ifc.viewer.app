// Error types for better error categorization
export enum ErrorType {
  BIM_INITIALIZATION = 'BIM_INITIALIZATION',
  MODEL_LOADING = 'MODEL_LOADING',
  RENDER_ERROR = 'RENDER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  USER_INTERACTION = 'USER_INTERACTION',
  COMPONENT_ERROR = 'COMPONENT_ERROR'
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  details?: any;
  stack?: string;
  timestamp: Date;
  component?: string;
}

export class BIMError extends Error {
  public readonly type: ErrorType;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly component?: string;

  constructor(type: ErrorType, message: string, details?: any, component?: string) {
    super(message);
    this.name = 'BIMError';
    this.type = type;
    this.details = details;
    this.timestamp = new Date();
    this.component = component;
  }
}

// Error handler utility
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: ((error: ErrorInfo) => void)[] = [];

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(error: Error | BIMError, component?: string): void {
    const errorInfo: ErrorInfo = {
      type: error instanceof BIMError ? error.type : ErrorType.COMPONENT_ERROR,
      message: error.message,
      details: error instanceof BIMError ? error.details : undefined,
      stack: error.stack,
      timestamp: new Date(),
      component: error instanceof BIMError ? error.component : component
    };

    // Log to console with appropriate level
    if (this.isProductionCritical(errorInfo.type)) {
      console.error(`[${errorInfo.type}] ${errorInfo.message}`, errorInfo);
    } else {
      console.warn(`[${errorInfo.type}] ${errorInfo.message}`, errorInfo);
    }

    // Notify listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  public addErrorListener(listener: (error: ErrorInfo) => void): void {
    this.errorListeners.push(listener);
  }

  public removeErrorListener(listener: (error: ErrorInfo) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  private isProductionCritical(type: ErrorType): boolean {
    return [
      ErrorType.BIM_INITIALIZATION,
      ErrorType.MODEL_LOADING,
      ErrorType.RENDER_ERROR
    ].includes(type);
  }
}

// Convenience functions
export const handleBIMError = (
  type: ErrorType,
  message: string,
  details?: any,
  component?: string
): void => {
  const error = new BIMError(type, message, details, component);
  ErrorHandler.getInstance().handleError(error, component);
};

export const handleGenericError = (error: Error, component?: string): void => {
  ErrorHandler.getInstance().handleError(error, component);
};

// Async error wrapper
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  errorType: ErrorType,
  component?: string
): Promise<T | null> => {
  try {
    return await operation();
  } catch (error) {
    const bimError = new BIMError(
      errorType,
      `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error,
      component
    );
    ErrorHandler.getInstance().handleError(bimError, component);
    return null;
  }
}; 
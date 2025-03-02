import React from 'react';
import { Button } from './button';
import { Card } from './card';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="p-6 m-4 max-w-lg mx-auto">
          <div className="flex flex-col items-center space-y-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-gray-600">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="space-x-4">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
              <Button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
} 
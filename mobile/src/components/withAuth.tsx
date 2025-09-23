import React from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthScreen } from '../screens/AuthScreen';

export interface WithAuthOptions {
  requireAuth?: boolean;
  fallbackComponent?: React.ComponentType<any>;
  redirectTo?: string;
}

export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthOptions = {}
): React.ComponentType<P> {
  const {
    requireAuth = true,
    fallbackComponent: FallbackComponent,
  } = options;

  const WrappedComponent: React.FC<P> = (props) => {
    const fallback = FallbackComponent ? <FallbackComponent /> : <AuthScreen />;

    return (
      <ProtectedRoute requireAuth={requireAuth} fallback={fallback}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };

  WrappedComponent.displayName = `withAuth(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Convenience HOCs for common patterns
export const withRequiredAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, { requireAuth: true });

export const withNoAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, { requireAuth: false });

export const withOptionalAuth = <P extends object>(Component: React.ComponentType<P>) =>
  withAuth(Component, { requireAuth: false });
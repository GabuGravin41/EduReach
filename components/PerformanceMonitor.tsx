import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  apiResponseTime: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showMetrics?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  enabled = process.env.NODE_ENV === 'development',
  showMetrics = false 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    apiResponseTime: 0,
  });

  useEffect(() => {
    if (!enabled) return;

    // Measure initial page load performance
    const measurePageLoad = () => {
      if (performance.getEntriesByType) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.navigationStart;
          setMetrics(prev => ({ ...prev, loadTime }));
        }
      }
    };

    // Measure memory usage (if available)
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
    };

    // Monitor Core Web Vitals
    const observeWebVitals = () => {
      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('LCP:', lastEntry.startTime);
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

          // First Input Delay (FID)
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
              console.log('FID:', entry.processingStart - entry.startTime);
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });

          // Cumulative Layout Shift (CLS)
          const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            console.log('CLS:', clsValue);
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (error) {
          console.warn('Performance Observer not supported:', error);
        }
      }
    };

    // Monitor API performance
    const monitorAPIPerformance = () => {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const startTime = performance.now();
        try {
          const response = await originalFetch(...args);
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          setMetrics(prev => ({ 
            ...prev, 
            apiResponseTime: (prev.apiResponseTime + responseTime) / 2 // Moving average
          }));
          
          return response;
        } catch (error) {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          console.error('API Error:', error, 'Response time:', responseTime);
          throw error;
        }
      };

      return () => {
        window.fetch = originalFetch;
      };
    };

    // Initialize monitoring
    measurePageLoad();
    measureMemory();
    observeWebVitals();
    const cleanupAPI = monitorAPIPerformance();

    // Set up periodic monitoring
    const interval = setInterval(() => {
      measureMemory();
    }, 5000); // Every 5 seconds

    return () => {
      clearInterval(interval);
      cleanupAPI();
    };
  }, [enabled]);

  // Component render time measurement
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      setMetrics(prev => ({ ...prev, renderTime }));
    };
  });

  if (!enabled || !showMetrics) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white p-4 rounded-lg text-xs font-mono z-50">
      <div className="mb-2 font-bold">Performance Metrics</div>
      <div>Load Time: {metrics.loadTime.toFixed(2)}ms</div>
      <div>Render Time: {metrics.renderTime.toFixed(2)}ms</div>
      <div>Memory: {metrics.memoryUsage.toFixed(2)}MB</div>
      <div>Avg API: {metrics.apiResponseTime.toFixed(2)}ms</div>
    </div>
  );
};

// Hook for component-level performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    console.log(`${componentName} mounted`);

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      console.log(`${componentName} unmounted after ${renderTime.toFixed(2)}ms`);
    };
  }, [componentName]);
};

// Hook for measuring expensive operations
export const useMeasureOperation = () => {
  const measureOperation = (operationName: string, operation: () => any) => {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    
    console.log(`${operationName} took ${(endTime - startTime).toFixed(2)}ms`);
    
    return result;
  };

  const measureAsyncOperation = async (operationName: string, operation: () => Promise<any>) => {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    
    console.log(`${operationName} took ${(endTime - startTime).toFixed(2)}ms`);
    
    return result;
  };

  return { measureOperation, measureAsyncOperation };
};

// Error boundary for performance monitoring
export class PerformanceErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<any> },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Performance Error Boundary caught an error:', error, errorInfo);
    
    // Log performance impact of errors
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('Memory usage at error:', memory.usedJSHeapSize / 1024 / 1024, 'MB');
    }
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
    <h3 className="text-red-800 font-semibold">Something went wrong</h3>
    <p className="text-red-600 text-sm mt-1">
      {error?.message || 'An unexpected error occurred'}
    </p>
  </div>
);

// Usage in App.tsx:
/*
import { PerformanceMonitor, PerformanceErrorBoundary } from './components/PerformanceMonitor';

function App() {
  return (
    <PerformanceErrorBoundary>
      <div className="App">
        {/* Your app content */}
        <PerformanceMonitor enabled={true} showMetrics={process.env.NODE_ENV === 'development'} />
      </div>
    </PerformanceErrorBoundary>
  );
}
*/

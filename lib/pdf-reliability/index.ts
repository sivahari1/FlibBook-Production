/**
 * PDF Rendering Reliability - Main Export
 * 
 * Exports all public interfaces and classes for the reliable PDF rendering system
 * 
 * Requirements: 1.1, 1.2, 8.1
 */

// Main renderer class
export { ReliablePDFRenderer } from './reliable-pdf-renderer';

// Rendering method chain
export { RenderingMethodChain } from './rendering-method-chain';

// Configuration
export { createReliabilityConfig, DEFAULT_RELIABILITY_CONFIG } from './config';

// Types and interfaces
export type {
  RenderOptions,
  RenderResult,
  RenderContext,
  ProgressState,
  RenderedPage,
  RenderError,
  DiagnosticsData,
  ReliabilityConfig,
  WatermarkConfig,
} from './types';

export {
  RenderingMethod,
  RenderingStage,
  ErrorType,
} from './types';

// Error classes
export {
  ReliablePDFRendererError,
  NetworkError,
  ParsingError,
  CanvasError,
  MemoryError,
  TimeoutError,
  AuthenticationError,
  CorruptionError,
  ErrorFactory,
} from './errors';

// Diagnostics
export { DiagnosticsCollector } from './diagnostics';

// Monitoring and Alerting
export { MonitoringSystem } from './monitoring-system';
export { UserFeedbackCollector, FeedbackCategory } from './user-feedback-collector';
export { 
  IntegratedMonitoringSystem, 
  MonitoringEvent, 
  DEFAULT_MONITORING_CONFIG 
} from './monitoring-integration';

export type {
  PerformanceMetrics,
  Alert,
  UserFeedback,
  MonitoringConfig,
} from './monitoring-system';

export type {
  FeedbackConfig,
  IntegratedMonitoringConfig,
  MonitoringEventData,
  MonitoringEventListener,
} from './monitoring-integration';

export { AlertSeverity } from './monitoring-system';

export type {
  FeedbackPromptOptions,
} from './user-feedback-collector';
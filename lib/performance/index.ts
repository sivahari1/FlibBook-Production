/**
 * Performance Optimization Module
 * 
 * Central export for all performance optimization utilities
 * for the Flipbook Media Annotations feature.
 * 
 * Requirements: 17.1-17.5, 20.1-20.5
 */

export * from './page-loader';
export * from './cache-manager';
export * from './media-optimizer';
export * from './memory-manager';
export * from './mobile-optimizer';

// Re-export commonly used types
export type {
  PageLoadOptions,
  PageImage,
} from './page-loader';

export type {
  CacheOptions,
} from './cache-manager';

export type {
  MediaOptimizationOptions,
  QualityLevel,
  NetworkType,
  ConnectionQuality,
} from './media-optimizer';

export type {
  MemoryManagerOptions,
  PageMemoryInfo,
  MemoryStats,
} from './memory-manager';

export type {
  MobileOptimizationOptions,
  DevicePerformance,
  DeviceInfo,
} from './mobile-optimizer';

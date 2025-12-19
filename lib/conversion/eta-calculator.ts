/**
 * ETA (Estimated Time of Arrival) Calculator for Document Conversion
 * 
 * Provides intelligent time estimation based on conversion progress,
 * historical data, and document characteristics.
 * 
 * Requirements: 1.2, 3.1 - Real-time progress tracking with ETA display
 */

import { ConversionProgress, ConversionStage } from '@/lib/types/conversion';

interface ConversionMetrics {
  documentId: string;
  startTime: number;
  currentTime: number;
  progress: number;
  stage: ConversionStage;
  documentSize?: number;
  totalPages?: number;
  processedPages: number;
}

interface HistoricalData {
  averageTimePerPage: number;
  averageTimePerMB: number;
  stageCompletionTimes: Record<ConversionStage, number>;
  recentConversions: ConversionRecord[];
}

interface ConversionRecord {
  documentSize: number;
  totalPages: number;
  totalTime: number;
  completedAt: number;
}

/**
 * ETA Calculator Class
 */
export class ETACalculator {
  private historicalData: HistoricalData;
  private readonly SMOOTHING_FACTOR = 0.3;
  private readonly MIN_ETA_SECONDS = 5;
  private readonly MAX_ETA_SECONDS = 300; // 5 minutes max

  constructor(historicalData?: Partial<HistoricalData>) {
    this.historicalData = {
      averageTimePerPage: 2000, // 2 seconds per page default
      averageTimePerMB: 5000, // 5 seconds per MB default
      stageCompletionTimes: {
        queued: 0,
        initializing: 3000,
        extracting_pages: 8000,
        processing_pages: 20000,
        uploading_pages: 5000,
        finalizing: 2000,
        completed: 0,
        failed: 0,
      },
      recentConversions: [],
      ...historicalData,
    };
  }

  /**
   * Calculate ETA based on current progress and historical data
   */
  calculateETA(metrics: ConversionMetrics): number {
    const {
      startTime,
      currentTime,
      progress,
      stage,
      documentSize,
      totalPages,
      processedPages,
    } = metrics;

    const elapsedTime = currentTime - startTime;
    
    // If progress is 0 or very low, use stage-based estimation
    if (progress < 5) {
      return this.calculateStageBasedETA(stage, documentSize, totalPages);
    }

    // Calculate multiple ETA estimates and combine them
    const progressBasedETA = this.calculateProgressBasedETA(elapsedTime, progress);
    const pageBasedETA = this.calculatePageBasedETA(processedPages, totalPages);
    const sizeBasedETA = this.calculateSizeBasedETA(documentSize, elapsedTime, progress);
    const historicalETA = this.calculateHistoricalETA(documentSize, totalPages);

    // Weighted average of different estimation methods
    const estimates = [
      { value: progressBasedETA, weight: 0.4 },
      { value: pageBasedETA, weight: 0.3 },
      { value: sizeBasedETA, weight: 0.2 },
      { value: historicalETA, weight: 0.1 },
    ].filter(estimate => estimate.value > 0);

    if (estimates.length === 0) {
      return this.calculateStageBasedETA(stage, documentSize, totalPages);
    }

    const weightedSum = estimates.reduce((sum, est) => sum + est.value * est.weight, 0);
    const totalWeight = estimates.reduce((sum, est) => sum + est.weight, 0);
    const estimatedETA = weightedSum / totalWeight;

    // Apply smoothing and bounds
    return this.applySmoothingAndBounds(estimatedETA, elapsedTime);
  }

  /**
   * Calculate ETA based on current progress rate
   */
  private calculateProgressBasedETA(elapsedTime: number, progress: number): number {
    if (progress <= 0) return 0;
    
    const progressRate = progress / elapsedTime; // progress per millisecond
    const remainingProgress = 100 - progress;
    
    return remainingProgress / progressRate;
  }

  /**
   * Calculate ETA based on page processing rate
   */
  private calculatePageBasedETA(processedPages: number, totalPages?: number): number {
    if (!totalPages || totalPages <= 0 || processedPages <= 0) return 0;
    
    const remainingPages = totalPages - processedPages;
    return remainingPages * this.historicalData.averageTimePerPage;
  }

  /**
   * Calculate ETA based on document size and processing rate
   */
  private calculateSizeBasedETA(documentSize?: number, elapsedTime?: number, progress?: number): number {
    if (!documentSize || !elapsedTime || !progress || progress <= 0) return 0;
    
    const processedSize = (documentSize * progress) / 100;
    const processingRate = processedSize / elapsedTime; // bytes per millisecond
    const remainingSize = documentSize - processedSize;
    
    return remainingSize / processingRate;
  }

  /**
   * Calculate ETA based on historical conversion data
   */
  private calculateHistoricalETA(documentSize?: number, totalPages?: number): number {
    if (this.historicalData.recentConversions.length === 0) return 0;
    
    // Find similar documents in historical data
    const similarConversions = this.historicalData.recentConversions.filter(record => {
      const sizeSimilar = !documentSize || Math.abs(record.documentSize - documentSize) < documentSize * 0.5;
      const pagesSimilar = !totalPages || Math.abs(record.totalPages - totalPages) < totalPages * 0.5;
      return sizeSimilar && pagesSimilar;
    });

    if (similarConversions.length === 0) {
      // Use average from all conversions
      const avgTime = this.historicalData.recentConversions.reduce((sum, record) => sum + record.totalTime, 0) / this.historicalData.recentConversions.length;
      return avgTime;
    }

    // Use average from similar conversions
    const avgTime = similarConversions.reduce((sum, record) => sum + record.totalTime, 0) / similarConversions.length;
    return avgTime;
  }

  /**
   * Calculate ETA based on current stage and typical stage completion times
   */
  private calculateStageBasedETA(stage: ConversionStage, documentSize?: number, totalPages?: number): number {
    const baseTime = this.historicalData.stageCompletionTimes[stage] || 10000;
    
    // Adjust based on document characteristics
    let multiplier = 1;
    
    if (documentSize) {
      // Larger documents take longer
      const sizeMB = documentSize / (1024 * 1024);
      multiplier *= Math.max(0.5, Math.min(3, sizeMB / 10)); // Scale based on size
    }
    
    if (totalPages) {
      // More pages take longer
      multiplier *= Math.max(0.5, Math.min(2, totalPages / 50)); // Scale based on page count
    }
    
    return baseTime * multiplier;
  }

  /**
   * Apply smoothing and bounds to the estimated ETA
   */
  private applySmoothingAndBounds(estimatedETA: number, elapsedTime: number): number {
    // Apply minimum and maximum bounds
    let boundedETA = Math.max(this.MIN_ETA_SECONDS * 1000, estimatedETA);
    boundedETA = Math.min(this.MAX_ETA_SECONDS * 1000, boundedETA);
    
    // Apply exponential smoothing to reduce jitter
    // This would typically use a previous ETA value, but for simplicity we'll use elapsed time as a reference
    const smoothedETA = boundedETA * this.SMOOTHING_FACTOR + (elapsedTime * 0.5) * (1 - this.SMOOTHING_FACTOR);
    
    return Math.round(smoothedETA);
  }

  /**
   * Update historical data with completed conversion
   */
  updateHistoricalData(record: ConversionRecord): void {
    this.historicalData.recentConversions.push(record);
    
    // Keep only recent conversions (last 100)
    if (this.historicalData.recentConversions.length > 100) {
      this.historicalData.recentConversions = this.historicalData.recentConversions.slice(-100);
    }
    
    // Update averages
    this.updateAverages();
  }

  /**
   * Update average processing times based on recent conversions
   */
  private updateAverages(): void {
    const conversions = this.historicalData.recentConversions;
    if (conversions.length === 0) return;
    
    // Update average time per page
    const totalPages = conversions.reduce((sum, record) => sum + record.totalPages, 0);
    const totalTime = conversions.reduce((sum, record) => sum + record.totalTime, 0);
    
    if (totalPages > 0) {
      this.historicalData.averageTimePerPage = totalTime / totalPages;
    }
    
    // Update average time per MB
    const totalSize = conversions.reduce((sum, record) => sum + record.documentSize, 0);
    const totalSizeMB = totalSize / (1024 * 1024);
    
    if (totalSizeMB > 0) {
      this.historicalData.averageTimePerMB = totalTime / totalSizeMB;
    }
  }

  /**
   * Get human-readable ETA string
   */
  formatETA(etaMilliseconds: number): string {
    const seconds = Math.ceil(etaMilliseconds / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.ceil(minutes / 60);
    return `${hours}h`;
  }

  /**
   * Get confidence level for the ETA estimate (0-1)
   */
  getConfidenceLevel(metrics: ConversionMetrics): number {
    const { progress, processedPages, totalPages } = metrics;
    
    let confidence = 0.3; // Base confidence
    
    // Higher confidence with more progress
    if (progress > 10) confidence += 0.2;
    if (progress > 30) confidence += 0.2;
    if (progress > 50) confidence += 0.2;
    
    // Higher confidence with page information
    if (totalPages && processedPages > 0) {
      confidence += 0.1;
    }
    
    // Higher confidence with historical data
    if (this.historicalData.recentConversions.length > 10) {
      confidence += 0.1;
    }
    
    return Math.min(1, confidence);
  }
}

/**
 * Default ETA calculator instance
 */
export const defaultETACalculator = new ETACalculator();

/**
 * Utility function to calculate ETA for conversion progress
 */
export function calculateConversionETA(
  progress: ConversionProgress,
  startTime: number,
  documentSize?: number
): { eta: number; confidence: number; formatted: string } {
  const metrics: ConversionMetrics = {
    documentId: progress.documentId,
    startTime,
    currentTime: Date.now(),
    progress: progress.progress,
    stage: progress.stage,
    documentSize,
    totalPages: progress.totalPages,
    processedPages: progress.processedPages,
  };

  const eta = defaultETACalculator.calculateETA(metrics);
  const confidence = defaultETACalculator.getConfidenceLevel(metrics);
  const formatted = defaultETACalculator.formatETA(eta);

  return { eta, confidence, formatted };
}
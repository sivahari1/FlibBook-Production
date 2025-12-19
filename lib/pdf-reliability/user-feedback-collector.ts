/**
 * User Feedback Collection System
 * 
 * Collects and manages user feedback for PDF rendering operations
 * 
 * Requirements: 8.4
 */

import type { UserFeedback, RenderingMethod } from './types';

/**
 * Feedback Category Enumeration
 */
export enum FeedbackCategory {
  PERFORMANCE = 'performance',
  RELIABILITY = 'reliability',
  USABILITY = 'usability',
  OTHER = 'other'
}

/**
 * Feedback Collection Configuration
 */
export interface FeedbackConfig {
  /** Enable feedback collection */
  enabled: boolean;
  
  /** Show feedback prompt after operations */
  showPrompt: boolean;
  
  /** Prompt delay after operation completion (ms) */
  promptDelay: number;
  
  /** Minimum rating to trigger detailed feedback */
  detailedFeedbackThreshold: number;
  
  /** Maximum feedback entries to store locally */
  maxLocalEntries: number;
  
  /** Auto-submit feedback to server */
  autoSubmit: boolean;
  
  /** Server endpoint for feedback submission */
  submitEndpoint?: string;
  
  /** API key for feedback submission */
  apiKey?: string;
}

/**
 * Feedback Prompt Options
 */
export interface FeedbackPromptOptions {
  /** Show rating scale */
  showRating: boolean;
  
  /** Show category selection */
  showCategory: boolean;
  
  /** Show description field */
  showDescription: boolean;
  
  /** Custom prompt message */
  customMessage?: string;
  
  /** Prompt position */
  position: 'top' | 'bottom' | 'center' | 'corner';
  
  /** Auto-hide after timeout (ms) */
  autoHideTimeout?: number;
}

/**
 * User Feedback Collector Class
 */
export class UserFeedbackCollector {
  private config: FeedbackConfig;
  private feedbackEntries: UserFeedback[] = [];
  private promptElement?: HTMLElement;

  constructor(config: FeedbackConfig) {
    this.config = config;
    this.loadStoredFeedback();
  }

  /**
   * Collect feedback for a rendering operation
   */
  public async collectFeedback(
    renderingId: string,
    renderingMethod: RenderingMethod,
    renderingTime: number,
    errorOccurred: boolean,
    documentSize?: number,
    promptOptions?: Partial<FeedbackPromptOptions>
  ): Promise<string | null> {
    if (!this.config.enabled) {
      return null;
    }

    const context = {
      documentSize,
      renderingMethod,
      renderingTime,
      errorOccurred,
    };

    if (this.config.showPrompt) {
      return this.showFeedbackPrompt(renderingId, context, promptOptions);
    }

    return null;
  }

  /**
   * Show feedback prompt to user
   */
  private async showFeedbackPrompt(
    renderingId: string,
    context: UserFeedback['context'],
    promptOptions?: Partial<FeedbackPromptOptions>
  ): Promise<string | null> {
    return new Promise((resolve) => {
      // Wait for prompt delay
      setTimeout(() => {
        const options: FeedbackPromptOptions = {
          showRating: true,
          showCategory: true,
          showDescription: false,
          position: 'corner',
          autoHideTimeout: 30000, // 30 seconds
          ...promptOptions,
        };

        this.createFeedbackPrompt(renderingId, context, options, resolve);
      }, this.config.promptDelay);
    });
  }

  /**
   * Create feedback prompt UI
   */
  private createFeedbackPrompt(
    renderingId: string,
    context: UserFeedback['context'],
    options: FeedbackPromptOptions,
    callback: (feedbackId: string | null) => void
  ): void {
    // Remove existing prompt
    this.removeFeedbackPrompt();

    // Create prompt container
    const promptContainer = document.createElement('div');
    promptContainer.className = 'pdf-feedback-prompt';
    promptContainer.style.cssText = this.getPromptStyles(options.position);

    // Create prompt content
    const content = document.createElement('div');
    content.className = 'pdf-feedback-content';
    content.style.cssText = `
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;

    // Add title
    const title = document.createElement('h4');
    title.textContent = options.customMessage || 'How was your PDF viewing experience?';
    title.style.cssText = 'margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #333;';
    content.appendChild(title);

    // Create form
    const form = document.createElement('form');
    form.style.cssText = 'margin: 0;';

    let rating = 0;
    let category: FeedbackCategory = FeedbackCategory.OTHER;
    let description = '';

    // Add rating scale
    if (options.showRating) {
      const ratingLabel = document.createElement('label');
      ratingLabel.textContent = 'Rating:';
      ratingLabel.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 500; color: #555;';
      form.appendChild(ratingLabel);

      const ratingContainer = document.createElement('div');
      ratingContainer.style.cssText = 'display: flex; gap: 4px; margin-bottom: 12px;';

      for (let i = 1; i <= 5; i++) {
        const star = document.createElement('button');
        star.type = 'button';
        star.textContent = '★';
        star.style.cssText = `
          background: none;
          border: none;
          font-size: 20px;
          color: #ddd;
          cursor: pointer;
          padding: 2px;
          transition: color 0.2s;
        `;

        star.addEventListener('click', () => {
          rating = i;
          // Update star colors
          ratingContainer.querySelectorAll('button').forEach((btn, index) => {
            (btn as HTMLElement).style.color = index < i ? '#ffc107' : '#ddd';
          });

          // Show description field for low ratings
          if (rating <= this.config.detailedFeedbackThreshold && !options.showDescription) {
            options.showDescription = true;
            this.addDescriptionField(form);
          }
        });

        star.addEventListener('mouseenter', () => {
          ratingContainer.querySelectorAll('button').forEach((btn, index) => {
            (btn as HTMLElement).style.color = index < i ? '#ffc107' : '#ddd';
          });
        });

        ratingContainer.appendChild(star);
      }

      ratingContainer.addEventListener('mouseleave', () => {
        ratingContainer.querySelectorAll('button').forEach((btn, index) => {
          (btn as HTMLElement).style.color = index < rating ? '#ffc107' : '#ddd';
        });
      });

      form.appendChild(ratingContainer);
    }

    // Add category selection
    if (options.showCategory) {
      const categoryLabel = document.createElement('label');
      categoryLabel.textContent = 'Category:';
      categoryLabel.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 500; color: #555;';
      form.appendChild(categoryLabel);

      const categorySelect = document.createElement('select');
      categorySelect.style.cssText = `
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin-bottom: 12px;
        font-size: 14px;
      `;

      Object.values(FeedbackCategory).forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        categorySelect.appendChild(option);
      });

      categorySelect.addEventListener('change', () => {
        category = categorySelect.value as FeedbackCategory;
      });

      form.appendChild(categorySelect);
    }

    // Add description field (initially hidden)
    if (options.showDescription) {
      this.addDescriptionField(form);
    }

    // Add buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;';

    const skipButton = document.createElement('button');
    skipButton.type = 'button';
    skipButton.textContent = 'Skip';
    skipButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      color: #666;
    `;

    skipButton.addEventListener('click', () => {
      this.removeFeedbackPrompt();
      callback(null);
    });

    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = 'Submit';
    submitButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      background: #007bff;
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;

    buttonContainer.appendChild(skipButton);
    buttonContainer.appendChild(submitButton);
    form.appendChild(buttonContainer);

    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const descriptionField = form.querySelector('textarea') as HTMLTextAreaElement;
      if (descriptionField) {
        description = descriptionField.value;
      }

      const feedbackId = await this.submitFeedback({
        renderingId,
        rating: rating || 3, // Default to neutral if not rated
        category,
        description: description || undefined,
        browserInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
        context,
      });

      this.removeFeedbackPrompt();
      callback(feedbackId);
    });

    content.appendChild(form);
    promptContainer.appendChild(content);

    // Add to page
    document.body.appendChild(promptContainer);
    this.promptElement = promptContainer;

    // Auto-hide timeout
    if (options.autoHideTimeout) {
      setTimeout(() => {
        if (this.promptElement === promptContainer) {
          this.removeFeedbackPrompt();
          callback(null);
        }
      }, options.autoHideTimeout);
    }
  }

  /**
   * Add description field to form
   */
  private addDescriptionField(form: HTMLFormElement): void {
    const existingTextarea = form.querySelector('textarea');
    if (existingTextarea) {
      return; // Already added
    }

    const descriptionLabel = document.createElement('label');
    descriptionLabel.textContent = 'Tell us more (optional):';
    descriptionLabel.style.cssText = 'display: block; margin-bottom: 8px; font-weight: 500; color: #555;';

    const descriptionField = document.createElement('textarea');
    descriptionField.placeholder = 'What could be improved?';
    descriptionField.rows = 3;
    descriptionField.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 12px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
    `;

    // Insert before buttons
    const buttonContainer = form.querySelector('div:last-child');
    if (buttonContainer) {
      form.insertBefore(descriptionLabel, buttonContainer);
      form.insertBefore(descriptionField, buttonContainer);
    }
  }

  /**
   * Get prompt styles based on position
   */
  private getPromptStyles(position: string): string {
    const baseStyles = `
      position: fixed;
      z-index: 10000;
      pointer-events: auto;
    `;

    switch (position) {
      case 'top':
        return baseStyles + 'top: 20px; left: 50%; transform: translateX(-50%);';
      case 'bottom':
        return baseStyles + 'bottom: 20px; left: 50%; transform: translateX(-50%);';
      case 'center':
        return baseStyles + 'top: 50%; left: 50%; transform: translate(-50%, -50%);';
      case 'corner':
      default:
        return baseStyles + 'bottom: 20px; right: 20px;';
    }
  }

  /**
   * Remove feedback prompt
   */
  private removeFeedbackPrompt(): void {
    if (this.promptElement) {
      this.promptElement.remove();
      this.promptElement = undefined;
    }
  }

  /**
   * Submit feedback
   */
  public async submitFeedback(feedback: Omit<UserFeedback, 'id' | 'timestamp'>): Promise<string> {
    const feedbackEntry: UserFeedback = {
      ...feedback,
      id: this.generateId(),
      timestamp: new Date(),
    };

    // Store locally
    this.feedbackEntries.push(feedbackEntry);
    this.storeFeedback();

    // Clean up old entries
    this.cleanupOldEntries();

    // Submit to server if configured
    if (this.config.autoSubmit && this.config.submitEndpoint) {
      try {
        await this.submitToServer(feedbackEntry);
      } catch (error) {
        console.warn('Failed to submit feedback to server:', error);
      }
    }

    return feedbackEntry.id;
  }

  /**
   * Submit feedback to server
   */
  private async submitToServer(feedback: UserFeedback): Promise<void> {
    if (!this.config.submitEndpoint) {
      return;
    }

    const response = await fetch(this.config.submitEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
      },
      body: JSON.stringify({
        type: 'user-feedback',
        feedback,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
    }
  }

  /**
   * Get all feedback entries
   */
  public getFeedback(): UserFeedback[] {
    return [...this.feedbackEntries];
  }

  /**
   * Get feedback by rendering ID
   */
  public getFeedbackByRenderingId(renderingId: string): UserFeedback[] {
    return this.feedbackEntries.filter(f => f.renderingId === renderingId);
  }

  /**
   * Get feedback statistics
   */
  public getFeedbackStats(): {
    totalEntries: number;
    averageRating: number;
    categoryBreakdown: Record<FeedbackCategory, number>;
    ratingDistribution: Record<number, number>;
  } {
    const stats = {
      totalEntries: this.feedbackEntries.length,
      averageRating: 0,
      categoryBreakdown: {
        [FeedbackCategory.PERFORMANCE]: 0,
        [FeedbackCategory.RELIABILITY]: 0,
        [FeedbackCategory.USABILITY]: 0,
        [FeedbackCategory.OTHER]: 0,
      },
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    if (this.feedbackEntries.length === 0) {
      return stats;
    }

    // Calculate average rating
    const totalRating = this.feedbackEntries.reduce((sum, f) => sum + f.rating, 0);
    stats.averageRating = totalRating / this.feedbackEntries.length;

    // Calculate category breakdown
    this.feedbackEntries.forEach(f => {
      stats.categoryBreakdown[f.category]++;
      stats.ratingDistribution[f.rating]++;
    });

    return stats;
  }

  /**
   * Store feedback to local storage
   */
  private storeFeedback(): void {
    try {
      localStorage.setItem('pdf-feedback', JSON.stringify(this.feedbackEntries));
    } catch (error) {
      console.warn('Failed to store feedback locally:', error);
    }
  }

  /**
   * Load feedback from local storage
   */
  private loadStoredFeedback(): void {
    try {
      const stored = localStorage.getItem('pdf-feedback');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.feedbackEntries = parsed.map((f: any) => ({
          ...f,
          timestamp: new Date(f.timestamp),
        }));
      }
    } catch (error) {
      console.warn('Failed to load stored feedback:', error);
      this.feedbackEntries = [];
    }
  }

  /**
   * Clean up old entries
   */
  private cleanupOldEntries(): void {
    // Keep only the most recent entries
    if (this.feedbackEntries.length > this.config.maxLocalEntries) {
      this.feedbackEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      this.feedbackEntries = this.feedbackEntries.slice(0, this.config.maxLocalEntries);
    }

    // Remove entries older than 30 days
    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - 30);
    this.feedbackEntries = this.feedbackEntries.filter(f => f.timestamp >= cutoffTime);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Clear all feedback
   */
  public clearFeedback(): void {
    this.feedbackEntries = [];
    this.storeFeedback();
  }

  /**
   * Export feedback data
   */
  public exportFeedback(): string {
    return JSON.stringify({
      feedback: this.feedbackEntries,
      stats: this.getFeedbackStats(),
      exportTimestamp: new Date().toISOString(),
    }, null, 2);
  }
}
/**
 * Progress Indicator Component Tests
 * 
 * Tests for enhanced progress indicators with stage information
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ProgressIndicator, MinimalProgressBar } from '../ProgressIndicator';
import type { ProgressState } from '../../../lib/pdf-reliability/types';
import { RenderingStage as Stage } from '../../../lib/pdf-reliability/types';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { it } from 'zod/v4/locales';
import { describe } from 'node:test';
import { describe } from 'node:test';

// Mock the Button component
vi.mock('../../ui/Button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('ProgressIndicator', () => {
  const mockProgress: ProgressState = {
    percentage: 50,
    stage: Stage.RENDERING,
    bytesLoaded: 1024 * 512, // 512 KB
    totalBytes: 1024 * 1024, // 1 MB
    timeElapsed: 5000, // 5 seconds
    isStuck: false,
    lastUpdate: new Date('2023-01-01T12:00:00Z'),
  };

  describe('Progress Display', () => {
    it('should display progress percentage', () => {
      render(<ProgressIndicator progress={mockProgress} />);
      
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display stage description', () => {
      render(<ProgressIndicator progress={mockProgress} />);
      
      expect(screen.getByText('Rendering pages...')).toBeInTheDocument();
    });

    it('should display time elapsed', () => {
      render(<ProgressIndicator progress={mockProgress} />);
      
      expect(screen.getByText('5s')).toBeInTheDocument();
    });

    it('should show progress bar with correct width', () => {
      render(<ProgressIndicator progress={mockProgress} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '50%' });
    });

    it('should display stage icons', () => {
      const { container } = render(<ProgressIndicator progress={mockProgress} />);
      
      // Should have SVG icons for stages
      const svgElements = container.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });
  });

  describe('Stage Information', () => {
    it('should show different descriptions for different stages', () => {
      const stages = [
        { stage: Stage.INITIALIZING, description: 'Initializing...' },
        { stage: Stage.FETCHING, description: 'Downloading PDF...' },
        { stage: Stage.PARSING, description: 'Processing document...' },
        { stage: Stage.RENDERING, description: 'Rendering pages...' },
        { stage: Stage.FINALIZING, description: 'Finalizing...' },
        { stage: Stage.COMPLETE, description: 'Complete' },
        { stage: Stage.ERROR, description: 'Error occurred' },
      ];

      stages.forEach(({ stage, description }) => {
        const progress = { ...mockProgress, stage };
        const { rerender } = render(<ProgressIndicator progress={progress} />);
        
        expect(screen.getByText(description)).toBeInTheDocument();
        
        rerender(<div />); // Clear for next test
      });
    });

    it('should show stage progress indicators', () => {
      render(<ProgressIndicator progress={mockProgress} />);
      
      // Should show stage indicators for all stages except ERROR
      const stageIndicators = screen.getAllByText(/initializing|fetching|parsing|rendering|finalizing|complete/i);
      expect(stageIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('Stuck State Detection', () => {
    it('should show stuck warning when progress is stuck', () => {
      const stuckProgress = { ...mockProgress, isStuck: true };
      render(<ProgressIndicator progress={stuckProgress} />);
      
      expect(screen.getByText('Loading appears stuck')).toBeInTheDocument();
    });

    it('should show force retry button when stuck and callback provided', () => {
      const stuckProgress = { ...mockProgress, isStuck: true };
      const onForceRetry = vi.fn();
      
      render(<ProgressIndicator progress={stuckProgress} onForceRetry={onForceRetry} />);
      
      const retryButton = screen.getByText('Force Retry');
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onForceRetry when retry button clicked', () => {
      const stuckProgress = { ...mockProgress, isStuck: true };
      const onForceRetry = vi.fn();
      
      render(<ProgressIndicator progress={stuckProgress} onForceRetry={onForceRetry} />);
      
      const retryButton = screen.getByText('Force Retry');
      fireEvent.click(retryButton);
      
      expect(onForceRetry).toHaveBeenCalledTimes(1);
    });

    it('should not show retry button when not stuck', () => {
      const onForceRetry = vi.fn();
      render(<ProgressIndicator progress={mockProgress} onForceRetry={onForceRetry} />);
      
      expect(screen.queryByText('Force Retry')).not.toBeInTheDocument();
    });
  });

  describe('Detailed Information', () => {
    it('should show detailed information when showDetails is true', () => {
      render(<ProgressIndicator progress={mockProgress} showDetails={true} />);
      
      expect(screen.getByText('Time elapsed:')).toBeInTheDocument();
      expect(screen.getByText('Downloaded:')).toBeInTheDocument();
      expect(screen.getByText('Last update:')).toBeInTheDocument();
    });

    it('should not show detailed information by default', () => {
      render(<ProgressIndicator progress={mockProgress} />);
      
      expect(screen.queryByText('Time elapsed:')).not.toBeInTheDocument();
      expect(screen.queryByText('Downloaded:')).not.toBeInTheDocument();
    });

    it('should format bytes correctly', () => {
      render(<ProgressIndicator progress={mockProgress} showDetails={true} />);
      
      expect(screen.getByText('512 KB / 1 MB')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state for error stage', () => {
      const errorProgress = { ...mockProgress, stage: Stage.ERROR };
      render(<ProgressIndicator progress={errorProgress} />);
      
      expect(screen.getByText('Failed to load PDF')).toBeInTheDocument();
    });

    it('should use red color for error progress bar', () => {
      const errorProgress = { ...mockProgress, stage: Stage.ERROR };
      render(<ProgressIndicator progress={errorProgress} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-red-500');
    });
  });

  describe('Success State', () => {
    it('should show success state for complete stage', () => {
      const completeProgress = { ...mockProgress, stage: Stage.COMPLETE, percentage: 100 };
      render(<ProgressIndicator progress={completeProgress} />);
      
      expect(screen.getByText('PDF loaded successfully')).toBeInTheDocument();
    });

    it('should use green color for complete progress bar', () => {
      const completeProgress = { ...mockProgress, stage: Stage.COMPLETE };
      render(<ProgressIndicator progress={completeProgress} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('bg-green-500');
    });
  });

  describe('Immediate Visibility', () => {
    it('should become visible immediately after mounting', async () => {
      render(<ProgressIndicator progress={mockProgress} />);
      
      // Component should be visible (Requirements: 5.1)
      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ProgressIndicator progress={mockProgress} />);
      
      // Progress bar should have role
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have descriptive text for screen readers', () => {
      render(<ProgressIndicator progress={mockProgress} />);
      
      expect(screen.getByText('Rendering pages...')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });
});

describe('MinimalProgressBar', () => {
  const mockProgress: ProgressState = {
    percentage: 75,
    stage: Stage.RENDERING,
    bytesLoaded: 0,
    totalBytes: 0,
    timeElapsed: 0,
    isStuck: false,
    lastUpdate: new Date(),
  };

  it('should render minimal progress bar', () => {
    render(<MinimalProgressBar progress={mockProgress} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '75%' });
  });

  it('should use appropriate colors for different states', () => {
    const errorProgress = { ...mockProgress, stage: Stage.ERROR };
    render(<MinimalProgressBar progress={errorProgress} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-red-500');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <MinimalProgressBar progress={mockProgress} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
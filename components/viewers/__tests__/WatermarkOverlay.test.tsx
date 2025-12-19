import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import WatermarkOverlay from '../WatermarkOverlay';

describe('WatermarkOverlay', () => {
  it('should render text watermark with default settings', () => {
    render(<WatermarkOverlay text="CONFIDENTIAL" />);

    const overlay = screen.getByTestId('watermark-overlay');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveTextContent('CONFIDENTIAL');
    
    // Should have default opacity
    expect(overlay).toHaveStyle({ opacity: '0.2' });
    
    // Should have pointer-events: none
    expect(overlay).toHaveStyle({ pointerEvents: 'none' });
  });

  it('should render with custom opacity and fontSize', () => {
    render(
      <WatermarkOverlay 
        text="DRAFT" 
        opacity={0.5} 
        fontSize={48} 
      />
    );

    const overlay = screen.getByTestId('watermark-overlay');
    expect(overlay).toHaveStyle({ opacity: '0.5' });
    
    const textElement = overlay.querySelector('div');
    expect(textElement).toHaveStyle({ fontSize: '48px' });
  });

  it('should render image watermark when imageUrl is provided', () => {
    render(
      <WatermarkOverlay 
        text="CONFIDENTIAL" 
        imageUrl="https://example.com/watermark.png"
      />
    );

    const overlay = screen.getByTestId('watermark-overlay');
    const image = screen.getByAltText('Watermark');
    
    expect(overlay).toBeInTheDocument();
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'https://example.com/watermark.png');
    
    // Should not show text when image is provided
    expect(overlay).not.toHaveTextContent('CONFIDENTIAL');
  });

  it('should not render when text is empty and no imageUrl', () => {
    render(<WatermarkOverlay text="" />);
    
    expect(screen.queryByTestId('watermark-overlay')).not.toBeInTheDocument();
  });

  it('should not render when text is whitespace only and no imageUrl', () => {
    render(<WatermarkOverlay text="   " />);
    
    expect(screen.queryByTestId('watermark-overlay')).not.toBeInTheDocument();
  });

  it('should render when imageUrl is provided even with empty text', () => {
    render(
      <WatermarkOverlay 
        text="" 
        imageUrl="https://example.com/watermark.png"
      />
    );

    const overlay = screen.getByTestId('watermark-overlay');
    expect(overlay).toBeInTheDocument();
    
    const image = screen.getByAltText('Watermark');
    expect(image).toBeInTheDocument();
  });

  it('should have correct CSS classes for positioning', () => {
    render(<WatermarkOverlay text="TEST" />);

    const overlay = screen.getByTestId('watermark-overlay');
    
    // Should be positioned absolutely and cover full area
    expect(overlay).toHaveClass('absolute', 'inset-0');
    
    // Should be centered
    expect(overlay).toHaveClass('flex', 'items-center', 'justify-center');
    
    // Should not capture pointer events
    expect(overlay).toHaveClass('pointer-events-none');
  });

  it('should have correct z-index for layering', () => {
    render(<WatermarkOverlay text="TEST" />);

    const overlay = screen.getByTestId('watermark-overlay');
    expect(overlay).toHaveStyle({ zIndex: '10' });
  });

  it('should apply text styling correctly', () => {
    render(<WatermarkOverlay text="CONFIDENTIAL" fontSize={36} />);

    const overlay = screen.getByTestId('watermark-overlay');
    const textElement = overlay.querySelector('div');
    
    expect(textElement).toHaveClass('text-gray-600', 'font-bold', 'select-none', 'transform', 'rotate-45');
    expect(textElement).toHaveStyle({ 
      fontSize: '36px',
      textShadow: '1px 1px 2px rgba(255,255,255,0.5)',
      letterSpacing: '0.1em'
    });
  });

  it('should apply background pattern for text watermarks', () => {
    render(<WatermarkOverlay text="TEST" />);

    const overlay = screen.getByTestId('watermark-overlay');
    const style = getComputedStyle(overlay);
    
    // Should have repeating gradient background
    expect(overlay.style.background).toContain('repeating-linear-gradient');
  });

  it('should not apply background pattern for image watermarks', () => {
    render(
      <WatermarkOverlay 
        text="TEST" 
        imageUrl="https://example.com/watermark.png"
      />
    );

    const overlay = screen.getByTestId('watermark-overlay');
    
    // Should not have background when image is used
    expect(overlay.style.background).toBe('');
  });
});
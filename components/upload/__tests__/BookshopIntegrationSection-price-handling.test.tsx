/**
 * Unit Test for BookshopIntegrationSection Component Price Handling
 * Task 7.1: Write unit test for component price handling
 * Validates: Requirements 1.5
 * 
 * Test that component accepts and displays zero prices correctly
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookshopIntegrationSection } from '../BookshopIntegrationSection';

// Mock the Input component
vi.mock('@/components/ui/Input', () => ({
  Input: ({ className, ...props }: any) => (
    <input className={className} {...props} />
  ),
}));

// Mock fetch for categories API
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('BookshopIntegrationSection - Price Handling', () => {
  const defaultProps = {
    isEnabled: true,
    onToggle: vi.fn(),
    category: 'Education',
    onCategoryChange: vi.fn(),
    price: 0,
    onPriceChange: vi.fn(),
    description: '',
    onDescriptionChange: vi.fn(),
    errors: {},
  };

  beforeEach(() => {
    // Mock successful categories fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          flat: ['Education', 'Technology', 'Music', 'Art', 'Business']
        }
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Requirement 1.5: Component should allow ₹0.00 as a valid minimum price value**
   */
  describe('Zero Price Acceptance', () => {

    it('should accept and display zero price correctly', async () => {
      const onPriceChange = vi.fn();
      
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          price={0}
          onPriceChange={onPriceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      });

      const priceInput = screen.getByLabelText(/price/i);
      
      // Test that zero price is displayed correctly (empty value represents 0)
      expect(priceInput).toHaveValue(null); // Empty input for 0 price
      
      // Test that placeholder indicates free content is allowed
      expect(priceInput).toHaveAttribute('placeholder', '0.00 (free content)');
      
      // Test that min attribute allows 0
      expect(priceInput).toHaveAttribute('min', '0');
    });

    it('should call onPriceChange with 0 when user enters 0', async () => {
      const onPriceChange = vi.fn();
      
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          price={10}
          onPriceChange={onPriceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      });

      const priceInput = screen.getByLabelText(/price/i);
      
      // User enters 0
      fireEvent.change(priceInput, { target: { value: '0' } });
      
      // Should call onPriceChange with 0
      expect(onPriceChange).toHaveBeenCalledWith(0);
    });

    it('should call onPriceChange with 0 when user enters 0.00', async () => {
      const onPriceChange = vi.fn();
      
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          price={5}
          onPriceChange={onPriceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      });

      const priceInput = screen.getByLabelText(/price/i);
      
      // User enters 0.00
      fireEvent.change(priceInput, { target: { value: '0.00' } });
      
      // Should call onPriceChange with 0
      expect(onPriceChange).toHaveBeenCalledWith(0);
    });

    it('should display helpful text indicating free content is allowed', async () => {
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          price={0}
        />
      );

      await waitFor(() => {
        // Check for helpful text about free content
        expect(screen.getByText(/Enter ₹0\.00 for free content/)).toBeInTheDocument();
        expect(screen.getByText(/Maximum price: ₹10,000/)).toBeInTheDocument();
      });

      // Check placeholder text
      const priceInput = screen.getByLabelText(/price/i);
      expect(priceInput).toHaveAttribute('placeholder', '0.00 (free content)');
    });

  });

  describe('Price Input Validation', () => {

    it('should accept valid price range including 0', async () => {
      const onPriceChange = vi.fn();
      
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          onPriceChange={onPriceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      });

      const priceInput = screen.getByLabelText(/price/i);
      
      // Test various valid prices including 0
      const validPrices = ['0', '0.00', '1', '10.50', '100', '1000', '10000'];
      
      for (const price of validPrices) {
        fireEvent.change(priceInput, { target: { value: price } });
        expect(onPriceChange).toHaveBeenCalledWith(parseFloat(price));
      }
    });

    it('should not accept negative prices', async () => {
      const onPriceChange = vi.fn();
      
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          price={0}
          onPriceChange={onPriceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      });

      const priceInput = screen.getByLabelText(/price/i);
      
      // Test negative prices - should not call onPriceChange
      fireEvent.change(priceInput, { target: { value: '-1' } });
      fireEvent.change(priceInput, { target: { value: '-10.50' } });
      
      // onPriceChange should not be called for negative values
      expect(onPriceChange).not.toHaveBeenCalled();
    });

    it('should not accept prices above maximum (10000)', async () => {
      const onPriceChange = vi.fn();
      
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          price={0}
          onPriceChange={onPriceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      });

      const priceInput = screen.getByLabelText(/price/i);
      
      // Test prices above maximum - should not call onPriceChange
      fireEvent.change(priceInput, { target: { value: '10001' } });
      fireEvent.change(priceInput, { target: { value: '50000' } });
      
      // onPriceChange should not be called for values above maximum
      expect(onPriceChange).not.toHaveBeenCalled();
    });

  });

  describe('Price Display and Formatting', () => {

    it('should display zero price as empty input field', async () => {
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          price={0}
        />
      );

      await waitFor(() => {
        const priceInput = screen.getByLabelText(/price/i);
        // Zero price should be displayed as empty value
        expect(priceInput).toHaveValue(null);
      });
    });

    it('should display non-zero prices correctly', async () => {
      const testPrices = [1, 10.50, 100, 1000, 9999.99];
      
      for (const price of testPrices) {
        const { rerender } = render(
          <BookshopIntegrationSection
            {...defaultProps}
            price={price}
          />
        );

        await waitFor(() => {
          const priceInput = screen.getByLabelText(/price/i);
          expect(priceInput).toHaveValue(price);
        });

        rerender(<div />); // Clean up for next iteration
      }
    });

    it('should show currency symbol (₹) in the input field', async () => {
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          price={0}
        />
      );

      await waitFor(() => {
        // Check for currency symbol
        expect(screen.getByText('₹')).toBeInTheDocument();
      });
    });

  });

  describe('Error Handling for Price Field', () => {

    it('should display price error when provided', async () => {
      const priceError = 'Price must be between ₹0 and ₹10,000';
      
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          price={0}
          errors={{ price: priceError }}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(priceError)).toBeInTheDocument();
      });

      // Input should have error styling
      const priceInput = screen.getByLabelText(/price/i);
      expect(priceInput).toHaveClass('border-red-500');
    });

    it('should not show error styling when no price error exists', async () => {
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          price={0}
          errors={{}}
        />
      );

      await waitFor(() => {
        const priceInput = screen.getByLabelText(/price/i);
        expect(priceInput).not.toHaveClass('border-red-500');
      });
    });

    it('should handle empty/invalid input gracefully', async () => {
      const onPriceChange = vi.fn();
      
      render(
        <BookshopIntegrationSection
          {...defaultProps}
          onPriceChange={onPriceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      });

      const priceInput = screen.getByLabelText(/price/i);
      
      // Test that the input accepts empty values without errors
      fireEvent.change(priceInput, { target: { value: '' } });
      // The component should handle empty input gracefully (no errors thrown)
      expect(priceInput).toHaveValue(null);
      
      // Test that the input accepts invalid text without errors
      fireEvent.change(priceInput, { target: { value: 'abc' } });
      // The component should handle invalid input gracefully (no errors thrown)
      expect(priceInput).toHaveValue(null);
      
      // Test that valid zero input works
      fireEvent.change(priceInput, { target: { value: '0' } });
      expect(onPriceChange).toHaveBeenCalledWith(0);
    });

  });

  describe('Component Integration', () => {

    it('should only show price input when bookshop integration is enabled', async () => {
      const { rerender } = render(
        <BookshopIntegrationSection
          {...defaultProps}
          isEnabled={false}
        />
      );

      // Price input should not be visible when disabled
      expect(screen.queryByLabelText(/price/i)).not.toBeInTheDocument();

      // Enable bookshop integration
      rerender(
        <BookshopIntegrationSection
          {...defaultProps}
          isEnabled={true}
        />
      );

      await waitFor(() => {
        // Price input should now be visible
        expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      });
    });

    it('should maintain price value when toggling bookshop integration', async () => {
      const onPriceChange = vi.fn();
      
      const { rerender } = render(
        <BookshopIntegrationSection
          {...defaultProps}
          isEnabled={true}
          price={0}
          onPriceChange={onPriceChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
      });

      // Disable and re-enable
      rerender(
        <BookshopIntegrationSection
          {...defaultProps}
          isEnabled={false}
          price={0}
          onPriceChange={onPriceChange}
        />
      );

      rerender(
        <BookshopIntegrationSection
          {...defaultProps}
          isEnabled={true}
          price={0}
          onPriceChange={onPriceChange}
        />
      );

      await waitFor(() => {
        const priceInput = screen.getByLabelText(/price/i);
        // Price should still be 0 (empty value)
        expect(priceInput).toHaveValue(null);
      });
    });

  });
});
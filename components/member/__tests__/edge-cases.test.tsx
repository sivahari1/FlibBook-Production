/**
 * Unit Tests for Edge Cases
 * Feature: member-study-room-bookshop
 * Requirements: 4.3, 4.4, 8.3, 8.4, 9.4
 * 
 * Tests:
 * - Adding item when free limit reached
 * - Adding item when paid limit reached
 * - Payment failure handling
 * - Button disabled states at limits
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { BookShopItemCard } from '../BookShopItemCard';
import { PaymentModal } from '../PaymentModal';

// Mock fetch globally
global.fetch = vi.fn();

describe('Edge Cases - BookShop Item Addition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockReset();
  });

  const mockFreeItem = {
    id: 'item-1',
    documentId: 'doc-1',
    title: 'Free Math Book',
    description: 'A free educational resource',
    category: 'Maths > CBSE - 1st Standard',
    isFree: true,
    price: null,
    isPublished: true,
    inMyJstudyroom: false,
    document: {
      id: 'doc-1',
      title: 'Free Math Book',
      filename: 'math.pdf',
      contentType: 'PDF',
    },
  };

  const mockPaidItem = {
    id: 'item-2',
    documentId: 'doc-2',
    title: 'Premium Music Course',
    description: 'A paid music course',
    category: 'Music',
    isFree: false,
    price: 50000, // ₹500.00 in paise
    isPublished: true,
    inMyJstudyroom: false,
    document: {
      id: 'doc-2',
      title: 'Premium Music Course',
      filename: 'music.pdf',
      contentType: 'PDF',
    },
  };

  /**
   * Test: Adding item when free limit reached
   * Requirement: 4.3, 8.3
   */
  describe('Free Limit Reached', () => {
    it('should disable "Add to Study Room" button when free limit is reached', () => {
      const userLimits = {
        freeCount: 5,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /free limit reached/i });
      expect(button).toBeDisabled();
    });

    it('should display limit warning message when free limit is reached', () => {
      const userLimits = {
        freeCount: 5,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      expect(screen.getByText(/limit reached/i)).toBeInTheDocument();
      expect(screen.getByText(/you've used all 5 free slots/i)).toBeInTheDocument();
      expect(screen.getByText(/remove an item from your study room to add more/i)).toBeInTheDocument();
    });

    it('should show error message when attempting to add free item at limit', async () => {
      const user = userEvent.setup();
      const userLimits = {
        freeCount: 4,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      // Mock API response for limit exceeded
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Free document limit reached (5/5)' }),
      });

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /add to my study room/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/free item limit reached \(5\/5\)/i)).toBeInTheDocument();
        expect(screen.getByText(/remove an item from your study room to add more/i)).toBeInTheDocument();
      });
    });

    it('should not call API when button is disabled at free limit', async () => {
      const user = userEvent.setup();
      const onAdd = vi.fn();
      const userLimits = {
        freeCount: 5,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={onAdd}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /free limit reached/i });
      
      // Try to click disabled button
      await user.click(button);

      // Should not make API call
      expect(global.fetch).not.toHaveBeenCalled();
      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  /**
   * Test: Adding item when paid limit reached
   * Requirement: 4.4, 8.4
   */
  describe('Paid Limit Reached', () => {
    it('should disable "Add to Study Room" button when paid limit is reached', () => {
      const userLimits = {
        freeCount: 2,
        paidCount: 5,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockPaidItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /paid limit reached/i });
      expect(button).toBeDisabled();
    });

    it('should display limit warning message when paid limit is reached', () => {
      const userLimits = {
        freeCount: 2,
        paidCount: 5,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockPaidItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      expect(screen.getByText(/limit reached/i)).toBeInTheDocument();
      expect(screen.getByText(/you've used all 5 paid slots/i)).toBeInTheDocument();
      expect(screen.getByText(/remove an item from your study room to add more/i)).toBeInTheDocument();
    });

    it('should not open payment modal when paid limit is reached', async () => {
      const user = userEvent.setup();
      const userLimits = {
        freeCount: 2,
        paidCount: 5,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockPaidItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /paid limit reached/i });
      
      // Try to click disabled button
      await user.click(button);

      // Payment modal should not appear
      expect(screen.queryByText(/purchase document/i)).not.toBeInTheDocument();
    });

    it('should handle payment order creation failure when limit is reached', async () => {
      const user = userEvent.setup();

      // Mock Razorpay script loading
      const mockScript = document.createElement('script');
      vi.spyOn(document, 'createElement').mockReturnValue(mockScript);

      // Mock payment order creation failure
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Paid document limit reached (5/5)' }),
      });

      const { container } = render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          bookShopItem={{
            id: mockPaidItem.id,
            title: mockPaidItem.title,
            description: mockPaidItem.description,
            category: mockPaidItem.category,
            price: mockPaidItem.price!,
          }}
          onSuccess={vi.fn()}
        />
      );

      const payButton = screen.getByRole('button', { name: /pay ₹500\.00/i });
      await user.click(payButton);

      await waitFor(() => {
        expect(screen.getByText(/paid item limit reached \(5\/5\)/i)).toBeInTheDocument();
        expect(screen.getByText(/remove an item from your study room to purchase more/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Test: Payment failure handling
   * Requirement: 9.4
   */
  describe('Payment Failure Handling', () => {
    beforeEach(() => {
      // Mock Razorpay to be available
      (window as any).Razorpay = vi.fn();
    });

    it('should display error message when payment order creation fails', async () => {
      const user = userEvent.setup();

      // Mock payment order creation failure
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Failed to create payment order' }),
      });

      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          bookShopItem={{
            id: mockPaidItem.id,
            title: mockPaidItem.title,
            description: mockPaidItem.description,
            category: mockPaidItem.category,
            price: mockPaidItem.price!,
          }}
          onSuccess={vi.fn()}
        />
      );

      const payButton = screen.getByRole('button', { name: /pay ₹500\.00/i });
      await user.click(payButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to create payment order/i)).toBeInTheDocument();
      });
    });

    it('should display error message when payment verification fails', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = vi.fn();

      // Mock successful order creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: 'order_123',
          amount: 50000,
          currency: 'INR',
        }),
      });

      // Mock Razorpay instance
      const mockRazorpayInstance = {
        open: vi.fn(),
        on: vi.fn(),
      };
      (window as any).Razorpay = vi.fn(() => mockRazorpayInstance);

      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          bookShopItem={{
            id: mockPaidItem.id,
            title: mockPaidItem.title,
            description: mockPaidItem.description,
            category: mockPaidItem.category,
            price: mockPaidItem.price!,
          }}
          onSuccess={mockOnSuccess}
        />
      );

      const payButton = screen.getByRole('button', { name: /pay ₹500\.00/i });
      await user.click(payButton);

      await waitFor(() => {
        expect(mockRazorpayInstance.open).toHaveBeenCalled();
      });

      // Get the Razorpay options
      const razorpayOptions = (window as any).Razorpay.mock.calls[0][0];

      // Mock failed verification
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Payment verification failed' }),
      });

      // Simulate successful payment but failed verification
      await razorpayOptions.handler({
        razorpay_order_id: 'order_123',
        razorpay_payment_id: 'pay_123',
        razorpay_signature: 'sig_123',
      });

      await waitFor(() => {
        expect(screen.getByText(/payment verification failed/i)).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should show retry button on payment failure', async () => {
      const user = userEvent.setup();

      // Mock payment order creation failure
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Network error' }),
      });

      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          bookShopItem={{
            id: mockPaidItem.id,
            title: mockPaidItem.title,
            description: mockPaidItem.description,
            category: mockPaidItem.category,
            price: mockPaidItem.price!,
          }}
          onSuccess={vi.fn()}
        />
      );

      const payButton = screen.getByRole('button', { name: /pay ₹500\.00/i });
      await user.click(payButton);

      await waitFor(() => {
        expect(screen.getByText(/try payment again/i)).toBeInTheDocument();
      });
    });

    it('should handle payment cancellation gracefully', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      // Mock successful order creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: 'order_123',
          amount: 50000,
          currency: 'INR',
        }),
      });

      // Mock Razorpay instance
      const mockRazorpayInstance = {
        open: vi.fn(),
        on: vi.fn(),
      };
      (window as any).Razorpay = vi.fn(() => mockRazorpayInstance);

      render(
        <PaymentModal
          isOpen={true}
          onClose={mockOnClose}
          bookShopItem={{
            id: mockPaidItem.id,
            title: mockPaidItem.title,
            description: mockPaidItem.description,
            category: mockPaidItem.category,
            price: mockPaidItem.price!,
          }}
          onSuccess={vi.fn()}
        />
      );

      const payButton = screen.getByRole('button', { name: /pay ₹500\.00/i });
      await user.click(payButton);

      await waitFor(() => {
        expect(mockRazorpayInstance.open).toHaveBeenCalled();
      });

      // Get the Razorpay options
      const razorpayOptions = (window as any).Razorpay.mock.calls[0][0];

      // Simulate user dismissing the payment modal
      razorpayOptions.modal.ondismiss();

      await waitFor(() => {
        expect(screen.getByText(/payment cancelled/i)).toBeInTheDocument();
      });
    });

    it('should handle Razorpay script loading failure', async () => {
      const user = userEvent.setup();

      // Remove Razorpay from window
      delete (window as any).Razorpay;

      // Mock successful order creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: 'order_123',
          amount: 50000,
          currency: 'INR',
        }),
      });

      // Mock script creation and simulate loading failure
      const mockScript = document.createElement('script');
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockScript);

      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          bookShopItem={{
            id: mockPaidItem.id,
            title: mockPaidItem.title,
            description: mockPaidItem.description,
            category: mockPaidItem.category,
            price: mockPaidItem.price!,
          }}
          onSuccess={vi.fn()}
        />
      );

      const payButton = screen.getByRole('button', { name: /pay ₹500\.00/i });
      await user.click(payButton);

      // Simulate script load error
      setTimeout(() => {
        if (mockScript.onerror) {
          (mockScript.onerror as any)(new Error('Script load failed'));
        }
      }, 0);

      await waitFor(() => {
        expect(screen.getByText(/failed to load payment gateway/i)).toBeInTheDocument();
      });

      createElementSpy.mockRestore();
    });

    it('should handle already owned item error', async () => {
      const user = userEvent.setup();

      // Mock payment order creation with conflict error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'You already own this item' }),
      });

      render(
        <PaymentModal
          isOpen={true}
          onClose={vi.fn()}
          bookShopItem={{
            id: mockPaidItem.id,
            title: mockPaidItem.title,
            description: mockPaidItem.description,
            category: mockPaidItem.category,
            price: mockPaidItem.price!,
          }}
          onSuccess={vi.fn()}
        />
      );

      const payButton = screen.getByRole('button', { name: /pay ₹500\.00/i });
      await user.click(payButton);

      await waitFor(() => {
        expect(screen.getByText(/you already own this item/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Test: Button disabled states at limits
   * Requirement: 8.3, 8.4
   */
  describe('Button Disabled States', () => {
    it('should enable button when free slots are available', () => {
      const userLimits = {
        freeCount: 3,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /add to my study room/i });
      expect(button).not.toBeDisabled();
    });

    it('should enable button when paid slots are available', () => {
      const userLimits = {
        freeCount: 2,
        paidCount: 3,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockPaidItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /add to my study room/i });
      expect(button).not.toBeDisabled();
    });

    it('should disable button when item is already in study room', () => {
      const itemInStudyRoom = { ...mockFreeItem, inMyJstudyroom: true };
      const userLimits = {
        freeCount: 3,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={itemInStudyRoom}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /in my study room/i });
      expect(button).toBeDisabled();
    });

    it('should disable button during loading state', async () => {
      const user = userEvent.setup();
      const userLimits = {
        freeCount: 3,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      // Mock slow API response
      (global.fetch as any).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true }),
                }),
              1000
            )
          )
      );

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /add to my study room/i });
      await user.click(button);

      // Button should be disabled during loading
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /adding\.\.\./i })).toBeDisabled();
      });
    });

    it('should allow adding paid item when free limit is reached but paid limit is not', () => {
      const userLimits = {
        freeCount: 5,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockPaidItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /add to my study room/i });
      expect(button).not.toBeDisabled();
    });

    it('should allow adding free item when paid limit is reached but free limit is not', () => {
      const userLimits = {
        freeCount: 2,
        paidCount: 5,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /add to my study room/i });
      expect(button).not.toBeDisabled();
    });

    it('should disable both free and paid buttons when total limit (10) is reached', () => {
      const userLimitsAtTotal = {
        freeCount: 5,
        paidCount: 5,
        freeLimit: 5,
        paidLimit: 5,
      };

      const { rerender } = render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimitsAtTotal}
        />
      );

      expect(screen.getByRole('button', { name: /free limit reached/i })).toBeDisabled();

      rerender(
        <BookShopItemCard
          item={mockPaidItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimitsAtTotal}
        />
      );

      expect(screen.getByRole('button', { name: /paid limit reached/i })).toBeDisabled();
    });

    it('should show correct button text at edge of limit (4/5)', () => {
      const userLimits = {
        freeCount: 4,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      // Should still show "Add to My Study Room" not "Limit Reached"
      const button = screen.getByRole('button', { name: /add to my study room/i });
      expect(button).not.toBeDisabled();
    });
  });

  /**
   * Test: Network failure and retry handling
   */
  describe('Network Failure and Retry', () => {
    it('should show retry button on network failure for free items', async () => {
      const user = userEvent.setup();
      const userLimits = {
        freeCount: 3,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      // Mock network failure
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /add to my study room/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(screen.getByText(/try again/i)).toBeInTheDocument();
      });
    });

    it('should not show retry button for limit errors', async () => {
      const user = userEvent.setup();
      const userLimits = {
        freeCount: 4,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      // Mock limit error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Free document limit reached (5/5)' }),
      });

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /add to my study room/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/free item limit reached/i)).toBeInTheDocument();
        expect(screen.queryByText(/try again/i)).not.toBeInTheDocument();
      });
    });

    it('should not show retry button for "already exists" errors', async () => {
      const user = userEvent.setup();
      const userLimits = {
        freeCount: 3,
        paidCount: 2,
        freeLimit: 5,
        paidLimit: 5,
      };

      // Mock already exists error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ error: 'This item is already in your Study Room' }),
      });

      render(
        <BookShopItemCard
          item={mockFreeItem}
          onAddToMyJstudyroom={vi.fn()}
          userLimits={userLimits}
        />
      );

      const button = screen.getByRole('button', { name: /add to my study room/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/already in your study room/i)).toBeInTheDocument();
        expect(screen.queryByText(/try again/i)).not.toBeInTheDocument();
      });
    });
  });
});

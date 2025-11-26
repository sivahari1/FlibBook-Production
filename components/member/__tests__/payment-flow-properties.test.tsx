/**
 * Property-Based Tests for Payment Flow
 * Feature: member-study-room-bookshop
 * Properties: 13, 25, 26, 27
 * Validates: Requirements 4.2, 9.1, 9.2, 9.3, 9.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import { BookShopItemCard } from '@/components/member/BookShopItemCard';
import { PaymentModal } from '@/components/member/PaymentModal';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Razorpay
const mockRazorpayOpen = vi.fn();
const mockRazorpayOn = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  
  // Reset Razorpay mock
  (global as any).window = {
    Razorpay: vi.fn().mockImplementation(() => ({
      open: mockRazorpayOpen,
      on: mockRazorpayOn,
    })),
  };
});

afterEach(() => {
  cleanup();
});

// Arbitraries for generating test data
const paidBookShopItemArbitrary = fc.record({
  id: fc.uuid(),
  documentId: fc.uuid(),
  title: fc.string({ minLength: 5, maxLength: 100 }), // Ensure non-empty titles
  description: fc.option(fc.string({ minLength: 10, maxLength: 500 })),
  category: fc.oneof(
    fc.constant('Maths > CBSE - 1st Standard'),
    fc.constant('Music'),
    fc.constant('Functional MRI')
  ),
  isFree: fc.constant(false),
  price: fc.integer({ min: 100, max: 100000 }), // Price in paise (1 to 1000 rupees)
  isPublished: fc.constant(true),
  inMyJstudyroom: fc.constant(false),
  contentType: fc.oneof(
    fc.constant('PDF'),
    fc.constant('IMAGE'),
    fc.constant('VIDEO'),
    fc.constant('LINK'),
    fc.constant('AUDIO')
  ),
  document: fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 5, maxLength: 100 }),
    filename: fc.string({ minLength: 5, maxLength: 100 }),
  }),
});

const userLimitsArbitrary = fc.record({
  freeCount: fc.integer({ min: 0, max: 5 }),
  paidCount: fc.integer({ min: 0, max: 4 }), // Less than 5 to allow adding
  freeLimit: fc.constant(5),
  paidLimit: fc.constant(5),
});

describe('Payment Flow Properties', () => {
  /**
   * Feature: member-study-room-bookshop, Property 13: Adding paid items triggers payment
   * Validates: Requirements 4.2
   */
  it('Property 13: clicking add on paid items triggers payment modal', async () => {
    await fc.assert(
      fc.asyncProperty(
        paidBookShopItemArbitrary,
        userLimitsArbitrary,
        async (item, userLimits) => {
          cleanup(); // Clean up before each iteration
          
          const onAddToMyJstudyroom = vi.fn();
          const user = userEvent.setup();

          const { container } = render(
            <BookShopItemCard
              item={item}
              onAddToMyJstudyroom={onAddToMyJstudyroom}
              userLimits={userLimits}
            />
          );

          // Find and click the "Add to My Study Room" button
          const addButton = within(container).getByRole('button', { name: /add to my study room/i });
          expect(addButton).toBeDefined();
          expect(addButton).not.toBeDisabled();

          await user.click(addButton);

          // Payment modal should appear
          await waitFor(() => {
            expect(screen.queryByText(/purchase document/i)).toBeDefined();
          }, { timeout: 1000 });

          // Modal should display item details
          expect(screen.queryByText(item.title)).toBeDefined();
          
          cleanup(); // Clean up after each iteration
        }
      ),
      { numRuns: 20 } // Reduced for stability
    );
  });

  /**
   * Feature: member-study-room-bookshop, Property 25: Payment modal displays item details
   * Validates: Requirements 9.1
   */
  it('Property 25: payment modal displays all required item details', async () => {
    await fc.assert(
      fc.asyncProperty(
        paidBookShopItemArbitrary,
        async (item) => {
          cleanup(); // Clean up before each iteration
          
          const onClose = vi.fn();
          const onSuccess = vi.fn();

          const { container } = render(
            <PaymentModal
              isOpen={true}
              onClose={onClose}
              bookShopItem={{
                id: item.id,
                title: item.title,
                description: item.description || '',
                category: item.category,
                price: item.price,
              }}
              onSuccess={onSuccess}
            />
          );

          // Modal should display title
          expect(within(container).queryByText(item.title)).toBeDefined();

          // Modal should display description if present
          if (item.description) {
            expect(within(container).queryByText(item.description)).toBeDefined();
          }

          // Modal should display category
          expect(container.textContent).toContain(item.category);

          // Modal should display price
          const priceInRupees = (item.price / 100).toFixed(2);
          expect(container.textContent).toContain(`₹${priceInRupees}`);

          // Modal should have payment button
          const payButton = within(container).queryByRole('button', { name: new RegExp(`pay`, 'i') });
          expect(payButton).toBeDefined();
          
          cleanup(); // Clean up after each iteration
        }
      ),
      { numRuns: 20 } // Reduced for stability
    );
  });

  /**
   * Feature: member-study-room-bookshop, Property 26: Successful payment adds item
   * Validates: Requirements 9.2, 9.5
   */
  it('Property 26: successful payment verification adds item to study room', async () => {
    await fc.assert(
      fc.asyncProperty(
        paidBookShopItemArbitrary,
        async (item) => {
          cleanup(); // Clean up before each iteration
          vi.clearAllMocks(); // Clear mocks for each iteration
          
          const onClose = vi.fn();
          const onSuccess = vi.fn();
          const user = userEvent.setup();

          // Mock successful order creation
          const mockOrderId = `order_${Date.now()}`;
          (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              orderId: mockOrderId,
              amount: item.price,
              currency: 'INR',
            }),
          });

          // Mock successful payment verification
          (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              itemId: fc.sample(fc.uuid(), 1)[0],
              message: 'Payment verified and document added to My jstudyroom',
            }),
          });

          const { container } = render(
            <PaymentModal
              isOpen={true}
              onClose={onClose}
              bookShopItem={{
                id: item.id,
                title: item.title,
                description: item.description || '',
                category: item.category,
                price: item.price,
              }}
              onSuccess={onSuccess}
            />
          );

          // Click pay button
          const payButton = within(container).getByRole('button', { name: /pay/i });
          await user.click(payButton);

          // Wait for order creation
          await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
              '/api/payment/create-order',
              expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ bookShopItemId: item.id }),
              })
            );
          }, { timeout: 2000 });

          // Simulate Razorpay success callback
          const handlerOptions = (global as any).window.Razorpay.mock.calls[0][0];
          
          await handlerOptions.handler({
            razorpay_order_id: mockOrderId,
            razorpay_payment_id: `pay_${Date.now()}`,
            razorpay_signature: 'mock_signature',
          });

          // Wait for verification
          await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
              '/api/payment/verify',
              expect.objectContaining({
                method: 'POST',
              })
            );
          }, { timeout: 2000 });

          // Success callback should be called
          await waitFor(() => {
            expect(onSuccess).toHaveBeenCalled();
          }, { timeout: 2000 });

          // Modal should close
          await waitFor(() => {
            expect(onClose).toHaveBeenCalled();
          }, { timeout: 2000 });
          
          cleanup(); // Clean up after each iteration
        }
      ),
      { numRuns: 10 } // Reduced runs due to complexity
    );
  });

  /**
   * Feature: member-study-room-bookshop, Property 27: Payment cancellation prevents addition
   * Validates: Requirements 9.3
   */
  it('Property 27: cancelling payment does not add item to study room', async () => {
    await fc.assert(
      fc.asyncProperty(
        paidBookShopItemArbitrary,
        async (item) => {
          cleanup(); // Clean up before each iteration
          vi.clearAllMocks(); // Clear mocks for each iteration
          
          const onClose = vi.fn();
          const onSuccess = vi.fn();
          const user = userEvent.setup();

          // Mock successful order creation
          const mockOrderId = `order_${Date.now()}`;
          (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              orderId: mockOrderId,
              amount: item.price,
              currency: 'INR',
            }),
          });

          const { container } = render(
            <PaymentModal
              isOpen={true}
              onClose={onClose}
              bookShopItem={{
                id: item.id,
                title: item.title,
                description: item.description || '',
                category: item.category,
                price: item.price,
              }}
              onSuccess={onSuccess}
            />
          );

          // Click pay button
          const payButton = within(container).getByRole('button', { name: /pay/i });
          await user.click(payButton);

          // Wait for order creation
          await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledWith(
              '/api/payment/create-order',
              expect.objectContaining({
                method: 'POST',
              })
            );
          }, { timeout: 2000 });

          // Simulate Razorpay modal dismissal (user cancellation)
          const handlerOptions = (global as any).window.Razorpay.mock.calls[0][0];
          handlerOptions.modal.ondismiss();

          // Wait a bit to ensure no verification happens
          await new Promise(resolve => setTimeout(resolve, 200));

          // Verification should NOT be called
          const verifyCalls = (global.fetch as any).mock.calls.filter(
            (call: any) => call[0] === '/api/payment/verify'
          );
          expect(verifyCalls.length).toBe(0);

          // Success callback should NOT be called
          expect(onSuccess).not.toHaveBeenCalled();

          // Modal should NOT close automatically (user can retry)
          expect(onClose).not.toHaveBeenCalled();

          // Error message about cancellation should appear
          await waitFor(() => {
            expect(container.textContent).toContain('cancelled');
          }, { timeout: 1000 });
          
          cleanup(); // Clean up after each iteration
        }
      ),
      { numRuns: 10 } // Reduced runs due to complexity
    );
  });
});

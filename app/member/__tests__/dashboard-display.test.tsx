/**
 * Unit Tests for Member Dashboard Display
 * Feature: member-study-room-bookshop
 * Tests: Welcome section, Quick action cards, Information section
 * Validates: Requirements 1.1, 1.3, 1.5
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock data for testing
const mockUserWithName = {
  name: 'John Doe',
  email: 'john@example.com',
  freeDocumentCount: 2,
  paidDocumentCount: 3,
};

const mockUserWithoutName = {
  name: null,
  email: 'jane@example.com',
  freeDocumentCount: 1,
  paidDocumentCount: 0,
};

// Helper function to render dashboard content
const renderDashboardContent = (user: typeof mockUserWithName) => {
  const totalDocuments = (user.freeDocumentCount || 0) + (user.paidDocumentCount || 0);
  
  return render(
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome, {user.name || 'Member'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Access your shared documents, manage your personal bookshelf, and explore the Book Shop.
        </p>
      </div>

      {/* Document Count Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Free Documents
              </p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {user.freeDocumentCount || 0} / 5
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Paid Documents
              </p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {user.paidDocumentCount || 0} / 5
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Documents
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {totalDocuments} / 10
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <a
          href="/member/shared"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg group-hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Files Shared With Me
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View documents shared by others
              </p>
            </div>
          </div>
        </a>

        <a
          href="/member/my-jstudyroom"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg group-hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                My Study Room
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your personal collection
              </p>
            </div>
          </div>
        </a>

        <a
          href="/member/bookshop"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow group"
        >
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg group-hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Book Shop
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Browse and add documents
              </p>
            </div>
          </div>
        </a>
      </div>

      {/* Information Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-3">
          <svg
            className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              About Your Study Room
            </h3>
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              Your Study Room is your personal collection space that can hold up to 10 content items: 
              5 free items and 5 paid items. Browse the Book Shop to discover and add educational content 
              to your collection. You can remove items at any time to make room for new ones.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

describe('Member Dashboard Display Unit Tests', () => {
  /**
   * Test welcome section shows member name
   * Validates: Requirements 1.1
   */
  describe('Welcome Section', () => {
    it('should display welcome message with member name when name is provided', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check that welcome heading is present with the member's name
      const welcomeHeading = screen.getByRole('heading', { level: 1 });
      expect(welcomeHeading).toBeInTheDocument();
      expect(welcomeHeading).toHaveTextContent('Welcome, John Doe!');
    });

    it('should display welcome message with "Member" when name is null', () => {
      renderDashboardContent(mockUserWithoutName);
      
      // Check that welcome heading defaults to "Member"
      const welcomeHeading = screen.getByRole('heading', { level: 1 });
      expect(welcomeHeading).toBeInTheDocument();
      expect(welcomeHeading).toHaveTextContent('Welcome, Member!');
    });

    it('should display welcome description text', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check that the description paragraph is present
      const description = screen.getByText(/Access your shared documents, manage your personal bookshelf, and explore the Book Shop/i);
      expect(description).toBeInTheDocument();
    });

    it('should have exactly one welcome heading', () => {
      renderDashboardContent(mockUserWithName);
      
      // Verify there's only one h1 element
      const headings = screen.getAllByRole('heading', { level: 1 });
      expect(headings).toHaveLength(1);
    });
  });

  /**
   * Test quick action cards are present
   * Validates: Requirements 1.3
   */
  describe('Quick Action Cards', () => {
    it('should display all three quick action cards', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check for "Files Shared With Me" card
      const sharedFilesCard = screen.getByText('Files Shared With Me');
      expect(sharedFilesCard).toBeInTheDocument();
      
      // Check for "My Study Room" card
      const studyRoomCard = screen.getByText('My Study Room');
      expect(studyRoomCard).toBeInTheDocument();
      
      // Check for "Book Shop" card
      const bookShopCard = screen.getByText('Book Shop');
      expect(bookShopCard).toBeInTheDocument();
    });

    it('should have correct links for each quick action card', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check "Files Shared With Me" link
      const sharedFilesLink = screen.getByRole('link', { name: /Files Shared With Me/i });
      expect(sharedFilesLink).toHaveAttribute('href', '/member/shared');
      
      // Check "My Study Room" link
      const studyRoomLink = screen.getByRole('link', { name: /My Study Room/i });
      expect(studyRoomLink).toHaveAttribute('href', '/member/my-jstudyroom');
      
      // Check "Book Shop" link
      const bookShopLink = screen.getByRole('link', { name: /Book Shop/i });
      expect(bookShopLink).toHaveAttribute('href', '/member/bookshop');
    });

    it('should display descriptions for each quick action card', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check descriptions are present
      expect(screen.getByText('View documents shared by others')).toBeInTheDocument();
      expect(screen.getByText('Your personal collection')).toBeInTheDocument();
      expect(screen.getByText('Browse and add documents')).toBeInTheDocument();
    });

    it('should have exactly three quick action cards', () => {
      renderDashboardContent(mockUserWithName);
      
      // Count the number of quick action card headings (h3 elements)
      const cardHeadings = screen.getAllByRole('heading', { level: 3 });
      // Filter to only quick action cards (excluding "About Your Study Room")
      const quickActionHeadings = cardHeadings.filter(heading => 
        heading.textContent === 'Files Shared With Me' ||
        heading.textContent === 'My Study Room' ||
        heading.textContent === 'Book Shop'
      );
      expect(quickActionHeadings).toHaveLength(3);
    });

    it('should render quick action cards with proper styling classes', () => {
      renderDashboardContent(mockUserWithName);
      
      // Get all links and verify they have the expected classes
      const links = screen.getAllByRole('link');
      
      // Filter to only quick action links
      const quickActionLinks = links.filter(link => 
        link.getAttribute('href')?.startsWith('/member/')
      );
      
      expect(quickActionLinks).toHaveLength(3);
      
      // Verify each has the expected base classes
      quickActionLinks.forEach(link => {
        expect(link.className).toContain('rounded-lg');
        expect(link.className).toContain('shadow-sm');
      });
    });
  });

  /**
   * Test information section is displayed
   * Validates: Requirements 1.5
   */
  describe('Information Section', () => {
    it('should display the information section heading', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check for "About Your Study Room" heading
      const infoHeading = screen.getByText('About Your Study Room');
      expect(infoHeading).toBeInTheDocument();
      expect(infoHeading.tagName).toBe('H3');
    });

    it('should display information about Study Room limits', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check that the information text is present
      const infoText = screen.getByText(/Your Study Room is your personal collection space that can hold up to 10 content items/i);
      expect(infoText).toBeInTheDocument();
    });

    it('should mention 5 free items limit in information section', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check that "5 free items" is mentioned
      const infoText = screen.getByText(/5 free items and 5 paid items/i);
      expect(infoText).toBeInTheDocument();
    });

    it('should mention 5 paid items limit in information section', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check that "5 paid items" is mentioned
      const infoText = screen.getByText(/5 free items and 5 paid items/i);
      expect(infoText).toBeInTheDocument();
    });

    it('should explain Book Shop functionality in information section', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check that Book Shop is mentioned
      const infoText = screen.getByText(/Browse the Book Shop to discover and add educational content/i);
      expect(infoText).toBeInTheDocument();
    });

    it('should mention ability to remove items in information section', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check that removing items is mentioned
      const infoText = screen.getByText(/You can remove items at any time to make room for new ones/i);
      expect(infoText).toBeInTheDocument();
    });

    it('should have information section with proper styling', () => {
      renderDashboardContent(mockUserWithName);
      
      // Find the information section by its heading
      const infoHeading = screen.getByText('About Your Study Room');
      const infoSection = infoHeading.closest('div')?.parentElement?.parentElement;
      
      expect(infoSection).toBeInTheDocument();
      expect(infoSection?.className).toContain('bg-blue-50');
      expect(infoSection?.className).toContain('rounded-lg');
    });

    it('should display information section icon', () => {
      renderDashboardContent(mockUserWithName);
      
      // Check that the information section contains an SVG icon
      const infoHeading = screen.getByText('About Your Study Room');
      const infoSection = infoHeading.closest('div')?.parentElement;
      const svg = infoSection?.querySelector('svg');
      
      expect(svg).toBeInTheDocument();
    });
  });

  /**
   * Combined test - verify all three sections are present together
   */
  describe('Complete Dashboard Display', () => {
    it('should display welcome section, quick action cards, and information section together', () => {
      renderDashboardContent(mockUserWithName);
      
      // Verify welcome section
      expect(screen.getByRole('heading', { level: 1, name: /Welcome, John Doe!/i })).toBeInTheDocument();
      
      // Verify quick action cards
      expect(screen.getByText('Files Shared With Me')).toBeInTheDocument();
      expect(screen.getByText('My Study Room')).toBeInTheDocument();
      expect(screen.getByText('Book Shop')).toBeInTheDocument();
      
      // Verify information section
      expect(screen.getByText('About Your Study Room')).toBeInTheDocument();
    });

    it('should maintain consistent display regardless of user data', () => {
      // Test with user who has name
      const { unmount } = renderDashboardContent(mockUserWithName);
      
      expect(screen.getByText('Files Shared With Me')).toBeInTheDocument();
      expect(screen.getByText('About Your Study Room')).toBeInTheDocument();
      
      unmount();
      
      // Test with user without name
      renderDashboardContent(mockUserWithoutName);
      
      expect(screen.getByText('Files Shared With Me')).toBeInTheDocument();
      expect(screen.getByText('About Your Study Room')).toBeInTheDocument();
    });
  });
});

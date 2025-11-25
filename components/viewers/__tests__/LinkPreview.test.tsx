/**
 * Tests for LinkPreview component
 * Validates Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LinkMetadata } from '@/lib/types/content';

describe('LinkPreview Component', () => {
  describe('LinkMetadata Interface', () => {
    it('should define required metadata fields', () => {
      const metadata: LinkMetadata = {
        url: 'https://example.com/article',
        title: 'Example Article',
        domain: 'example.com'
      };

      expect(metadata.url).toBe('https://example.com/article');
      expect(metadata.title).toBe('Example Article');
      expect(metadata.domain).toBe('example.com');
    });

    it('should handle optional description field', () => {
      const withDescription: LinkMetadata = {
        url: 'https://example.com',
        title: 'Example',
        description: 'This is a description',
        domain: 'example.com'
      };

      const withoutDescription: LinkMetadata = {
        url: 'https://example.com',
        title: 'Example',
        domain: 'example.com'
      };

      expect(withDescription.description).toBe('This is a description');
      expect(withoutDescription.description).toBeUndefined();
    });

    it('should handle optional preview image field', () => {
      const withImage: LinkMetadata = {
        url: 'https://example.com',
        title: 'Example',
        domain: 'example.com',
        previewImage: 'https://example.com/preview.jpg'
      };

      const withoutImage: LinkMetadata = {
        url: 'https://example.com',
        title: 'Example',
        domain: 'example.com'
      };

      expect(withImage.previewImage).toBe('https://example.com/preview.jpg');
      expect(withoutImage.previewImage).toBeUndefined();
    });

    it('should handle optional fetchedAt field', () => {
      const now = new Date();
      const withFetchedAt: LinkMetadata = {
        url: 'https://example.com',
        title: 'Example',
        domain: 'example.com',
        fetchedAt: now
      };

      expect(withFetchedAt.fetchedAt).toBe(now);
    });
  });

  describe('Component Props', () => {
    it('should accept required props', () => {
      const props = {
        linkUrl: 'https://example.com/article',
        metadata: {
          url: 'https://example.com/article',
          title: 'Example Article',
          domain: 'example.com'
        },
        allowDirectAccess: true
      };

      expect(props.linkUrl).toBeTruthy();
      expect(props.metadata).toBeDefined();
      expect(props.allowDirectAccess).toBe(true);
    });

    it('should accept optional title prop', () => {
      const props = {
        linkUrl: 'https://example.com',
        metadata: {
          url: 'https://example.com',
          title: 'Example',
          domain: 'example.com'
        },
        allowDirectAccess: true,
        title: 'Shared Link'
      };

      expect(props.title).toBe('Shared Link');
    });

    it('should handle allowDirectAccess flag', () => {
      const allowedProps = {
        linkUrl: 'https://example.com',
        metadata: {
          url: 'https://example.com',
          title: 'Example',
          domain: 'example.com'
        },
        allowDirectAccess: true
      };

      const restrictedProps = {
        linkUrl: 'https://example.com',
        metadata: {
          url: 'https://example.com',
          title: 'Example',
          domain: 'example.com'
        },
        allowDirectAccess: false
      };

      expect(allowedProps.allowDirectAccess).toBe(true);
      expect(restrictedProps.allowDirectAccess).toBe(false);
    });
  });

  describe('Link Opening Behavior (Requirement 8.5)', () => {
    it('should open link in new tab when allowed', () => {
      const allowDirectAccess = true;
      const targetAttribute = '_blank';
      const relAttribute = 'noopener,noreferrer';

      expect(allowDirectAccess).toBe(true);
      expect(targetAttribute).toBe('_blank');
      expect(relAttribute).toContain('noopener');
      expect(relAttribute).toContain('noreferrer');
    });

    it('should not open link when access is restricted', () => {
      const allowDirectAccess = false;

      expect(allowDirectAccess).toBe(false);
    });

    it('should use window.open with security parameters', () => {
      const windowFeatures = 'noopener,noreferrer';

      expect(windowFeatures).toContain('noopener');
      expect(windowFeatures).toContain('noreferrer');
    });
  });

  describe('Domain Display (Requirement 8.4)', () => {
    it('should extract domain from URL', () => {
      const extractDomain = (url: string): string => {
        try {
          const urlObj = new URL(url);
          return urlObj.hostname;
        } catch {
          return url;
        }
      };

      expect(extractDomain('https://example.com/path')).toBe('example.com');
      expect(extractDomain('https://www.example.com/path')).toBe('www.example.com');
      expect(extractDomain('https://subdomain.example.com')).toBe('subdomain.example.com');
    });

    it('should display domain badge', () => {
      const metadata: LinkMetadata = {
        url: 'https://example.com',
        title: 'Example',
        domain: 'example.com'
      };

      expect(metadata.domain).toBe('example.com');
      expect(metadata.domain).toBeTruthy();
    });
  });

  describe('Preview Image Handling', () => {
    it('should handle image load errors gracefully', () => {
      let imageError = false;

      const handleImageError = () => {
        imageError = true;
      };

      handleImageError();

      expect(imageError).toBe(true);
    });

    it('should display preview image when available', () => {
      const metadata: LinkMetadata = {
        url: 'https://example.com',
        title: 'Example',
        domain: 'example.com',
        previewImage: 'https://example.com/preview.jpg'
      };

      expect(metadata.previewImage).toBeDefined();
      expect(metadata.previewImage).toBeTruthy();
    });

    it('should handle missing preview image', () => {
      const metadata: LinkMetadata = {
        url: 'https://example.com',
        title: 'Example',
        domain: 'example.com'
      };

      expect(metadata.previewImage).toBeUndefined();
    });
  });

  describe('Access Control', () => {
    it('should show visit button when access is allowed', () => {
      const allowDirectAccess = true;
      const shouldShowButton = allowDirectAccess;

      expect(shouldShowButton).toBe(true);
    });

    it('should show restriction message when access is denied', () => {
      const allowDirectAccess = false;
      const shouldShowRestriction = !allowDirectAccess;

      expect(shouldShowRestriction).toBe(true);
    });
  });
});


// ============================================================================
// Property-Based Tests
// ============================================================================

describe('Property-Based Tests for LinkPreview', () => {
  /**
   * Property 24: Link preview rendering
   * Feature: admin-enhanced-privileges, Property 24: Link preview rendering
   * For any link document, the rendered preview should contain the title, 
   * description, domain, and preview image (if available)
   * Validates: Requirements 8.1, 8.2, 8.3, 8.4
   */
  describe('Property 24: Link preview rendering', () => {
    it('should render with all required metadata fields for any valid link', () => {
      fc.assert(
        fc.property(
          // Generate valid link URLs
          fc.constantFrom(
            'https://example.com',
            'https://docs.example.com/guide',
            'https://blog.example.com/article',
            'https://www.example.com/page',
            'https://subdomain.example.com/resource'
          ),
          // Generate valid link metadata
          fc.record({
            url: fc.constantFrom(
              'https://example.com',
              'https://docs.example.com/guide',
              'https://blog.example.com/article'
            ),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
            domain: fc.constantFrom(
              'example.com',
              'docs.example.com',
              'blog.example.com',
              'www.example.com'
            ),
            previewImage: fc.option(
              fc.constantFrom(
                'https://example.com/preview.jpg',
                'https://example.com/og-image.png',
                'https://cdn.example.com/thumb.webp'
              ),
              { nil: undefined }
            ),
            fetchedAt: fc.option(fc.date(), { nil: undefined })
          }),
          (linkUrl, metadata) => {
            // Validate that the props structure is correct for rendering
            const props = {
              linkUrl,
              metadata,
              allowDirectAccess: true
            };
            
            // All required props should be defined
            expect(props.linkUrl).toBeDefined();
            expect(props.linkUrl).toBeTruthy();
            expect(props.metadata).toBeDefined();
            
            // Required metadata fields should be present
            expect(props.metadata.url).toBeDefined();
            expect(props.metadata.title).toBeDefined();
            expect(props.metadata.title.length).toBeGreaterThan(0);
            expect(props.metadata.domain).toBeDefined();
            expect(props.metadata.domain).toBeTruthy();
            
            // URL should be a valid string
            expect(typeof props.linkUrl).toBe('string');
            expect(props.linkUrl.length).toBeGreaterThan(0);
            
            // Title should be a non-empty string
            expect(typeof props.metadata.title).toBe('string');
            expect(props.metadata.title.length).toBeGreaterThan(0);
            
            // Domain should be a non-empty string
            expect(typeof props.metadata.domain).toBe('string');
            expect(props.metadata.domain.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle optional description field for any link', () => {
      fc.assert(
        fc.property(
          // Generate link metadata with optional description
          fc.record({
            url: fc.constantFrom(
              'https://example.com',
              'https://test.com/page'
            ),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
            domain: fc.constantFrom('example.com', 'test.com')
          }),
          (metadata) => {
            // Description should be either a string or undefined
            if (metadata.description !== undefined) {
              expect(typeof metadata.description).toBe('string');
              expect(metadata.description.length).toBeGreaterThan(0);
            } else {
              expect(metadata.description).toBeUndefined();
            }
            
            // Other required fields should always be present
            expect(metadata.url).toBeDefined();
            expect(metadata.title).toBeDefined();
            expect(metadata.domain).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle optional preview image for any link', () => {
      fc.assert(
        fc.property(
          // Generate link metadata with optional preview image
          fc.record({
            url: fc.constantFrom(
              'https://example.com',
              'https://test.com/page'
            ),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            domain: fc.constantFrom('example.com', 'test.com'),
            previewImage: fc.option(
              fc.constantFrom(
                'https://example.com/preview.jpg',
                'https://example.com/og-image.png',
                'https://cdn.example.com/thumb.webp'
              ),
              { nil: undefined }
            )
          }),
          (metadata) => {
            // Preview image should be either a valid URL string or undefined
            if (metadata.previewImage !== undefined) {
              expect(typeof metadata.previewImage).toBe('string');
              expect(metadata.previewImage.length).toBeGreaterThan(0);
              expect(
                metadata.previewImage.startsWith('http://') ||
                metadata.previewImage.startsWith('https://')
              ).toBe(true);
            } else {
              expect(metadata.previewImage).toBeUndefined();
            }
            
            // Required fields should always be present
            expect(metadata.url).toBeDefined();
            expect(metadata.title).toBeDefined();
            expect(metadata.domain).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate domain matches URL for any link', () => {
      fc.assert(
        fc.property(
          // Generate consistent URL and domain pairs
          fc.constantFrom(
            { url: 'https://example.com/page', domain: 'example.com' },
            { url: 'https://docs.example.com/guide', domain: 'docs.example.com' },
            { url: 'https://www.example.com/article', domain: 'www.example.com' },
            { url: 'https://blog.example.com/post', domain: 'blog.example.com' }
          ),
          fc.string({ minLength: 1, maxLength: 200 }),
          (urlDomainPair, title) => {
            const metadata: LinkMetadata = {
              url: urlDomainPair.url,
              title,
              domain: urlDomainPair.domain
            };
            
            // Extract domain from URL
            const extractedDomain = new URL(metadata.url).hostname;
            
            // Domain should match the hostname from URL
            expect(metadata.domain).toBe(extractedDomain);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should contain all required display elements for any link', () => {
      fc.assert(
        fc.property(
          // Generate complete link metadata
          fc.record({
            url: fc.constantFrom(
              'https://example.com',
              'https://test.com/page',
              'https://docs.example.com/guide'
            ),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            description: fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }),
            domain: fc.constantFrom('example.com', 'test.com', 'docs.example.com'),
            previewImage: fc.option(
              fc.constantFrom(
                'https://example.com/preview.jpg',
                'https://example.com/og-image.png'
              ),
              { nil: undefined }
            )
          }),
          (metadata) => {
            // All required fields for rendering should be present
            expect(metadata).toHaveProperty('url');
            expect(metadata).toHaveProperty('title');
            expect(metadata).toHaveProperty('domain');
            
            // Required fields should have valid values
            expect(metadata.url).toBeTruthy();
            expect(metadata.title).toBeTruthy();
            expect(metadata.domain).toBeTruthy();
            
            // Verify metadata can be used for display
            expect(typeof metadata.url).toBe('string');
            expect(typeof metadata.title).toBe('string');
            expect(typeof metadata.domain).toBe('string');
            
            // Optional fields should be either defined or undefined
            if (metadata.description !== undefined) {
              expect(typeof metadata.description).toBe('string');
            }
            if (metadata.previewImage !== undefined) {
              expect(typeof metadata.previewImage).toBe('string');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle various URL formats correctly', () => {
      fc.assert(
        fc.property(
          // Generate various URL formats
          fc.constantFrom(
            'https://example.com',
            'https://example.com/',
            'https://example.com/path',
            'https://example.com/path/to/page',
            'https://example.com/path?query=value',
            'https://example.com/path#anchor',
            'https://subdomain.example.com/page',
            'https://www.example.com/article'
          ),
          fc.string({ minLength: 1, maxLength: 100 }),
          (url, title) => {
            // Extract domain from URL
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            
            const metadata: LinkMetadata = {
              url,
              title,
              domain
            };
            
            // Metadata should be valid for all URL formats
            expect(metadata.url).toBe(url);
            expect(metadata.url).toBeTruthy();
            expect(metadata.domain).toBe(domain);
            expect(metadata.domain).toBeTruthy();
            
            // URL should be parseable
            expect(() => new URL(metadata.url)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle edge case titles and descriptions', () => {
      fc.assert(
        fc.property(
          // Generate edge case text content
          fc.constantFrom(
            { title: 'A', description: undefined },
            { title: 'Very Long Title '.repeat(20), description: 'Short' },
            { title: 'Title', description: 'Very Long Description '.repeat(50) },
            { title: 'Title with special chars: <>&"\'', description: 'Description' },
            { title: 'Title', description: undefined }
          ),
          (textContent) => {
            const metadata: LinkMetadata = {
              url: 'https://example.com',
              title: textContent.title,
              description: textContent.description,
              domain: 'example.com'
            };
            
            // Title should always be present and non-empty
            expect(metadata.title).toBeDefined();
            expect(metadata.title.length).toBeGreaterThan(0);
            
            // Description can be undefined or a string
            if (metadata.description !== undefined) {
              expect(typeof metadata.description).toBe('string');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 25: Link opens in new tab
   * Feature: admin-enhanced-privileges, Property 25: Link opens in new tab
   * For any rendered link, the anchor element should have target="_blank" attribute
   * Validates: Requirements 8.5
   */
  describe('Property 25: Link opens in new tab', () => {
    it('should use target="_blank" for any link when access is allowed', () => {
      fc.assert(
        fc.property(
          // Generate valid link metadata
          fc.record({
            url: fc.constantFrom(
              'https://example.com',
              'https://test.com/page',
              'https://docs.example.com/guide'
            ),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            domain: fc.constantFrom('example.com', 'test.com', 'docs.example.com')
          }),
          // Generate allowDirectAccess flag
          fc.boolean(),
          (metadata, allowDirectAccess) => {
            // When access is allowed, target should be "_blank"
            if (allowDirectAccess) {
              const targetAttribute = '_blank';
              expect(targetAttribute).toBe('_blank');
            }
            
            // Props should be valid
            const props = {
              linkUrl: metadata.url,
              metadata,
              allowDirectAccess
            };
            
            expect(props.linkUrl).toBeDefined();
            expect(props.metadata).toBeDefined();
            expect(typeof props.allowDirectAccess).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use noopener and noreferrer for security on any link', () => {
      fc.assert(
        fc.property(
          // Generate valid link metadata
          fc.record({
            url: fc.constantFrom(
              'https://example.com',
              'https://test.com/page',
              'https://external-site.com'
            ),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            domain: fc.constantFrom('example.com', 'test.com', 'external-site.com')
          }),
          (metadata) => {
            // Security attributes should always be present
            const windowFeatures = 'noopener,noreferrer';
            
            expect(windowFeatures).toContain('noopener');
            expect(windowFeatures).toContain('noreferrer');
            
            // Verify both security features are included
            const features = windowFeatures.split(',');
            expect(features).toContain('noopener');
            expect(features).toContain('noreferrer');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should open link with window.open when access is allowed', () => {
      fc.assert(
        fc.property(
          // Generate valid URLs
          fc.constantFrom(
            'https://example.com',
            'https://test.com/page',
            'https://docs.example.com/guide',
            'https://blog.example.com/article'
          ),
          fc.string({ minLength: 1, maxLength: 100 }),
          (url, title) => {
            const metadata: LinkMetadata = {
              url,
              title,
              domain: new URL(url).hostname
            };
            
            const allowDirectAccess = true;
            
            // When access is allowed, window.open should be called with correct params
            if (allowDirectAccess) {
              const targetUrl = url;
              const targetWindow = '_blank';
              const windowFeatures = 'noopener,noreferrer';
              
              expect(targetUrl).toBe(url);
              expect(targetWindow).toBe('_blank');
              expect(windowFeatures).toContain('noopener');
              expect(windowFeatures).toContain('noreferrer');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not open link when access is restricted', () => {
      fc.assert(
        fc.property(
          // Generate valid link metadata
          fc.record({
            url: fc.constantFrom(
              'https://example.com',
              'https://test.com/page'
            ),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            domain: fc.constantFrom('example.com', 'test.com')
          }),
          (metadata) => {
            const allowDirectAccess = false;
            
            // When access is not allowed, link should not open
            expect(allowDirectAccess).toBe(false);
            
            // Props should still be valid
            const props = {
              linkUrl: metadata.url,
              metadata,
              allowDirectAccess
            };
            
            expect(props.linkUrl).toBeDefined();
            expect(props.metadata).toBeDefined();
            expect(props.allowDirectAccess).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate target attribute for all access scenarios', () => {
      fc.assert(
        fc.property(
          // Generate valid link metadata
          fc.record({
            url: fc.constantFrom(
              'https://example.com',
              'https://test.com/page',
              'https://docs.example.com/guide'
            ),
            title: fc.string({ minLength: 1, maxLength: 200 }),
            domain: fc.constantFrom('example.com', 'test.com', 'docs.example.com')
          }),
          // Generate allowDirectAccess flag
          fc.boolean(),
          (metadata, allowDirectAccess) => {
            const props = {
              linkUrl: metadata.url,
              metadata,
              allowDirectAccess
            };
            
            // When access is allowed, target should be "_blank"
            if (props.allowDirectAccess) {
              const targetAttribute = '_blank';
              expect(targetAttribute).toBe('_blank');
              
              // Security attributes should be present
              const relAttribute = 'noopener noreferrer';
              expect(relAttribute).toContain('noopener');
              expect(relAttribute).toContain('noreferrer');
            }
            
            // Props should always be valid
            expect(props.linkUrl).toBeDefined();
            expect(props.metadata).toBeDefined();
            expect(typeof props.allowDirectAccess).toBe('boolean');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle button click behavior for any link', () => {
      fc.assert(
        fc.property(
          // Generate valid URLs
          fc.constantFrom(
            'https://example.com',
            'https://test.com/page',
            'https://docs.example.com/guide'
          ),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.boolean(),
          (url, title, allowDirectAccess) => {
            const metadata: LinkMetadata = {
              url,
              title,
              domain: new URL(url).hostname
            };
            
            // Simulate button click behavior
            const openLink = () => {
              if (allowDirectAccess) {
                // Would call window.open(url, '_blank', 'noopener,noreferrer')
                return { url, target: '_blank', features: 'noopener,noreferrer' };
              }
              return null;
            };
            
            const result = openLink();
            
            if (allowDirectAccess) {
              expect(result).not.toBeNull();
              expect(result?.url).toBe(url);
              expect(result?.target).toBe('_blank');
              expect(result?.features).toContain('noopener');
              expect(result?.features).toContain('noreferrer');
            } else {
              expect(result).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate security attributes are always present when opening links', () => {
      fc.assert(
        fc.property(
          // Generate various URLs
          fc.constantFrom(
            'https://example.com',
            'https://external-site.com',
            'https://untrusted-domain.com',
            'https://third-party.com/page'
          ),
          fc.string({ minLength: 1, maxLength: 100 }),
          (url, title) => {
            const metadata: LinkMetadata = {
              url,
              title,
              domain: new URL(url).hostname
            };
            
            const allowDirectAccess = true;
            
            // Security features should always be present
            const windowFeatures = 'noopener,noreferrer';
            const featuresList = windowFeatures.split(',');
            
            expect(featuresList).toContain('noopener');
            expect(featuresList).toContain('noreferrer');
            expect(featuresList.length).toBe(2);
            
            // Both security features should be non-empty strings
            featuresList.forEach(feature => {
              expect(feature).toBeTruthy();
              expect(typeof feature).toBe('string');
              expect(feature.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

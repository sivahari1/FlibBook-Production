'use client';

import React from 'react';
import { ContentType } from '@/lib/types/content';

/**
 * Content Type Selector Component
 * Allows users to select the type of content they want to upload
 * Filters available types based on user role permissions
 * Requirements: 9.1
 */

interface ContentTypeSelectorProps {
  selectedType: ContentType;
  onTypeChange: (type: ContentType) => void;
  allowedTypes: ContentType[];
  disabled?: boolean;
}

interface ContentTypeOption {
  type: ContentType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  allowedTypes,
  disabled = false,
}) => {
  // Define content type options with icons and descriptions
  const contentTypeOptions: ContentTypeOption[] = [
    {
      type: ContentType.PDF,
      label: 'PDF Document',
      description: 'Upload PDF files',
      icon: (
        <svg
          className="w-8 h-8"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      type: ContentType.IMAGE,
      label: 'Image',
      description: 'Upload JPG, PNG, GIF, WebP',
      icon: (
        <svg
          className="w-8 h-8"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      type: ContentType.VIDEO,
      label: 'Video',
      description: 'Upload MP4, WebM, MOV',
      icon: (
        <svg
          className="w-8 h-8"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
        </svg>
      ),
    },
    {
      type: ContentType.LINK,
      label: 'External Link',
      description: 'Share a URL',
      icon: (
        <svg
          className="w-8 h-8"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ];

  // Filter options based on allowed types
  const availableOptions = contentTypeOptions.filter((option) =>
    allowedTypes.includes(option.type)
  );

  const handleTypeSelect = (type: ContentType) => {
    if (!disabled && allowedTypes.includes(type)) {
      onTypeChange(type);
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Content Type
      </label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {availableOptions.map((option) => {
          const isSelected = selectedType === option.type;
          const isDisabled = disabled || !allowedTypes.includes(option.type);

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => handleTypeSelect(option.type)}
              disabled={isDisabled}
              className={`
                relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
                }
                ${
                  isDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:shadow-md'
                }
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
              `}
              aria-pressed={isSelected}
              aria-label={`Select ${option.label}`}
            >
              {/* Icon */}
              <div
                className={`
                  mb-2
                  ${
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }
                `}
              >
                {option.icon}
              </div>

              {/* Label */}
              <div className="text-center">
                <p
                  className={`
                    text-sm font-medium
                    ${
                      isSelected
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-gray-100'
                    }
                  `}
                >
                  {option.label}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {option.description}
                </p>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <svg
                    className="w-5 h-5 text-blue-600 dark:text-blue-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* No available types message */}
      {availableOptions.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No content types available for your role.</p>
        </div>
      )}
    </div>
  );
};

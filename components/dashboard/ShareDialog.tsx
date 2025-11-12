'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LinkShareForm } from './LinkShareForm';
import { EmailShareForm } from './EmailShareForm';

interface ShareDialogProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'link' | 'email';

export const ShareDialog: React.FC<ShareDialogProps> = ({
  documentId,
  documentTitle,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('link');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Share Document
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {documentTitle}
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('link')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === 'link'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                Link Share
              </div>
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === 'email'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }
              `}
            >
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Email Share
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-4">
          {activeTab === 'link' ? (
            <LinkShareForm documentId={documentId} onSuccess={onClose} />
          ) : (
            <EmailShareForm documentId={documentId} onSuccess={onClose} />
          )}
        </div>
      </div>
    </Modal>
  );
};

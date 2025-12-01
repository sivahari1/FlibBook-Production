/**
 * AnnotationActions Component
 * Displays edit/delete actions for annotations based on permissions
 */
'use client';

import React, { useState } from 'react';
import { useAnnotationAccess } from '@/hooks/useAnnotationPermissions';
import { PermissionTooltip } from './PermissionError';
import type { DocumentAnnotation } from '@/lib/types/annotations';

interface AnnotationActionsProps {
  annotation: DocumentAnnotation;
  onEdit?: (annotation: DocumentAnnotation) => void;
  onDelete?: (annotation: DocumentAnnotation) => void;
  onVisibilityToggle?: (annotation: DocumentAnnotation) => void;
  compact?: boolean;
}

export function AnnotationActions({
  annotation,
  onEdit,
  onDelete,
  onVisibilityToggle,
  compact = false,
}: AnnotationActionsProps) {
  const access = useAnnotationAccess(annotation);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!access.canView) {
    return null;
  }

  const handleDelete = () => {
    if (showDeleteConfirm && onDelete) {
      onDelete(annotation);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {access.canEdit && onEdit && (
          <button
            onClick={() => onEdit(annotation)}
            className="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            title="Edit annotation"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        )}
        
        {!access.canEdit && onEdit && (
          <PermissionTooltip message="You can only edit your own annotations">
            <button
              disabled
              className="cursor-not-allowed rounded p-1 text-gray-400 opacity-50"
              title="Edit annotation"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </PermissionTooltip>
        )}

        {access.canDelete && onDelete && !showDeleteConfirm && (
          <button
            onClick={handleDelete}
            className="rounded p-1 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
            title="Delete annotation"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}

        {showDeleteConfirm && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
            >
              Confirm
            </button>
            <button
              onClick={handleCancelDelete}
              className="rounded bg-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        )}

        {!access.canDelete && onDelete && (
          <PermissionTooltip message="You can only delete your own annotations">
            <button
              disabled
              className="cursor-not-allowed rounded p-1 text-gray-400 opacity-50"
              title="Delete annotation"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </PermissionTooltip>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {access.canEdit && onEdit && (
        <button
          onClick={() => onEdit(annotation)}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      )}

      {access.canEdit && onVisibilityToggle && (
        <button
          onClick={() => onVisibilityToggle(annotation)}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {annotation.visibility === 'public' ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Make Private
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Make Public
            </>
          )}
        </button>
      )}

      {access.canDelete && onDelete && !showDeleteConfirm && (
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-800 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      )}

      {showDeleteConfirm && (
        <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-2 dark:border-red-800 dark:bg-red-900/20">
          <span className="text-sm text-red-700 dark:text-red-300">
            Are you sure?
          </span>
          <button
            onClick={handleDelete}
            className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={handleCancelDelete}
            className="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      )}

      {!access.isOwner && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You can only edit or delete your own annotations
        </p>
      )}
    </div>
  );
}

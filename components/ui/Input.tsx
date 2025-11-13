import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  validateOnBlur?: boolean;
  onValidate?: (value: string) => string | undefined;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, validateOnBlur = false, onValidate, className = '', onBlur, ...props }, ref) => {
    const [internalError, setInternalError] = React.useState<string | undefined>();
    const [touched, setTouched] = React.useState(false);

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      
      if (validateOnBlur && onValidate) {
        const validationError = onValidate(e.target.value);
        setInternalError(validationError);
      }
      
      onBlur?.(e);
    };

    const displayError = error || (touched ? internalError : undefined);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
            displayError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          } ${className}`}
          onBlur={handleBlur}
          {...props}
        />
        {displayError && (
          <p className="mt-1 text-sm text-red-600">{displayError}</p>
        )}
        {helperText && !displayError && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

import React from 'react';

export interface PasswordStrength {
  score: number; // 0-5
  label: string;
  color: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

interface PasswordStrengthIndicatorProps {
  password: string;
  onStrengthChange?: (strength: PasswordStrength) => void;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  onStrengthChange,
}) => {
  const [strength, setStrength] = React.useState<PasswordStrength>({
    score: 0,
    label: 'Too weak',
    color: 'bg-red-500',
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  });

  React.useEffect(() => {
    if (!password) {
      const emptyStrength: PasswordStrength = {
        score: 0,
        label: 'Too weak',
        color: 'bg-red-500',
        checks: {
          length: false,
          uppercase: false,
          lowercase: false,
          number: false,
          special: false,
        },
      };
      setStrength(emptyStrength);
      onStrengthChange?.(emptyStrength);
      return;
    }

    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;

    let label = 'Too weak';
    let color = 'bg-red-500';

    if (score === 5) {
      label = 'Strong';
      color = 'bg-green-500';
    } else if (score === 4) {
      label = 'Good';
      color = 'bg-blue-500';
    } else if (score === 3) {
      label = 'Fair';
      color = 'bg-yellow-500';
    } else if (score >= 1) {
      label = 'Weak';
      color = 'bg-orange-500';
    }

    const newStrength = { score, label, color, checks };
    setStrength(newStrength);
    onStrengthChange?.(newStrength);
  }, [password, onStrengthChange]);

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Password strength:</span>
        <span
          className={`font-medium ${
            strength.score === 5
              ? 'text-green-600'
              : strength.score === 4
              ? 'text-blue-600'
              : strength.score === 3
              ? 'text-yellow-600'
              : strength.score >= 1
              ? 'text-orange-600'
              : 'text-red-600'
          }`}
        >
          {strength.label}
        </span>
      </div>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 rounded-full transition-colors ${
              level <= strength.score ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <div className="text-xs space-y-1 mt-2">
        <div
          className={`flex items-center ${
            strength.checks.length ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          <span className="mr-2">{strength.checks.length ? '✓' : '○'}</span>
          At least 8 characters
        </div>
        <div
          className={`flex items-center ${
            strength.checks.uppercase ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          <span className="mr-2">{strength.checks.uppercase ? '✓' : '○'}</span>
          One uppercase letter
        </div>
        <div
          className={`flex items-center ${
            strength.checks.lowercase ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          <span className="mr-2">{strength.checks.lowercase ? '✓' : '○'}</span>
          One lowercase letter
        </div>
        <div
          className={`flex items-center ${
            strength.checks.number ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          <span className="mr-2">{strength.checks.number ? '✓' : '○'}</span>
          One number
        </div>
        <div
          className={`flex items-center ${
            strength.checks.special ? 'text-green-600' : 'text-gray-500'
          }`}
        >
          <span className="mr-2">{strength.checks.special ? '✓' : '○'}</span>
          One special character
        </div>
      </div>
    </div>
  );
};

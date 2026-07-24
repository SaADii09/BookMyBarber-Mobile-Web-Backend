import { View, Text } from 'react-native';
import { COLORS } from '@/constants/design-tokens';

function strengthScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
}

function strengthLabel(score: number): string {
  switch (score) {
    case 0: return 'Weak';
    case 1: return 'Fair';
    case 2: return 'Good';
    case 3: return 'Strong';
    case 4: return 'Very Strong';
    default: return '';
  }
}

function strengthColor(score: number): string {
  switch (score) {
    case 0: return COLORS.destructive;
    case 1: return COLORS.chart5;
    case 2: return COLORS.chart4;
    case 3: return COLORS.chart2;
    case 4: return '#22C55E';
    default: return COLORS.border;
  }
}

export interface PasswordStrengthBarProps {
  password: string;
}

export function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  if (!password) return null;

  const score = strengthScore(password);
  const pct = (score / 4) * 100;
  const color = strengthColor(score);
  const label = strengthLabel(score);

  return (
    <View className="mt-1.5">
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <View
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            borderRadius: 999,
            height: '100%',
          }}
        />
      </View>
      <Text style={{ color }} className="mt-0.5 font-body text-xs font-medium">
        {label}
      </Text>
    </View>
  );
}

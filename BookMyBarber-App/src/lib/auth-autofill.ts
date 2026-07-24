import { Platform } from 'react-native';
import type { TextInputProps } from 'react-native';

/**
 * Auth TextInput autofill presets for iOS Keychain + Google Password Manager.
 *
 * Expo 55 / RN docs: prefer one of autoComplete vs textContentType — when both
 * are set on iOS, textContentType wins. Use Platform.select so Android gets
 * AutofillHints (email, password) and iOS gets textContentType.
 *
 * Login uses email + password (not username + current-password) — matches the
 * hints that worked before the overlay→native-stack migration and Android's
 * native AutofillHint values.
 */

type AutofillProps = Pick<
  TextInputProps,
  | 'autoComplete'
  | 'textContentType'
  | 'importantForAutofill'
  | 'autoCorrect'
  | 'spellCheck'
  | 'autoCapitalize'
  | 'keyboardType'
  | 'accessibilityLabel'
>;

const baseOff = {
  importantForAutofill: 'yes' as const,
  autoCorrect: false as const,
  spellCheck: false as const,
};

/** Login / signup account email. */
export const authEmailProps = {
  ...baseOff,
  autoCapitalize: 'none',
  keyboardType: 'email-address',
  accessibilityLabel: 'Email address',
  ...Platform.select<Pick<TextInputProps, 'autoComplete' | 'textContentType'>>({
    ios: {
      textContentType: 'emailAddress',
      autoComplete: 'email',
    },
    default: {
      autoComplete: 'email',
    },
  }),
} as const satisfies AutofillProps;

/** Forgot-password email lookup (same hints as login email). */
export const authEmailLookupProps = authEmailProps;

/** Signup full name. */
export const authNameProps = {
  ...baseOff,
  autoCapitalize: 'words',
  accessibilityLabel: 'Full name',
  ...Platform.select<Pick<TextInputProps, 'autoComplete' | 'textContentType'>>({
    ios: {
      textContentType: 'name',
      autoComplete: 'name',
    },
    default: {
      autoComplete: 'name',
    },
  }),
} as const satisfies AutofillProps;

/** Login current password — Android AutofillHint `password` (not current-password). */
export const authCurrentPasswordProps = {
  ...baseOff,
  autoCapitalize: 'none',
  accessibilityLabel: 'Password',
  ...Platform.select<Pick<TextInputProps, 'autoComplete' | 'textContentType'>>({
    ios: {
      textContentType: 'password',
      autoComplete: 'password',
    },
    default: {
      autoComplete: 'password',
    },
  }),
} as const satisfies AutofillProps;

/** Signup / reset new password. */
export const authNewPasswordProps = {
  ...baseOff,
  autoCapitalize: 'none',
  accessibilityLabel: 'New password',
  ...Platform.select<Pick<TextInputProps, 'autoComplete' | 'textContentType'>>({
    ios: {
      textContentType: 'newPassword',
      autoComplete: 'new-password',
    },
    default: {
      autoComplete: 'new-password',
    },
  }),
} as const satisfies AutofillProps;

/** Confirm new password (same hint as new — Apple expects this). */
export const authConfirmPasswordProps = {
  ...authNewPasswordProps,
  accessibilityLabel: 'Confirm new password',
} as const satisfies AutofillProps;

/** Email / reset verification codes. */
export const authOtpProps = {
  ...baseOff,
  accessibilityLabel: 'Verification code',
  ...Platform.select<Pick<TextInputProps, 'autoComplete' | 'textContentType'>>({
    ios: {
      textContentType: 'oneTimeCode',
      autoComplete: 'one-time-code',
    },
    default: {
      autoComplete: 'one-time-code',
    },
  }),
} as const satisfies AutofillProps;

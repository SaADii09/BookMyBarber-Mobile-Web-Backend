import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { InteractionManager, Platform } from 'react-native';

/**
 * Remount Android auth TextInputs after native-stack focus so Autofill's
 * AssistStructure includes ReactEditText nodes.
 *
 * Workaround for react-native-screens#3130 (Expo 55 / RN 0.83 / screens 4.23):
 * fields under createNativeStackNavigator often report "Contents can't be
 * autofilled" until background/foreground. Bumping a key after interactions
 * rebuilds the autofill tree without clearing React state values.
 *
 * iOS: always returns 0 (no remount).
 */
export function useAndroidAutofillRemountKey(): number {
  const [key, setKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const task = InteractionManager.runAfterInteractions(() => {
        setKey((current) => current + 1);
      });

      return () => task.cancel();
    }, [])
  );

  return key;
}

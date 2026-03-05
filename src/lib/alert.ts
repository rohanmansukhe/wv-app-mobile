import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert. Alert.alert onPress callbacks don't fire on web,
 * so we use window.confirm for web.
 */
export function confirmAlert(
  title: string,
  message?: string,
  options?: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }>
) {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm([title, message].filter(Boolean).join('\n\n'));
    if (confirmed) {
      const confirmOption = options?.find((o) => o.style !== 'cancel');
      confirmOption?.onPress?.();
    } else {
      const cancelOption = options?.find((o) => o.style === 'cancel');
      cancelOption?.onPress?.();
    }
  } else {
    Alert.alert(title, message, options);
  }
}

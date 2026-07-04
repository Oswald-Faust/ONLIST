import React, { forwardRef } from 'react';
import {
  Alert as NativeAlert,
  Text as NativeText,
  TextInput as NativeTextInput,
  TouchableOpacity as NativeTouchableOpacity,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { translateLiteral, translateNode } from './runtime';

export const Text = forwardRef(function LocalizedText({ children, accessibilityLabel, accessibilityHint, ...props }, ref) {
  const { language } = useLanguage();
  return (
    <NativeText
      ref={ref}
      accessibilityLabel={translateLiteral(accessibilityLabel, language)}
      accessibilityHint={translateLiteral(accessibilityHint, language)}
      {...props}
    >
      {translateNode(children, language)}
    </NativeText>
  );
});

export const TextInput = forwardRef(function LocalizedTextInput(
  { placeholder, accessibilityLabel, accessibilityHint, ...props },
  ref,
) {
  const { language } = useLanguage();
  return (
    <NativeTextInput
      ref={ref}
      placeholder={translateLiteral(placeholder, language)}
      accessibilityLabel={translateLiteral(accessibilityLabel, language)}
      accessibilityHint={translateLiteral(accessibilityHint, language)}
      {...props}
    />
  );
});

export const TouchableOpacity = forwardRef(function LocalizedTouchableOpacity(
  { accessibilityLabel, accessibilityHint, ...props },
  ref,
) {
  const { language } = useLanguage();
  return (
    <NativeTouchableOpacity
      ref={ref}
      accessibilityLabel={translateLiteral(accessibilityLabel, language)}
      accessibilityHint={translateLiteral(accessibilityHint, language)}
      {...props}
    />
  );
});

export const Alert = {
  ...NativeAlert,
  alert(title, message, buttons, options) {
    NativeAlert.alert(
      translateLiteral(title),
      translateLiteral(message),
      buttons?.map((button) => ({
        ...button,
        text: translateLiteral(button.text),
      })),
      options,
    );
  },
};

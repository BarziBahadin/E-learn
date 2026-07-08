import { Children, type ReactNode } from 'react';
import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';
import { useI18n } from './I18nProvider';

function translateChildren(children: ReactNode, translate: (source: string) => string): ReactNode {
  return Children.map(children, (child) => typeof child === 'string' ? translate(child) : child);
}

export function Text({ children, style, ...props }: TextProps) {
  const { direction, language, translate } = useI18n();
  const flattenedStyle = StyleSheet.flatten(style) ?? {};
  const numericWeight = Number(flattenedStyle.fontWeight ?? 400);
  const fontFamily = numericWeight >= 800
    ? 'NotoSansArabic_800ExtraBold'
    : numericWeight >= 700
      ? 'NotoSansArabic_700Bold'
      : numericWeight >= 600
        ? 'NotoSansArabic_600SemiBold'
        : 'NotoSansArabic_400Regular';
  const kurdishTypography = language === 'ckb' ? {
    fontFamily,
    lineHeight: flattenedStyle.fontSize ? Math.max(flattenedStyle.lineHeight ?? 0, flattenedStyle.fontSize * 1.55) : undefined,
  } : undefined;
  return (
    <NativeText
      {...props}
      {...({ lang: language === 'ckb' ? 'ckb-IQ' : 'en' } as object)}
      style={[{ writingDirection: direction }, style, kurdishTypography]}
    >
      {translateChildren(children, translate)}
    </NativeText>
  );
}

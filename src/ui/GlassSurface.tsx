import type { PropsWithChildren } from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

export type GlassSurfaceProps = PropsWithChildren<{
  fallbackStyle?: StyleProp<ViewStyle>;
  glassStyle?: StyleProp<ViewStyle>;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
}> & Omit<ViewProps, 'style'>;

export function GlassSurface({
  children,
  fallbackStyle,
  glassStyle: _glassStyle,
  interactive: _interactive,
  style,
  tintColor: _tintColor,
  ...viewProps
}: GlassSurfaceProps) {
  return (
    <View {...viewProps} style={[styles.fallback, fallbackStyle, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderColor: 'rgba(128, 142, 151, 0.22)',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

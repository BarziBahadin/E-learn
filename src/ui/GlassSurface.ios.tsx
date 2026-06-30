import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import { StyleSheet, View } from 'react-native';
import type { GlassSurfaceProps } from './GlassSurface';

export function GlassSurface({
  children,
  fallbackStyle,
  glassStyle,
  interactive = false,
  style,
  tintColor,
  ...viewProps
}: GlassSurfaceProps) {
  const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

  if (!glassAvailable) {
    return (
      <View {...viewProps} style={[styles.fallback, fallbackStyle, style]}>
        {children}
      </View>
    );
  }

  return (
    <GlassView
      {...viewProps}
      glassEffectStyle="regular"
      isInteractive={interactive}
      style={[style, glassStyle]}
      tintColor={tintColor}
    >
      {children}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(249, 249, 249, 0.92)',
    borderColor: 'rgba(128, 128, 128, 0.24)',
    borderWidth: StyleSheet.hairlineWidth,
  },
});

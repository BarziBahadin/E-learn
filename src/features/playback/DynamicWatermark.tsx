import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  type LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  watermarkDelayMs,
  watermarkPosition,
  type PlaybackWatermark,
} from './watermark';

type Size = { height: number; width: number };

type DynamicWatermarkProps = {
  watermark: PlaybackWatermark;
};

export function DynamicWatermark({ watermark }: DynamicWatermarkProps) {
  const translation = useRef(new Animated.ValueXY()).current;
  const step = useRef(0);
  const [containerSize, setContainerSize] = useState<Size>({ height: 0, width: 0 });
  const [labelSize, setLabelSize] = useState<Size>({ height: 0, width: 0 });

  useEffect(() => {
    if (!containerSize.width || !containerSize.height || !labelSize.width || !labelSize.height) {
      return;
    }

    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const targetForStep = (currentStep: number) => {
      const normalized = watermarkPosition(watermark.trace_code, currentStep);
      const availableWidth = Math.max(0, containerSize.width - labelSize.width - 24);
      const availableHeight = Math.max(0, containerSize.height - labelSize.height - 24);

      return {
        x: 12 + (availableWidth * normalized.x),
        y: 12 + (availableHeight * normalized.y),
      };
    };

    step.current = 0;
    translation.setValue(targetForStep(0));

    const scheduleMove = () => {
      const delay = watermarkDelayMs(watermark.trace_code, step.current);
      timeout = setTimeout(() => {
        if (cancelled) return;
        step.current += 1;
        Animated.timing(translation, {
          duration: 1_200,
          toValue: targetForStep(step.current),
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished && !cancelled) scheduleMove();
        });
      }, delay);
    };

    scheduleMove();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      translation.stopAnimation();
    };
  }, [containerSize, labelSize, translation, watermark.session_id, watermark.trace_code]);

  const recordContainerSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setContainerSize({ height, width });
  };

  const recordLabelSize = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setLabelSize({ height, width });
  };

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={recordContainerSize}
      pointerEvents="none"
      style={styles.layer}
    >
      <Animated.View
        onLayout={recordLabelSize}
        style={[styles.label, { transform: translation.getTranslateTransform() }]}
      >
        <Text numberOfLines={1} style={styles.text}>
          {watermark.display_text} · {watermark.trace_code}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 4,
    left: 0,
    maxWidth: '72%',
    paddingHorizontal: 7,
    paddingVertical: 4,
    position: 'absolute',
    top: 0,
  },
  layer: {
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  text: {
    color: 'rgba(255, 255, 255, 0.58)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
});

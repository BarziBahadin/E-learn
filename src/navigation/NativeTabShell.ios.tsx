import { useMemo } from 'react';
import TabView from 'react-native-bottom-tabs';
import { View } from 'react-native';
import type { NativeTabShellProps } from './NativeTabShell';

export function NativeTabShell({
  activeKey,
  children,
  disabled = false,
  onSelect,
  routes,
}: NativeTabShellProps) {
  const nativeRoutes = useMemo(
    () => routes.map((route) => ({
      focusedIcon: { sfSymbol: route.sfSymbol },
      key: route.key,
      title: route.title,
    })),
    [routes],
  );
  const activeIndex = Math.max(0, nativeRoutes.findIndex((route) => route.key === activeKey));

  if (disabled) return <>{children}</>;

  return (
    <TabView
      hapticFeedbackEnabled
      labeled
      minimizeBehavior="onScrollDown"
      navigationState={{ index: activeIndex, routes: nativeRoutes }}
      onIndexChange={(index) => {
        const route = nativeRoutes[index];
        if (route) onSelect(route.key);
      }}
      renderScene={({ route }) => route.key === activeKey ? children : <View />}
      scrollEdgeAppearance="transparent"
      translucent
    />
  );
}

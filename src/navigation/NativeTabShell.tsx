import type { ReactNode } from 'react';
import type { AppleIcon } from 'react-native-bottom-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassSurface } from '../ui/GlassSurface';

export type NativeTabRoute = {
  icon: ReactNode;
  key: string;
  sfSymbol: AppleIcon['sfSymbol'];
  title: string;
};

export type NativeTabShellProps = {
  activeKey: string;
  children: ReactNode;
  disabled?: boolean;
  onSelect: (key: string) => void;
  routes: NativeTabRoute[];
};

export function NativeTabShell({
  activeKey,
  children,
  disabled = false,
  onSelect,
  routes,
}: NativeTabShellProps) {
  if (disabled) return <>{children}</>;

  return (
    <View style={styles.shell}>
      <View style={styles.content}>{children}</View>
      <View style={styles.dock}>
        <GlassSurface fallbackStyle={styles.tabBarFallback} style={styles.tabBar}>
          {routes.map((route) => {
            const active = route.key === activeKey;
            return (
              <Pressable
                accessibilityLabel={`${route.title} section`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={route.key}
                onPress={() => onSelect(route.key)}
                style={({ pressed }) => [styles.item, pressed && styles.pressed]}
              >
                <View style={[styles.icon, active && styles.iconActive]}>{route.icon}</View>
                <Text numberOfLines={1} style={[styles.label, active && styles.labelActive]}>{route.title}</Text>
              </Pressable>
            );
          })}
        </GlassSurface>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
  dock: { alignItems: 'center', paddingHorizontal: 12, paddingTop: 8 },
  icon: { alignItems: 'center', borderRadius: 18, height: 32, justifyContent: 'center', width: 52 },
  iconActive: { backgroundColor: 'rgba(25, 113, 79, 0.12)' },
  item: { alignItems: 'center', flex: 1, gap: 2, justifyContent: 'center', minHeight: 58, minWidth: 54, paddingHorizontal: 3 },
  label: { color: '#65736e', fontSize: 9, fontWeight: '700' },
  labelActive: { color: '#10533a', fontWeight: '800' },
  pressed: { transform: [{ scale: 0.97 }] },
  shell: { flex: 1 },
  tabBar: { borderRadius: 22, flexDirection: 'row', maxWidth: 720, overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 4, width: '100%' },
  tabBarFallback: { backgroundColor: 'rgba(247, 250, 248, 0.94)' },
});

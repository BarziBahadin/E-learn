import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { ProductionAppShell } from './src/app/ProductionAppShell';
import DemoApp from '@e-lern/demo-app';

const demoModeEnabled =
  process.env.EXPO_PUBLIC_APP_MODE === 'demo' &&
  process.env.EXPO_PUBLIC_ENABLE_DEMO_APP === 'true';

function AppExperience() {
  if (!demoModeEnabled) return <ProductionAppShell />;

  return <DemoApp />;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansArabic_400Regular: require('@expo-google-fonts/noto-sans-arabic/400Regular/NotoSansArabic_400Regular.ttf'),
    NotoSansArabic_600SemiBold: require('@expo-google-fonts/noto-sans-arabic/600SemiBold/NotoSansArabic_600SemiBold.ttf'),
    NotoSansArabic_700Bold: require('@expo-google-fonts/noto-sans-arabic/700Bold/NotoSansArabic_700Bold.ttf'),
    NotoSansArabic_800ExtraBold: require('@expo-google-fonts/noto-sans-arabic/800ExtraBold/NotoSansArabic_800ExtraBold.ttf'),
  });
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar hidden={false} style="dark" />
      <AppExperience />
    </SafeAreaProvider>
  );
}

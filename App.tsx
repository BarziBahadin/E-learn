import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import PrototypeApp from './src/prototype/PrototypeApp';

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <PrototypeApp />
    </SafeAreaProvider>
  );
}

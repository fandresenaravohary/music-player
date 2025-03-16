import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';
import TabsNavigator from './TabNavigator';
import { AudioProvider } from './context/AudioContext';

export default function Layout() {
  return (
    <AudioProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
        <StatusBar style="dark" />
        <TabsNavigator />
      </SafeAreaView>
    </AudioProvider>
  );
}

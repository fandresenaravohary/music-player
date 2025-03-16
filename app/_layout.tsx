import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';
import TabsNavigator from './TabNavigator';

export default function Layout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
      <StatusBar style="dark" />
      <TabsNavigator />
    </SafeAreaView>
  );
}

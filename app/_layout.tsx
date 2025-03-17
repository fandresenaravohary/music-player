import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import TabsNavigator from "./TabNavigator";
import { AudioProvider } from "./context/AudioContext";
import FavoritesProvider from "./context/FavoritesContext";

export default function Layout() {
  return (
    <AudioProvider>
      <FavoritesProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: "black" }}>
          <StatusBar style="dark" />
          <TabsNavigator />
        </SafeAreaView>
      </FavoritesProvider>
    </AudioProvider>
  );
}

import React from 'react';
import { View, Text, SafeAreaView } from 'react-native';
import TabsNavigator from './TabNavigator';

export default function Layout() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Vous pouvez ajouter ici des éléments globaux comme une barre de titre, etc. */}
      <TabsNavigator />
    </SafeAreaView>
  );
}

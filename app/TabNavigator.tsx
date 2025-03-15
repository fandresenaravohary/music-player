import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import SongsScreen from './(tabs)/songs/index';
import PlaylistsScreen from './(tabs)/playlists/index';
import FavoritesScreen from './(tabs)/favorites/index';
import ArtistsScreen from './(tabs)/artists/index';

const Tab = createBottomTabNavigator();

export default function TabsNavigator() {
  return (
      <Tab.Navigator>
        <Tab.Screen name="Songs" component={SongsScreen} />
        <Tab.Screen name="Playlists" component={PlaylistsScreen} />
        <Tab.Screen name="Favorites" component={FavoritesScreen} />
        <Tab.Screen name="Artists" component={ArtistsScreen} />
      </Tab.Navigator>
  );
}

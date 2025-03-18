import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFavorites } from "@/app/context/FavoritesContext";

export default function FavoritesScreen() {
  const { favorites, removeFavorite } = useFavorites();

  if (favorites.length === 0) {
    return <Text style={styles.emptyText}>Aucun favori ajouté.</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.songContainer}>
            {(item as any).artwork ? (
              <Image
                source={{ uri: (item as any).artwork }}
                style={styles.songImage}
              />
            ) : (
              <View style={styles.songImagePlaceholder} />
            )}
            <Text style={styles.songText}>{item.filename}</Text>
            <TouchableOpacity onPress={() => removeFavorite(item.id)}>
              <Ionicons name="trash" size={24} color="red" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: "#f5f5f5" },
  emptyText: { fontSize: 18, textAlign: "center", marginTop: 20, color: "#555" },
  songContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
  },
  songImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#d3d3d3",
  },
  songText: { fontSize: 16, color: "#333", flex: 1 },
});

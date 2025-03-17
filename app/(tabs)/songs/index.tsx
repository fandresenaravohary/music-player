import React, { useEffect, useState } from "react";
import {
  FlatList,
  View,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform,
} from "react-native";
import * as MusicLibrary from "expo-music-library";
import { Ionicons } from "@expo/vector-icons";
import { useAudio } from "@/app/context/AudioContext";
import { useFavorites } from "@/app/context/FavoritesContext";

export default function SongsScreen() {
  const [songs, setSongs] = useState<MusicLibrary.Asset[]>([]);
  const [filteredSongs, setFilteredSongs] = useState<MusicLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [nextPage, setNextPage] = useState<string | undefined>(undefined);
  const [isReloading, setIsReloading] = useState(false);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    isPlaying,
    currentSong,
    playSong,
    pauseSong,
    resumeSong,
    stopSong,
    playNextSong,
    playPreviousSong,
  } = useAudio();

  const { addFavorite, removeFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    const setupAudio = async () => {
      try {
        const { status } = await MusicLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission refusée",
            "Vous devez accepter la permission pour accéder aux chansons locales."
          );
        } else {
          await loadSongs();
        }
      } catch (error) {
        console.error("Erreur lors de la configuration audio", error);
      }
    };

    setupAudio();
  }, []);

  useEffect(() => {
    // Mise à jour de la liste filtrée en fonction de la recherche
    if (searchQuery.trim() === "") {
      setFilteredSongs(songs);
    } else {
      setFilteredSongs(
        songs.filter((song) =>
          song.filename.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, songs]);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const media = await MusicLibrary.getAssetsAsync({
        first: 50, // Charge 50 éléments par page
        after: nextPage,
      });
      setSongs((prevSongs) => [...prevSongs, ...media.assets]);
      setNextPage(media.hasNextPage ? media.endCursor : undefined);
      setHasNextPage(media.hasNextPage);
      setLoading(false);
    } catch (error) {
      console.error("Erreur lors de la récupération des chansons", error);
      setLoading(false);
    }
  };

  const handlePlaySong = async (index: number) => {
    if (isReloading || isLoadingSong) return;
    setIsLoadingSong(true);
    try {
      await playSong(filteredSongs[index], songs, index);
    } catch (error) {
      console.error("Erreur lors de la lecture de la musique", error);
    } finally {
      setIsLoadingSong(false);
    }
  };

  const openSongMenu = (song: MusicLibrary.Asset) => {
    const favoriteOption = isFavorite(song.id)
      ? {
          text: "Retirer des favoris",
          onPress: () => removeFavorite(song.id),
        }
      : {
          text: "Ajouter aux favoris",
          onPress: () => addFavorite(song),
        };

    Alert.alert(
      "Options",
      song.filename,
      [favoriteOption, { text: "Annuler", style: "cancel" }],
      { cancelable: true }
    );
  };

  const renderSong = ({
    item,
    index,
  }: {
    item: MusicLibrary.Asset;
    index: number;
  }) => (
    <TouchableOpacity
      onPress={() => handlePlaySong(index)}
      disabled={isLoadingSong}
      style={[
        styles.songContainer,
        currentSong?.id === item.id && styles.selectedSongContainer,
      ]}
    >
      <View style={styles.songRow}>
        <Text
          style={[
            styles.songText,
            currentSong?.id === item.id && styles.selectedSongText,
          ]}
          numberOfLines={1}
        >
          {item.filename}
        </Text>
        <TouchableOpacity onPress={() => openSongMenu(item)}>
          <Ionicons name="ellipsis-vertical" size={24} color="#ff5c5c" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <Text style={styles.loadingText}>Chargement...</Text>;
  }

  return (
    <View style={styles.container}>
      {/* Barre de recherche avec icône */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une chanson..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
        />
      </View>

      <FlatList
        data={filteredSongs}
        renderItem={renderSong}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        onEndReached={hasNextPage ? loadSongs : undefined}
        onEndReachedThreshold={0.1}
        contentContainerStyle={styles.listContent}
      />

      {currentSong && (
        <View style={styles.playerControls}>
          <TouchableOpacity onPress={playPreviousSong} style={styles.controlButton}>
            <Ionicons name="play-back" size={24} color="#fff" />
            <Text style={styles.controlButtonText}>Précédent</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={isPlaying ? pauseSong : resumeSong} style={styles.controlButton}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
            <Text style={styles.controlButtonText}>
              {isPlaying ? "Pause" : "Lecture"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={playNextSong} style={styles.controlButton}>
            <Ionicons name="play-forward" size={24} color="#fff" />
            <Text style={styles.controlButtonText}>Suivant</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={stopSong} style={styles.controlButton}>
            <Ionicons name="square" size={24} color="#fff" />
            <Text style={styles.controlButtonText}>Arrêt</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef2f9",
    padding: 15,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ccc",
    // Ombre pour iOS et élévation pour Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  listContent: {
    paddingBottom: 100,
  },
  songContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    // Ombre pour iOS et élévation pour Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  songRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  songText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  selectedSongContainer: {
    backgroundColor: "#dce5ff",
  },
  selectedSongText: {
    color: "#1e90ff",
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 50,
    color: "#555",
  },
  playerControls: {
    position: "absolute",
    bottom: 20,
    left: 15,
    right: 15,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#1e1e1e",
    paddingVertical: 12,
    borderRadius: 30,
    // Ombre pour iOS et élévation pour Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
});


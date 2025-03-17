import React, { useEffect, useState } from "react";
import {
  FlatList,
  View,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { useAudio } from "@/app/context/AudioContext";
import { useFavorites } from "@/app/context/FavoritesContext";

export default function SongsScreen() {
  const [songs, setSongs] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [nextPage, setNextPage] = useState<string | undefined>(undefined);
  const [isReloading, setIsReloading] = useState(false);
  const [isLoadingSong, setIsLoadingSong] = useState(false);

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

  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    const setupAudio = async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
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

    return () => {
      // Cleanup si nécessaire
    };
  }, []);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: 1000,
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
      await playSong(songs[index], songs, index);
    } catch (error) {
      console.error("Erreur lors de la lecture de la musique", error);
    } finally {
      setIsLoadingSong(false);
    }
  };

  const toggleFavorite = (song: MediaLibrary.Asset) => {
    if (isFavorite(song.id)) {
      removeFavorite(song.id);
    } else {
      addFavorite(song);
    }
  };

  const renderSong = ({
    item,
    index,
  }: {
    item: MediaLibrary.Asset;
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
        >
          {item.filename}
        </Text>
        <TouchableOpacity onPress={() => toggleFavorite(item)}>
          <Ionicons
            name={isFavorite(item.id) ? "heart" : "heart-outline"}
            size={24}
            color="red"
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <Text style={styles.loadingText}>Chargement...</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={songs}
        renderItem={renderSong}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        onEndReached={hasNextPage ? loadSongs : undefined}
        onEndReachedThreshold={0.1}
      />

      {currentSong && (
        <View style={styles.playerControls}>
          <TouchableOpacity
            onPress={playPreviousSong}
            style={styles.controlButton}
          >
            <Ionicons name="play-back" size={24} color="#fff" />
            <Text style={styles.controlButtonText}>Précédent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={isPlaying ? pauseSong : resumeSong}
            style={styles.controlButton}
          >
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={24}
              color="#fff"
            />
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
    padding: 10,
    backgroundColor: "#f5f5f5",
  },
  songContainer: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
  },
  songRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedSongContainer: {
    backgroundColor: "#e0e0e0",
  },
  songText: {
    fontSize: 16,
    color: "#333",
  },
  selectedSongText: {
    color: "#007aff",
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 20,
    color: "#555",
  },
  playerControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#333",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
    flexWrap: "wrap",
  },
  controlButton: {
    alignItems: "center",
    marginHorizontal: 8,
    marginVertical: 5,
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
});

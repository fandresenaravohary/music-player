import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  FlatList,
  View,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
} from "react-native";
import * as MusicLibrary from "expo-music-library";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useAudio } from "@/app/context/AudioContext";
import { useFavorites } from "@/app/context/FavoritesContext";

interface SongItemProps {
  song: MusicLibrary.Asset;
  index: number;
  isLoadingSong: boolean;
  currentSong?: MusicLibrary.Asset | null;
  onPlaySong: (index: number) => void;
  onOpenSongMenu: (song: MusicLibrary.Asset) => void;
  styles: any;
}

const SongItem: React.FC<SongItemProps> = React.memo(
  ({ song, index, isLoadingSong, currentSong, onPlaySong, onOpenSongMenu, styles }) => {
    const isSelected = currentSong?.id === song.id;
    return (
      <TouchableOpacity
        onPress={() => onPlaySong(index)}
        disabled={isLoadingSong}
        style={[
          styles.songContainer,
          isSelected && styles.selectedSongContainer,
        ]}
      >
        {song.artwork ? (
          <Image style={styles.songImage} source={{ uri: song.artwork }} />
        ) : (
          <View style={styles.songImagePlaceholder} />
        )}
        <View style={styles.songRow}>
          <Text
            style={[styles.songText, isSelected && styles.selectedSongText]}
            numberOfLines={1}
          >
            {song.filename}
          </Text>
          <TouchableOpacity onPress={() => onOpenSongMenu(song)}>
            <Ionicons name="ellipsis-vertical" size={24} color="#ff5c5c" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }
);

export default function SongsScreen() {
  const [songs, setSongs] = useState<MusicLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [nextPage, setNextPage] = useState<string | undefined>(undefined);
  const [isReloading, setIsReloading] = useState(false);
  const [isLoadingSong, setIsLoadingSong] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [popupVisible, setPopupVisible] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);

  const {
    isPlaying,
    currentSong,
    playSong,
    pauseSong,
    resumeSong,
    stopSong,
    playNextSong,
    playPreviousSong,
    duration,
    currentTime,
    seekTo,
  } = useAudio();

  const { addFavorite, removeFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    const setupAudio = async () => {
      try {
        const { status } = await MusicLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission refusée",
            "Vous devez accepter la permission pour accéder aux chansons."
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

  const filteredSongs = useMemo(() => {
    if (searchQuery.trim() === "") return songs;
    return songs.filter((song) =>
      song.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, songs]);

  useEffect(() => {
    if (duration > 0) {
      setSliderValue(currentTime / duration);
    }
  }, [currentTime, duration]);

  const loadSongs = async () => {
    try {
      if (songs.length === 0) {
        setLoading(true);
      }
      const media = await MusicLibrary.getAssetsAsync({
        first: 50,
        after: nextPage,
      });
      setSongs((prevSongs) => [...prevSongs, ...media.assets]);
      setNextPage(media.hasNextPage ? media.endCursor : undefined);
      setHasNextPage(media.hasNextPage);
    } catch (error) {
      console.error("Erreur lors de la récupération des chansons", error);
    } finally {
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

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const memoizedHandlePlaySong = useCallback((index: number) => {
    handlePlaySong(index);
  }, [filteredSongs, isLoadingSong]);

  const memoizedOpenSongMenu = useCallback((song: MusicLibrary.Asset) => {
    openSongMenu(song);
  }, [isFavorite, addFavorite, removeFavorite]);

  if (songs.length === 0 && loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une chanson..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredSongs}
        renderItem={({ item, index }) => (
          <SongItem
            song={item}
            index={index}
            isLoadingSong={isLoadingSong}
            currentSong={currentSong}
            onPlaySong={memoizedHandlePlaySong}
            onOpenSongMenu={memoizedOpenSongMenu}
            styles={styles}
          />
        )}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        onEndReached={hasNextPage ? loadSongs : undefined}
        onEndReachedThreshold={0.1}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          hasNextPage && loading ? (
            <ActivityIndicator size="small" color="#1e90ff" style={{ marginVertical: 15 }} />
          ) : null
        }
      />

      {currentSong && (
        <TouchableOpacity
          style={styles.popupToggleButton}
          onPress={() => setPopupVisible((prev) => !prev)}
        >
          <Text style={styles.popupToggleButtonText}>
            {popupVisible ? "Réduire" : "Afficher"} le lecteur
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={popupVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPopupVisible(false)}
      >
        <View style={styles.popupContainer}>
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>
              {currentSong ? currentSong.filename : "Aucune chanson"}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={sliderValue}
              minimumTrackTintColor="#1e90ff"
              maximumTrackTintColor="#d3d3d3"
              thumbTintColor="#1e90ff"
              onSlidingComplete={(value) => {
                if (duration) {
                  seekTo(value * duration);
                }
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>{formatTime(currentTime)}</Text>
              <Text>{formatTime(duration)}</Text>
            </View>
            <View style={styles.popupControls}>
              <TouchableOpacity onPress={playPreviousSong} style={styles.popupControlButton}>
                <Ionicons name="play-back" size={24} color="#333" />
                <Text style={styles.popupControlButtonText}>Précédent</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={isPlaying ? pauseSong : resumeSong} style={styles.popupControlButton}>
                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#333" />
                <Text style={styles.popupControlButtonText}>
                  {isPlaying ? "Pause" : "Lecture"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={playNextSong} style={styles.popupControlButton}>
                <Ionicons name="play-forward" size={24} color="#333" />
                <Text style={styles.popupControlButtonText}>Suivant</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={stopSong} style={styles.popupControlButton}>
                <Ionicons name="square" size={24} color="#333" />
                <Text style={styles.popupControlButtonText}>Arrêt</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.closePopupButton}
              onPress={() => setPopupVisible(false)}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  songImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: "#d3d3d3",
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
    marginTop: 15,
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
  popupToggleButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#1e90ff",
    padding: 10,
    borderRadius: 20,
    elevation: 4,
  },
  popupToggleButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  popupContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  popupContent: {
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "relative",
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  popupControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  popupControlButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  popupControlButtonText: {
    color: "#333",
    fontSize: 12,
    marginTop: 4,
  },
  closePopupButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
});

export {};

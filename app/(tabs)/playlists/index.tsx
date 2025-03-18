import React, { useState, useEffect, useCallback, memo, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as MusicLibrary from "expo-music-library";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import CustomPopup from "./CustomPopup";
import { useAudio } from "@/app/context/AudioContext";

interface Playlist {
  id: string;
  name: string;
  songs: MusicLibrary.Asset[];
}

/** Composant pour afficher une chanson dans une playlist */
interface PlaylistSongRowProps {
  song: MusicLibrary.Asset;
  index: number;
  playlist: Playlist;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  playSongFromPlaylist: (playlist: Playlist, songIndex: number) => void;
  styles: any;
}
const PlaylistSongRow: React.FC<PlaylistSongRowProps> = memo(
  ({ song, index, playlist, removeSongFromPlaylist, playSongFromPlaylist, styles }) => {
    return (
      <View style={styles.songRow}>
        <Text style={styles.songName}>{song.filename}</Text>
        <View style={styles.songActions}>
          <TouchableOpacity
            onPress={() => removeSongFromPlaylist(playlist.id, song.id)}
            style={styles.actionButton}
          >
            <Ionicons name="remove-circle" size={20} color="#ff4d4d" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => playSongFromPlaylist(playlist, index)}
            style={styles.actionButton}
          >
            <Ionicons name="play-circle" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
);

/** Composant pour afficher une playlist complète */
interface PlaylistCardProps {
  playlist: Playlist;
  playPlaylist: (playlist: Playlist) => void;
  deletePlaylist: (playlistId: string) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  playSongFromPlaylist: (playlist: Playlist, songIndex: number) => void;
  styles: any;
}
const PlaylistCard: React.FC<PlaylistCardProps> = memo(
  ({
    playlist,
    playPlaylist,
    deletePlaylist,
    removeSongFromPlaylist,
    playSongFromPlaylist,
    styles,
  }) => {
    return (
      <View style={styles.playlistCard}>
        <View style={styles.playlistHeader}>
          <TouchableOpacity
            onPress={() => playPlaylist(playlist)}
            style={styles.playlistTitleContainer}
          >
            <Text style={styles.playlistTitle}>{playlist.name}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deletePlaylist(playlist.id)} style={styles.deleteButton}>
            <Ionicons name="trash" size={22} color="#ff4d4d" />
          </TouchableOpacity>
        </View>
        {playlist.songs.length > 0 && (
          <FlatList
            data={playlist.songs}
            renderItem={({ item, index }) => (
              <PlaylistSongRow
                song={item}
                index={index}
                playlist={playlist}
                removeSongFromPlaylist={removeSongFromPlaylist}
                playSongFromPlaylist={playSongFromPlaylist}
                styles={styles}
              />
            )}
            keyExtractor={(song, index) => `song-${song.id}-${index}`}
          />
        )}
      </View>
    );
  }
);

/** Composant pour afficher une chanson dans la liste globale (pour ajout) */
interface SongListItemProps {
  song: MusicLibrary.Asset;
  selected: boolean;
  toggleSongSelection: (song: MusicLibrary.Asset) => void;
  styles: any;
}
const SongListItem: React.FC<SongListItemProps> = memo(
  ({ song, selected, toggleSongSelection, styles }) => {
    return (
      <View style={styles.songCard}>
        <Text style={styles.songCardText}>{song.filename}</Text>
        <TouchableOpacity onPress={() => toggleSongSelection(song)} style={styles.addButton}>
          <Ionicons
            name={selected ? "checkmark-circle" : "add-circle"}
            size={24}
            color="#2196F3"
          />
        </TouchableOpacity>
      </View>
    );
  }
);

export default function PlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [songs, setSongs] = useState<MusicLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSongs, setSelectedSongs] = useState<MusicLibrary.Asset[]>([]);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [showSongList, setShowSongList] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [nextPage, setNextPage] = useState<string | undefined>(undefined);

  // États pour le lecteur audio
  const [playerPopupVisible, setPlayerPopupVisible] = useState(false);
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

  // Chargement paginé des chansons
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

  const loadPlaylists = async () => {
    try {
      const savedPlaylists = await AsyncStorage.getItem("playlists");
      if (savedPlaylists) {
        setPlaylists(JSON.parse(savedPlaylists));
      }
    } catch (error) {
      console.error("Erreur lors du chargement des playlists", error);
    }
  };

  const savePlaylists = async (updatedPlaylists: Playlist[]) => {
    try {
      await AsyncStorage.setItem("playlists", JSON.stringify(updatedPlaylists));
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des playlists", error);
    }
  };

  const createPlaylist = () => {
    if (!playlistName) {
      Alert.alert("Nom manquant", "Veuillez entrer un nom pour la playlist");
      return;
    }
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}`,
      name: playlistName,
      songs: [],
    };
    const updatedPlaylists = [...playlists, newPlaylist];
    setPlaylists(updatedPlaylists);
    savePlaylists(updatedPlaylists);
    setPlaylistName("");
  };

  const deletePlaylist = (playlistId: string) => {
    Alert.alert(
      "Supprimer la playlist",
      "Voulez-vous vraiment supprimer cette playlist ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            const updatedPlaylists = playlists.filter((p) => p.id !== playlistId);
            setPlaylists(updatedPlaylists);
            savePlaylists(updatedPlaylists);
          },
        },
      ]
    );
  };

  const addSongToPlaylist = (playlistId: string, song: MusicLibrary.Asset) => {
    setPlaylists((prevPlaylists) => {
      const updatedPlaylists = prevPlaylists.map((playlist) => {
        if (playlist.id === playlistId) {
          if (playlist.songs.some((existingSong) => existingSong.id === song.id)) {
            Alert.alert(
              "Chanson déjà ajoutée",
              "Cette chanson est déjà présente dans la playlist."
            );
            return playlist;
          }
          return { ...playlist, songs: [...playlist.songs, song] };
        }
        return playlist;
      });
      savePlaylists(updatedPlaylists);
      return updatedPlaylists;
    });
  };

  const removeSongFromPlaylist = (playlistId: string, songId: string) => {
    setPlaylists((prevPlaylists) => {
      const updatedPlaylists = prevPlaylists.map((playlist) => {
        if (playlist.id === playlistId) {
          return { ...playlist, songs: playlist.songs.filter((song) => song.id !== songId) };
        }
        return playlist;
      });
      savePlaylists(updatedPlaylists);
      return updatedPlaylists;
    });
  };

  const playPlaylist = async (playlist: Playlist) => {
    if (playlist.songs.length > 0) {
      await playSong(playlist.songs[0], playlist.songs, 0);
    }
  };

  const playSongFromPlaylist = async (playlist: Playlist, songIndex: number) => {
    if (playlist.songs.length > 0) {
      await playSong(playlist.songs[songIndex], playlist.songs, songIndex);
    }
  };

  const toggleSongSelection = (song: MusicLibrary.Asset) => {
    setSelectedSongs((prevSelected) =>
      prevSelected.some((s) => s.id === song.id)
        ? prevSelected.filter((s) => s.id !== song.id)
        : [...prevSelected, song]
    );
  };

  const handleSelectPlaylist = (index: number) => {
    const selectedPlaylist = playlists[index];
    const duplicateSongs = selectedSongs.filter((song) =>
      selectedPlaylist.songs.some((existingSong) => existingSong.id === song.id)
    );
    if (duplicateSongs.length > 0) {
      Alert.alert(
        "Doublon détecté",
        "Une ou plusieurs chansons sélectionnées sont déjà présentes dans la playlist. L'ajout est impossible."
      );
      return;
    }
    setPlaylists((prevPlaylists) => {
      const updatedPlaylists = prevPlaylists.map((playlist) => {
        if (playlist.id === selectedPlaylist.id) {
          return { ...playlist, songs: [...playlist.songs, ...selectedSongs] };
        }
        return playlist;
      });
      savePlaylists(updatedPlaylists);
      return updatedPlaylists;
    });
    setIsPopupVisible(false);
    setSelectedSongs([]);
  };

  const handleCancelPopup = () => {
    setIsPopupVisible(false);
    setSelectedSongs([]);
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  useEffect(() => {
    if (duration > 0) {
      setSliderValue(currentTime / duration);
    }
  }, [currentTime, duration]);

  useEffect(() => {
    loadSongs();
    loadPlaylists();
  }, []);

  // Mémorisation des callbacks pour éviter des recréations inutiles
  const memoizedToggleSongSelection = useCallback(toggleSongSelection, [selectedSongs]);
  const memoizedPlayPlaylist = useCallback(playPlaylist, []);
  const memoizedDeletePlaylist = useCallback(deletePlaylist, [playlists]);
  const memoizedRemoveSongFromPlaylist = useCallback(removeSongFromPlaylist, [playlists]);
  const memoizedPlaySongFromPlaylist = useCallback(playSongFromPlaylist, [playlists]);

  if (loading && songs.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
        <Text style={styles.loadingText}>Chargement des chansons...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mes Playlists</Text>
      <View style={styles.inputContainer}>
        <TextInput
          value={playlistName}
          onChangeText={setPlaylistName}
          placeholder="Nom de la playlist"
          placeholderTextColor="#999"
          style={styles.input}
        />
        <TouchableOpacity onPress={createPlaylist} style={styles.createButton}>
          <Text style={styles.createButtonText}>Créer</Text>
        </TouchableOpacity>
      </View>
      {playlists.length > 0 ? (
        <FlatList
          data={playlists}
          renderItem={({ item }) => (
            <PlaylistCard
              playlist={item}
              playPlaylist={memoizedPlayPlaylist}
              deletePlaylist={memoizedDeletePlaylist}
              removeSongFromPlaylist={memoizedRemoveSongFromPlaylist}
              playSongFromPlaylist={memoizedPlaySongFromPlaylist}
              styles={styles}
            />
          )}
          keyExtractor={(item, index) => `playlist-${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <Text style={styles.emptyText}>Aucune playlist créée.</Text>
      )}

      <View style={styles.sectionHeader}>
        <TouchableOpacity
          onPress={() => setShowSongList(!showSongList)}
          style={styles.toggleButton}
        >
          <Ionicons name={showSongList ? "remove" : "add"} size={30} color="#fff" />
        </TouchableOpacity>
      </View>
      {selectedSongs.length > 0 && (
        <TouchableOpacity
          onPress={() => setIsPopupVisible(true)}
          style={styles.addSelectedButton}
        >
          <Text style={styles.addSelectedButtonText}>Ajouter les chansons sélectionnées</Text>
        </TouchableOpacity>
      )}
      {showSongList && (
        <FlatList
          data={songs}
          renderItem={({ item }) => (
            <SongListItem
              song={item}
              selected={selectedSongs.some((s) => s.id === item.id)}
              toggleSongSelection={memoizedToggleSongSelection}
              styles={styles}
            />
          )}
          keyExtractor={(item, index) => `song-${item.id}-${index}`}
          contentContainerStyle={styles.songList}
          onEndReached={hasNextPage ? loadSongs : undefined}
          onEndReachedThreshold={0.1}
        />
      )}

      {/* Lecteur audio dans PlaylistsScreen */}
      {currentSong && (
        <>
          <TouchableOpacity
            style={styles.popupToggleButton}
            onPress={() => setPlayerPopupVisible((prev) => !prev)}
          >
            <Text style={styles.popupToggleButtonText}>
              {playerPopupVisible ? "Réduire" : "Afficher"} le lecteur
            </Text>
          </TouchableOpacity>
          <Modal
            visible={playerPopupVisible}
            animationType="slide"
            transparent
            onRequestClose={() => setPlayerPopupVisible(false)}
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
                  onPress={() => setPlayerPopupVisible(false)}
                >
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* Contrôles du lecteur en mode compact */}
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

      <CustomPopup
        visible={isPopupVisible}
        options={playlists.map((playlist) => playlist.name)}
        onSelect={handleSelectPlaylist}
        onCancel={handleCancelPopup}
      />
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
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 15,
    color: "#333",
    textAlign: "center",
  },
  inputContainer: {
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
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  createButton: {
    marginLeft: 10,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  playlistCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  playlistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  playlistTitleContainer: {
    flex: 1,
  },
  playlistTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  deleteButton: {
    marginLeft: 10,
  },
  listContent: {
    paddingBottom: 100,
  },
  songRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  songName: {
    fontSize: 16,
    color: "#555",
    flex: 1,
  },
  songActions: {
    flexDirection: "row",
  },
  actionButton: {
    marginLeft: 10,
  },
  emptyText: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
    marginVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginVertical: 15,
  },
  toggleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2196F3",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  songList: {
    paddingBottom: 20,
  },
  songCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  songCardText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  addButton: {
    marginLeft: 10,
  },
  addSelectedButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  addSelectedButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  loadingText: {
    fontSize: 18,
    color: "#555",
    textAlign: "center",
    marginTop: 30,
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

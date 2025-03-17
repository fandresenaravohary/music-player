import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import * as MusicLibrary from "expo-music-library";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import CustomPopup from "./CustomPopup";
import { useAudio } from "@/app/context/AudioContext";

interface Playlist {
  id: string;
  name: string;
  songs: MusicLibrary.Asset[];
}

export default function PlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistName, setPlaylistName] = useState("");
  const [songs, setSongs] = useState<MusicLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  // Tableau pour plusieurs chansons sélectionnées
  const [selectedSongs, setSelectedSongs] = useState<MusicLibrary.Asset[]>([]);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [showSongList, setShowSongList] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [nextPage, setNextPage] = useState<string | undefined>(undefined);

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

  // Chargement paginé des chansons (50 par appel)
  const loadSongs = async () => {
    try {
      setLoading(true);
      const media = await MusicLibrary.getAssetsAsync({
        first: 50,
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

  const savePlaylists = async (playlists: Playlist[]) => {
    try {
      await AsyncStorage.setItem("playlists", JSON.stringify(playlists));
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
            const updatedPlaylists = playlists.filter(
              (p) => p.id !== playlistId
            );
            setPlaylists(updatedPlaylists);
            savePlaylists(updatedPlaylists);
          },
        },
      ]
    );
  };

  // Mise à jour fonctionnelle pour éviter les problèmes d'état asynchrone
  const addSongToPlaylist = (playlistId: string, song: MusicLibrary.Asset) => {
    setPlaylists((prevPlaylists) => {
      const updatedPlaylists = prevPlaylists.map((playlist) => {
        if (playlist.id === playlistId) {
          if (
            playlist.songs.some((existingSong) => existingSong.id === song.id)
          ) {
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
          return {
            ...playlist,
            songs: playlist.songs.filter((song) => song.id !== songId),
          };
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

  const playSongFromPlaylist = async (
    playlist: Playlist,
    songIndex: number
  ) => {
    if (playlist.songs.length > 0) {
      await playSong(playlist.songs[songIndex], playlist.songs, songIndex);
    }
  };

  // Bascule la sélection d'une chanson
  const toggleSongSelection = (song: MusicLibrary.Asset) => {
    if (selectedSongs.some((s) => s.id === song.id)) {
      setSelectedSongs(selectedSongs.filter((s) => s.id !== song.id));
    } else {
      setSelectedSongs([...selectedSongs, song]);
    }
  };

  // Ajoute toutes les chansons sélectionnées à la playlist choisie en une seule opération
  const handleSelectPlaylist = (index: number) => {
    const selectedPlaylist = playlists[index];
    setPlaylists((prevPlaylists) => {
      const updatedPlaylists = prevPlaylists.map((playlist) => {
        if (playlist.id === selectedPlaylist.id) {
          const newSongs = selectedSongs.filter(
            (song) =>
              !playlist.songs.some(
                (existingSong) => existingSong.id === song.id
              )
          );
          return { ...playlist, songs: [...playlist.songs, ...newSongs] };
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

  useEffect(() => {
    loadSongs();
    loadPlaylists();
  }, []);

  if (loading) {
    return <Text style={styles.loadingText}>Chargement des chansons...</Text>;
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
            <View style={styles.playlistCard}>
              <View style={styles.playlistHeader}>
                <TouchableOpacity
                  onPress={() => playPlaylist(item)}
                  style={styles.playlistTitleContainer}
                >
                  <Text style={styles.playlistTitle}>{item.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deletePlaylist(item.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={22} color="#ff4d4d" />
                </TouchableOpacity>
              </View>
              {item.songs.length > 0 && (
                <FlatList
                  data={item.songs}
                  renderItem={({ item: song, index }) => (
                    <View style={styles.songRow}>
                      <Text style={styles.songName}>{song.filename}</Text>
                      <View style={styles.songActions}>
                        <TouchableOpacity
                          onPress={() =>
                            removeSongFromPlaylist(item.id, song.id)
                          }
                          style={styles.actionButton}
                        >
                          <Ionicons
                            name="remove-circle"
                            size={20}
                            color="#ff4d4d"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => playSongFromPlaylist(item, index)}
                          style={styles.actionButton}
                        >
                          <Ionicons
                            name="play-circle"
                            size={20}
                            color="#4CAF50"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                  keyExtractor={(song, index) => `song-${song.id}-${index}`}
                />
              )}
            </View>
          )}
          keyExtractor={(item, index) => `playlist-${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <Text style={styles.emptyText}>Aucune playlist créée.</Text>
      )}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          Ajouter des chansons aux playlists :
        </Text>
        <TouchableOpacity
          onPress={() => setShowSongList(!showSongList)}
          style={styles.toggleButton}
        >
          <Ionicons
            name={showSongList ? "chevron-up" : "chevron-down"}
            size={24}
            color="#2196F3"
          />
        </TouchableOpacity>
      </View>
      {showSongList && (
        <>
          {selectedSongs.length > 0 && (
            <TouchableOpacity
              onPress={() => setIsPopupVisible(true)}
              style={styles.addSelectedButton}
            >
              <Text style={styles.addSelectedButtonText}>
                Ajouter les chansons sélectionnées
              </Text>
            </TouchableOpacity>
          )}
          <FlatList
            data={songs}
            renderItem={({ item }) => (
              <View style={styles.songCard}>
                <Text style={styles.songCardText}>{item.filename}</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (playlists.length === 0) {
                      Alert.alert(
                        "Aucune playlist",
                        "Veuillez d'abord créer une playlist."
                      );
                      return;
                    }
                    toggleSongSelection(item);
                  }}
                  style={styles.addButton}
                >
                  <Ionicons
                    name={
                      selectedSongs.some((s) => s.id === item.id)
                        ? "checkmark-circle"
                        : "add-circle"
                    }
                    size={24}
                    color="#2196F3"
                  />
                </TouchableOpacity>
              </View>
            )}
            keyExtractor={(item, index) => `song-${item.id}-${index}`}
            contentContainerStyle={styles.songList}
            onEndReached={hasNextPage ? loadSongs : undefined}
            onEndReachedThreshold={0.1}
          />
        </>
      )}
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
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  toggleButton: {
    padding: 5,
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
    marginTop: 30,
  },
});

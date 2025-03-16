import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import CustomPopup from './CustomPopup';
import { useAudio } from '@/app/context/AudioContext';

interface Playlist {
  id: string;
  name: string;
  songs: MediaLibrary.Asset[];
}

export default function PlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistName, setPlaylistName] = useState('');
  const [songs, setSongs] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<MediaLibrary.Asset | null>(null);
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const { sound, isPlaying, currentSong, playSong, pauseSong, resumeSong, stopSong } = useAudio();

  const loadSongs = async () => {
    try {
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
        first: 1000,
      });
      setSongs(media.assets);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération des chansons', error);
    }
  };

  const loadPlaylists = async () => {
    try {
      const savedPlaylists = await AsyncStorage.getItem('playlists');
      if (savedPlaylists) {
        setPlaylists(JSON.parse(savedPlaylists));
      }
    } catch (error) {
      console.error('Erreur lors du chargement des playlists', error);
    }
  };

  const savePlaylists = async (playlists: Playlist[]) => {
    try {
      await AsyncStorage.setItem('playlists', JSON.stringify(playlists));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des playlists', error);
    }
  };

  const createPlaylist = () => {
    if (!playlistName) {
      Alert.alert('Nom manquant', 'Veuillez entrer un nom pour la playlist');
      return;
    }
    const newPlaylist = {
      id: `playlist-${Date.now()}`,
      name: playlistName,
      songs: [],
    };
    const updatedPlaylists = [...playlists, newPlaylist];
    setPlaylists(updatedPlaylists);
    savePlaylists(updatedPlaylists);
    setPlaylistName('');

    if (selectedSong) {
      setIsPopupVisible(true);
    }
  };

  const deletePlaylist = (playlistId: string) => {
    Alert.alert(
      'Supprimer la playlist',
      'Voulez-vous vraiment supprimer cette playlist ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const updatedPlaylists = playlists.filter((p) => p.id !== playlistId);
            setPlaylists(updatedPlaylists);
            savePlaylists(updatedPlaylists);
          },
        },
      ]
    );
  };

  const addSongToPlaylist = (playlistId: string, song: MediaLibrary.Asset) => {
    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.id === playlistId) {
        if (playlist.songs.some((existingSong) => existingSong.id === song.id)) {
          Alert.alert(
            'Chanson déjà ajoutée',
            'Cette chanson est déjà présente dans la playlist.'
          );
          return playlist;
        }
        return { ...playlist, songs: [...playlist.songs, song] };
      }
      return playlist;
    });
    setPlaylists(updatedPlaylists);
    savePlaylists(updatedPlaylists);
  };

  const removeSongFromPlaylist = (playlistId: string, songId: string) => {
    const updatedPlaylists = playlists.map((playlist) => {
      if (playlist.id === playlistId) {
        return {
          ...playlist,
          songs: playlist.songs.filter((song) => song.id !== songId),
        };
      }
      return playlist;
    });
    setPlaylists(updatedPlaylists);
    savePlaylists(updatedPlaylists);
  };

  const playPlaylist = async (playlist: Playlist) => {
    if (playlist.songs.length > 0) {
      await playSong(playlist.songs[0]);
    }
  };

  const handleSongFinished = async () => {
    if (currentSong && playlists.length > 0) {
      const currentPlaylist = playlists.find((p) => p.songs.includes(currentSong));
      if (currentPlaylist) {
        const currentIndex = currentPlaylist.songs.findIndex((s) => s.id === currentSong.id);
        const nextSong = currentPlaylist.songs[currentIndex + 1];
        if (nextSong) {
          await playSong(nextSong);
        } else {
          await stopSong();
        }
      }
    }
  };

  const playNextSong = async () => {
    if (currentSong && playlists.length > 0) {
      const currentPlaylist = playlists.find((p) => p.songs.includes(currentSong));
      if (currentPlaylist) {
        const currentIndex = currentPlaylist.songs.findIndex((s) => s.id === currentSong.id);
        const nextSong = currentPlaylist.songs[currentIndex + 1];
        if (nextSong) {
          await playSong(nextSong);
        }
      }
    }
  };

  const playPreviousSong = async () => {
    if (currentSong && playlists.length > 0) {
      const currentPlaylist = playlists.find((p) => p.songs.includes(currentSong));
      if (currentPlaylist) {
        const currentIndex = currentPlaylist.songs.findIndex((s) => s.id === currentSong.id);
        const previousSong = currentPlaylist.songs[currentIndex - 1];
        if (previousSong) {
          await playSong(previousSong);
        }
      }
    }
  };

  const handleSelectPlaylist = (index: number) => {
    if (selectedSong) {
      const selectedPlaylist = playlists[index];
      addSongToPlaylist(selectedPlaylist.id, selectedSong);
    }
    setIsPopupVisible(false);
  };

  const handleCancelPopup = () => {
    setIsPopupVisible(false);
    setSelectedSong(null);
  };

  useEffect(() => {
    loadSongs();
    loadPlaylists();
  }, []);

  if (loading) {
    return <Text>Chargement des chansons...</Text>;
  }

  return (
    <View style={styles.container}>
      <TextInput
        value={playlistName}
        onChangeText={setPlaylistName}
        placeholder="Nom de la playlist"
        style={styles.input}
      />
      <TouchableOpacity onPress={createPlaylist} style={styles.createButton}>
        <Text style={styles.createButtonText}>Créer Playlist</Text>
      </TouchableOpacity>
      {playlists.length > 0 ? (
        <FlatList
          data={playlists}
          renderItem={({ item }) => (
            <View style={styles.playlistContainer}>
              <View style={styles.playlistHeader}>
                <TouchableOpacity
                  onPress={() => playPlaylist(item)}
                  style={styles.playlistButton}
                >
                  <Text style={styles.playlistName}>{item.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => deletePlaylist(item.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={20} color="red" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={item.songs}
                renderItem={({ item: song }) => (
                  <View style={styles.songContainer}>
                    <Text style={styles.songText}>{song.filename}</Text>
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        onPress={() => removeSongFromPlaylist(item.id, song.id)}
                        style={styles.deleteSongButton}
                      >
                        <Text style={styles.buttonText}>Supprimer</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => playSong(song)}
                        style={styles.playSongButton}
                      >
                        <Text style={styles.buttonText}>Lire</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                keyExtractor={(item, index) => `song-${item.id}-${index}`}
              />
            </View>
          )}
          keyExtractor={(item, index) => `playlist-${item.id}-${index}`}
        />
      ) : (
        <Text>Aucune playlist</Text>
      )}
      <Text style={styles.songListTitle}>Ajouter des chansons aux playlists :</Text>
      <FlatList
        data={songs}
        renderItem={({ item }) => (
          <View style={styles.songContainer}>
            <Text style={styles.songText}>{item.filename}</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedSong(item);
                  if (playlists.length === 0) {
                    Alert.alert(
                      'Aucune playlist',
                      'Veuillez d\'abord créer une playlist.'
                    );
                    return;
                  }
                  setIsPopupVisible(true);
                }}
                style={styles.addSongButton}
              >
                <Text style={styles.buttonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        keyExtractor={(item, index) => `song-${item.id}-${index}`}
      />
      {currentSong && (
        <View style={styles.playerControls}>
          <TouchableOpacity
            onPress={playPreviousSong}
            style={styles.controlButton}
          >
            <Text style={styles.controlButtonText}>⏮ Précédent</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={isPlaying ? pauseSong : resumeSong}
            style={styles.controlButton}
          >
            <Text style={styles.controlButtonText}>
              {isPlaying ? '⏸ Pause' : '▶️ Lecture'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={playNextSong} style={styles.controlButton}>
            <Text style={styles.controlButtonText}>⏭ Suivant</Text>
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
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 5,
  },
  playlistContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 5,
    elevation: 3,
  },
  playlistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  playlistName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  playlistButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#d3d3d3',
    borderRadius: 5,
  },
  songContainer: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 5,
    elevation: 1,
  },
  songText: {
    fontSize: 16,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deleteSongButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginRight: 5,
    alignItems: 'center',
  },
  playSongButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    marginLeft: 5,
    alignItems: 'center',
  },
  addSongButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    flex: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  createButton: {
    backgroundColor: '#d3d3d3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  createButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  songListTitle: {
    marginTop: 20,
    fontWeight: 'bold',
  },
  playerControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  controlButton: {
    backgroundColor: '#d3d3d3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
  },
  controlButtonText: {
    color: 'black',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 5,
  },
});
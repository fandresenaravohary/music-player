import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, Alert, TouchableOpacity, Button, StyleSheet } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useAudio } from '@/app/context/AudioContext'; // Importez useAudio

export default function SongsScreen() {
  const [songs, setSongs] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [nextPage, setNextPage] = useState<string | undefined>(undefined);
  const [isReloading, setIsReloading] = useState(false);
  const [isLoadingSong, setIsLoadingSong] = useState(false);

  const { sound, isPlaying, currentSong, playSong, pauseSong, resumeSong, stopSong } = useAudio();

  useEffect(() => {
    const setupAudio = async () => {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission refusée', 'Vous devez accepter la permission pour accéder aux chansons locales.');
        } else {
          await loadSongs();
        }
      } catch (error) {
        console.error('Erreur lors de la configuration audio', error);
      }
    };

    setupAudio();

    return () => {
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
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
      console.error('Erreur lors de la récupération des chansons', error);
      setLoading(false);
    }
  };

  const handlePlaySong = async (index: number) => {
    if (isReloading || isLoadingSong) return;
    setIsLoadingSong(true);

    try {
      await playSong(songs[index]);
    } catch (error) {
      console.error('Erreur lors de la lecture de la musique', error);
    } finally {
      setIsLoadingSong(false);
    }
  };

  const togglePlayPause = async () => {
    if (isPlaying) {
      await pauseSong();
    } else {
      await resumeSong();
    }
  };

  const playNextSong = () => {
    if (currentSong) {
      const currentIndex = songs.findIndex((song) => song.id === currentSong.id);
      const nextIndex = (currentIndex + 1) % songs.length;
      handlePlaySong(nextIndex);
    }
  };

  const playPreviousSong = () => {
    if (currentSong) {
      const currentIndex = songs.findIndex((song) => song.id === currentSong.id);
      const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
      handlePlaySong(prevIndex);
    }
  };

  const renderSong = ({ item, index }: { item: MediaLibrary.Asset; index: number }) => (
    <TouchableOpacity
      onPress={() => handlePlaySong(index)}
      disabled={isLoadingSong}
      style={[
        styles.songContainer,
        currentSong?.id === item.id && styles.selectedSongContainer,
      ]}
    >
      <Text
        style={[
          styles.songText,
          currentSong?.id === item.id && styles.selectedSongText,
        ]}
      >
        {item.filename}
      </Text>
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
        keyExtractor={(item) => item.id}
        onEndReached={hasNextPage ? loadSongs : undefined}
        onEndReachedThreshold={0.1}
      />

      {currentSong && (
        <View style={styles.playerControls}>
          <Button title="⏮ Précédent" onPress={playPreviousSong} />
          <Button title={isPlaying ? '⏸ Pause' : '▶️ Lecture'} onPress={togglePlayPause} />
          <Button title="⏭ Suivant" onPress={playNextSong} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  songContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 5,
  },
  selectedSongContainer: {
    backgroundColor: '#ddd',
  },
  songText: {
    fontSize: 16,
    color: 'black',
  },
  selectedSongText: {
    color: 'blue',
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
  },
  playerControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
});
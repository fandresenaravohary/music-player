import React, { useEffect, useState } from 'react';
import { FlatList, View, Text, Alert, TouchableOpacity, Button } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Audio } from 'expo-av';

export default function SongsScreen() {
  const [songs, setSongs] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [nextPage, setNextPage] = useState<string | undefined>(undefined); 

  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });

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
        setSound(null);
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

      setSongs(prevSongs => [...prevSongs, ...media.assets]);

      setNextPage(media.hasNextPage ? media.endCursor : undefined);

      setHasNextPage(media.hasNextPage);

      setLoading(false); 
    } catch (error) {
      console.error('Erreur lors de la récupération des chansons', error);
      setLoading(false);
    }
  };

  const playSong = async (index: number) => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: songs[index].uri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setCurrentSongIndex(index);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate(async (status) => {
        if (status.isLoaded && status.didJustFinish) {
          playNextSong();
        }
      });
    } catch (error) {
      console.error('Erreur lors de la lecture de la musique', error);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        if (status.isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la lecture/pause', error);
    }
  };

  const playNextSong = () => {
    if (currentSongIndex !== null) {
      const nextIndex = (currentSongIndex + 1) % songs.length;
      playSong(nextIndex);
    }
  };

  const playPreviousSong = () => {
    if (currentSongIndex !== null) {
      const prevIndex = (currentSongIndex - 1 + songs.length) % songs.length;
      playSong(prevIndex);
    }
  };

  const renderSong = ({ item, index }: { item: MediaLibrary.Asset, index: number }) => (
    <TouchableOpacity onPress={() => playSong(index)} style={{
      padding: 10,
      backgroundColor: currentSongIndex === index ? '#ddd' : '#fff',
      borderRadius: 5,
      marginBottom: 5,
    }}>
      <Text style={{
        fontSize: 16,
        color: currentSongIndex === index ? 'blue' : 'black',
        fontWeight: currentSongIndex === index ? 'bold' : 'normal',
      }}>
        {item.filename}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return <Text>Chargement...</Text>;
  }

  return (
    <View style={{ flex: 1, padding: 10 }}>
      <FlatList
        data={songs}
        renderItem={renderSong}
        keyExtractor={(item) => item.id}
        onEndReached={hasNextPage ? loadSongs : undefined}
        onEndReachedThreshold={0.1}
      />

      {currentSongIndex !== null && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 }}>
          <Button title="⏮ Précédent" onPress={playPreviousSong} />
          <Button title={isPlaying ? "⏸ Pause" : "▶️ Lecture"} onPress={togglePlayPause} />
          <Button title="⏭ Suivant" onPress={playNextSong} />
        </View>
      )}
    </View>
  );
}

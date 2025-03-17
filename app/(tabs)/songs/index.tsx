import React, { useEffect, useState } from "react";
import { View, Text, Alert, StyleSheet } from "react-native";
import * as MediaLibrary from "expo-media-library";
import { useAudio } from "@/app/context/AudioContext";
import SongList from "./SongList";
import PlayerControls from "./PlayerControls";

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
    skipForward,
    skipBackward,
  } = useAudio();

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

  if (loading) {
    return <Text style={styles.loadingText}>Chargement...</Text>;
  }

  return (
    <View style={styles.container}>
      <SongList
        songs={songs}
        currentSongId={currentSong?.id}
        isLoadingSong={isLoadingSong}
        onSongPress={handlePlaySong}
      />
      {currentSong && (
        <PlayerControls
          isPlaying={isPlaying}
          onPrevious={playPreviousSong}
          onSkipBackward={() => skipBackward()}
          onPlayPause={isPlaying ? pauseSong : resumeSong}
          onSkipForward={() => skipForward()}
          onNext={playNextSong}
          onStop={stopSong}
        />
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
  loadingText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 20,
    color: "#555",
  },
});

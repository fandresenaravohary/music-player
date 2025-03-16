import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Audio } from 'expo-av';
import { AppState } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

interface AudioContextType {
  sound: Audio.Sound | null;
  isPlaying: boolean;
  currentSong: MediaLibrary.Asset | null;
  playSong: (song: MediaLibrary.Asset, playlist?: MediaLibrary.Asset[], index?: number) => Promise<void>;
  pauseSong: () => Promise<void>;
  resumeSong: () => Promise<void>;
  stopSong: () => Promise<void>;
  playNextSong: () => Promise<void>;
  playPreviousSong: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSong, setCurrentSong] = useState<MediaLibrary.Asset | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<MediaLibrary.Asset[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (sound) {
          await sound.unloadAsync();
          setSound(null);
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [sound]);

  const playSong = async (song: MediaLibrary.Asset, playlist?: MediaLibrary.Asset[], index?: number) => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: song.uri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setCurrentSong(song);
      setIsPlaying(true);

      if (playlist && typeof index === 'number') {
        setCurrentPlaylist(playlist);
        setCurrentIndex(index);
      } else {
        setCurrentPlaylist(null);
        setCurrentIndex(-1);
      }

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          if (currentPlaylist && currentIndex !== -1) {
            playNextSong();
          } else {
            setCurrentSong(null);
            setIsPlaying(false);
          }
        }
      });
    } catch (error) {
      console.error('Erreur lors de la lecture de la musique', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pauseSong = async () => {
    try {
      if (sound) {
        await sound.pauseAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Erreur lors de la pause', error);
    }
  };

  const resumeSong = async () => {
    try {
      if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erreur lors de la reprise', error);
    }
  };

  const stopSong = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
        setCurrentSong(null);
        setCurrentPlaylist(null);
        setCurrentIndex(-1);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt', error);
    }
  };

  const playNextSong = async () => {
    if (currentPlaylist && currentIndex !== -1) {
      const nextIndex = currentIndex + 1;
      if (nextIndex < currentPlaylist.length) {
        const nextSong = currentPlaylist[nextIndex];
        await playSong(nextSong, currentPlaylist, nextIndex);
      } else {
        await stopSong();
      }
    }
  };

  const playPreviousSong = async () => {
    if (currentPlaylist && currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      const prevSong = currentPlaylist[prevIndex];
      await playSong(prevSong, currentPlaylist, prevIndex);
    }
  };

  return (
    <AudioContext.Provider
      value={{
        sound,
        isPlaying,
        currentSong,
        playSong,
        pauseSong,
        resumeSong,
        stopSong,
        playNextSong,
        playPreviousSong,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export default AudioProvider;

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio doit être utilisé dans un AudioProvider');
  }
  return context;
};

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Audio } from 'expo-av';
import { AppState } from 'react-native';
import * as MediaLibrary from 'expo-media-library';

interface AudioContextType {
  sound: Audio.Sound | null;
  isPlaying: boolean;
  currentSong: MediaLibrary.Asset | null;
  playSong: (song: MediaLibrary.Asset) => Promise<void>;
  pauseSong: () => Promise<void>;
  resumeSong: () => Promise<void>;
  stopSong: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentSong, setCurrentSong] = useState<MediaLibrary.Asset | null>(null);
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

  const playSong = async (song: MediaLibrary.Asset) => {
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

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setCurrentSong(null);
          setIsPlaying(false);
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
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'arrêt', error);
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

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import TrackPlayer, { Capability, State, Event } from 'react-native-track-player';
import * as MusicLibrary from 'expo-music-library';


interface AudioContextType {
  currentSong: MusicLibrary.Asset | null;
  isPlaying: boolean;
  playSong: (song: MusicLibrary.Asset, playlist?: MusicLibrary.Asset[], index?: number) => Promise<void>;
  pauseSong: () => Promise<void>;
  resumeSong: () => Promise<void>;
  stopSong: () => Promise<void>;
  playNextSong: () => Promise<void>;
  playPreviousSong: () => Promise<void>;
  duration: number;
  currentTime: number;
  seekTo: (time: number) => Promise<void>;
}


const AudioContext = createContext<AudioContextType | undefined>(undefined);


interface AudioProviderProps {
  children: ReactNode;
}


export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  const [currentSong, setCurrentSong] = useState<MusicLibrary.Asset | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<MusicLibrary.Asset[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);


  // Configuration de TrackPlayer lors du montage
  useEffect(() => {
    async function setup() {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
      });
    }
    setup();


    // Écoute de l'état de lecture pour mettre à jour isPlaying
    const playbackStateListener = TrackPlayer.addEventListener(Event.PlaybackState, async () => {
      const state = await TrackPlayer.getState();
      setIsPlaying(state === State.Playing);
    });


    // Mise à jour de la position et de la durée toutes les secondes
    const interval = setInterval(async () => {
      const pos = await TrackPlayer.getPosition();
      const dur = await TrackPlayer.getDuration();
      setCurrentTime(pos);
      setDuration(dur);
    }, 1000);


    return () => {
      playbackStateListener.remove();
      clearInterval(interval);
    };
  }, []);


  const playSong = async (song: MusicLibrary.Asset, playlist?: MusicLibrary.Asset[], index?: number) => {
    // Réinitialiser le player et ajouter la piste sélectionnée
    await TrackPlayer.reset();
    await TrackPlayer.add({
      id: song.id,
      url: song.uri,
      title: song.filename,
      // Ajoutez d'autres métadonnées (artiste, artwork, etc.) si nécessaire
    });
    setCurrentSong(song);
    if (playlist && typeof index === 'number') {
      setCurrentPlaylist(playlist);
      setCurrentIndex(index);
    } else {
      setCurrentPlaylist(null);
      setCurrentIndex(-1);
    }
    await TrackPlayer.play();
  };


  const pauseSong = async () => {
    await TrackPlayer.pause();
  };


  const resumeSong = async () => {
    await TrackPlayer.play();
  };


  const stopSong = async () => {
    await TrackPlayer.stop();
    setCurrentSong(null);
    setCurrentPlaylist(null);
    setCurrentIndex(-1);
    setIsPlaying(false);
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


  const seekTo = async (time: number) => {
    await TrackPlayer.seekTo(time);
  };


  return (
    <AudioContext.Provider
      value={{
        currentSong,
        isPlaying,
        playSong,
        pauseSong,
        resumeSong,
        stopSong,
        playNextSong,
        playPreviousSong,
        duration,
        currentTime,
        seekTo,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};


export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio doit être utilisé dans un AudioProvider');
  }
  return context;
};


export default AudioProvider;




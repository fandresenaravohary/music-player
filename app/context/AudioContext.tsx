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


    // Mettre à jour l'état de lecture
    const playbackStateListener = TrackPlayer.addEventListener(Event.PlaybackState, async () => {
      const state = await TrackPlayer.getState();
      setIsPlaying(state === State.Playing);
    });


    // Mettre à jour la position et la durée toutes les secondes
    const interval = setInterval(async () => {
      const pos = await TrackPlayer.getPosition();
      const dur = await TrackPlayer.getDuration();
      setCurrentTime(pos);
      setDuration(dur);
    }, 1000);


    // Mettre à jour la chanson courante lors du changement de piste
// Mettre à jour la chanson courante lors du changement de piste
const trackChangeListener = TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (data) => {
  if (data.nextTrack != null && currentPlaylist) {
    // On récupère l'identifiant courant, qui est de type number | null, et on le convertit en string
    const trackId = await TrackPlayer.getCurrentTrack();
    const trackIdStr = trackId !== null ? trackId.toString() : '';
    const newIndex = currentPlaylist.findIndex((track) => track.id === trackIdStr);
    if (newIndex !== -1) {
      setCurrentIndex(newIndex);
      setCurrentSong(currentPlaylist[newIndex]);
    }
  }
});


    return () => {
      playbackStateListener.remove();
      trackChangeListener.remove();
      clearInterval(interval);
    };
  }, [currentPlaylist]);


  const playSong = async (song: MusicLibrary.Asset, playlist?: MusicLibrary.Asset[], index?: number) => {
    // Réinitialiser le player et ajouter l'ensemble de la playlist si disponible
    await TrackPlayer.reset();
    if (playlist && typeof index === 'number') {
      const tracks = playlist.map((track) => ({
        id: track.id,
        url: track.uri,
        title: track.filename,
        // Vous pouvez ajouter d'autres métadonnées (artiste, artwork, etc.) si nécessaire
      }));
      await TrackPlayer.add(tracks);
      // Positionner le curseur sur la piste sélectionnée
      await TrackPlayer.skip(index);
      setCurrentPlaylist(playlist);
      setCurrentIndex(index);
      setCurrentSong(song);
    } else {
      await TrackPlayer.add({
        id: song.id,
        url: song.uri,
        title: song.filename,
      });
      setCurrentPlaylist(null);
      setCurrentIndex(-1);
      setCurrentSong(song);
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
      try {
        await TrackPlayer.skipToNext();
      } catch (error) {
        // S'il n'y a plus de piste suivante, arrêter la lecture
        await stopSong();
      }
    }
  };


  const playPreviousSong = async () => {
    if (currentPlaylist && currentIndex > 0) {
      try {
        await TrackPlayer.skipToPrevious();
      } catch (error) {
        console.error("Erreur lors du passage à la chanson précédente", error);
      }
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




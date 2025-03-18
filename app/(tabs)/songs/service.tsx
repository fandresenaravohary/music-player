import TrackPlayer, { Event } from 'react-native-track-player';


export default async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch (error) {
      console.error("Aucune piste suivante", error);
    }
  });
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch (error) {
      console.error("Aucune piste précédente", error);
    }
  });
}
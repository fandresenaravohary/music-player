import { AppRegistry } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import playbackService from './(tabs)/songs/service';


// Enregistrement unique du service de lecture en arrière-plan
TrackPlayer.registerPlaybackService(() => playbackService);


AppRegistry.registerComponent('musicplayer', () => App);


export default App;


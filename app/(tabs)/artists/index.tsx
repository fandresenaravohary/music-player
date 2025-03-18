import React, { useEffect, useState } from "react";
import {
  FlatList,
  View,
  Text,
  Alert,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from "react-native";
import * as MusicLibrary from "expo-music-library";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useAudio } from "@/app/context/AudioContext";
import { useFavorites } from "@/app/context/FavoritesContext";

interface Artist {
  name: string;
  songs: MusicLibrary.Asset[];
}

export default function ArtistsScreen() {
  // Gestion de la liste des artistes
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [artistModalVisible, setArtistModalVisible] = useState<boolean>(false);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);

  // Gestion du lecteur global (pop-up détaillé)
  const [playerPopupVisible, setPlayerPopupVisible] = useState<boolean>(false);
  const [sliderValue, setSliderValue] = useState(0);

  // Extraction des méthodes du contexte Audio
  const {
    isPlaying,
    currentSong,
    playSong,
    pauseSong,
    resumeSong,
    stopSong,
    playNextSong,
    playPreviousSong,
    duration,
    currentTime,
    seekTo,
  } = useAudio();

  const { addFavorite, removeFavorite, isFavorite } = useFavorites();

  // Chargement et regroupement des chansons par artiste
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const { status } = await MusicLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission refusée",
            "Vous devez accepter la permission pour accéder aux chansons."
          );
          setLoading(false);
          return;
        }
        const media = await MusicLibrary.getAssetsAsync({ first: 100 });
        const artistsMap: { [key: string]: MusicLibrary.Asset[] } = {};
        media.assets.forEach(song => {
          const artistName = song.artist || "Inconnu";
          if (!artistsMap[artistName]) {
            artistsMap[artistName] = [];
          }
          artistsMap[artistName].push(song);
        });
        const artistsArray: Artist[] = Object.keys(artistsMap).map(name => ({
          name,
          songs: artistsMap[name],
        }));
        artistsArray.sort((a, b) => a.name.localeCompare(b.name));
        setArtists(artistsArray);
        setLoading(false);
      } catch (error) {
        console.error("Erreur lors du chargement des chansons :", error);
        setLoading(false);
      }
    };

    fetchSongs();
  }, []);

  // Mise à jour du slider du lecteur
  useEffect(() => {
    if (duration > 0) {
      setSliderValue(currentTime / duration);
    }
  }, [currentTime, duration]);

  // Ouverture du modal affichant les chansons d'un artiste
  const openArtistModal = (artist: Artist) => {
    setSelectedArtist(artist);
    setArtistModalVisible(true);
  };

  const closeArtistModal = () => {
    setSelectedArtist(null);
    setArtistModalVisible(false);
  };

  // Lancement d'une chanson depuis le modal d'artiste (la playlist correspond aux chansons de l'artiste)
  const handlePlayArtistSong = async (index: number) => {
    if (selectedArtist) {
      try {
        await playSong(selectedArtist.songs[index], selectedArtist.songs, index);
      } catch (error) {
        console.error("Erreur lors de la lecture de la chanson:", error);
      }
    }
  };

  const renderArtist = ({ item }: { item: Artist }) => (
    <TouchableOpacity
      style={styles.artistContainer}
      onPress={() => openArtistModal(item)}
    >
      <Text style={styles.artistName}>{item.name}</Text>
      <Text style={styles.songCount}>
        {item.songs.length} chanson{item.songs.length > 1 ? "s" : ""}
      </Text>
    </TouchableOpacity>
  );

  const renderSong = ({
    item,
    index,
  }: {
    item: MusicLibrary.Asset;
    index: number;
  }) => (
    <TouchableOpacity
      style={styles.songContainer}
      onPress={() => handlePlayArtistSong(index)}
    >
      <Text style={styles.songText}>{item.filename}</Text>
    </TouchableOpacity>
  );

  // Formatage du temps (mm:ss)
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Chargement des artistes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Liste des artistes */}
      <FlatList
        data={artists}
        keyExtractor={(item) => item.name}
        renderItem={renderArtist}
        contentContainerStyle={styles.listContent}
      />

      {/* Modal pour afficher les chansons d'un artiste */}
      <Modal
        visible={artistModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeArtistModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedArtist ? selectedArtist.name : ""}
            </Text>
            <FlatList
              data={selectedArtist?.songs}
              keyExtractor={(item) => item.id}
              renderItem={renderSong}
              contentContainerStyle={styles.modalListContent}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeArtistModal}
            >
              <Text style={styles.modalCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bouton pour afficher ou réduire le lecteur détaillé */}
      {currentSong && (
        <TouchableOpacity
          style={styles.popupToggleButton}
          onPress={() => setPlayerPopupVisible((prev) => !prev)}
        >
          <Text style={styles.popupToggleButtonText}>
            {playerPopupVisible ? "Réduire" : "Afficher"} le lecteur
          </Text>
        </TouchableOpacity>
      )}

      {/* Modal du lecteur (pop-up détaillé) */}
      <Modal
        visible={playerPopupVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPlayerPopupVisible(false)}
      >
        <View style={styles.popupContainer}>
          <View style={styles.popupContent}>
            <Text style={styles.popupTitle}>
              {currentSong ? currentSong.filename : "Aucune chanson"}
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              value={sliderValue}
              minimumTrackTintColor="#1e90ff"
              maximumTrackTintColor="#d3d3d3"
              thumbTintColor="#1e90ff"
              onSlidingComplete={(value) => {
                if (duration) {
                  seekTo(value * duration);
                }
              }}
            />
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>{formatTime(currentTime)}</Text>
              <Text>{formatTime(duration)}</Text>
            </View>
            <View style={styles.popupControls}>
              <TouchableOpacity onPress={playPreviousSong} style={styles.popupControlButton}>
                <Ionicons name="play-back" size={24} color="#333" />
                <Text style={styles.popupControlButtonText}>Précédent</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={isPlaying ? pauseSong : resumeSong}
                style={styles.popupControlButton}
              >
                <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#333" />
                <Text style={styles.popupControlButtonText}>
                  {isPlaying ? "Pause" : "Lecture"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={playNextSong} style={styles.popupControlButton}>
                <Ionicons name="play-forward" size={24} color="#333" />
                <Text style={styles.popupControlButtonText}>Suivant</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={stopSong} style={styles.popupControlButton}>
                <Ionicons name="square" size={24} color="#333" />
                <Text style={styles.popupControlButtonText}>Arrêt</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.closePopupButton}
              onPress={() => setPlayerPopupVisible(false)}
            >
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contrôles du lecteur en mode compact (affichés en bas) */}
      {currentSong && (
        <View style={styles.playerControls}>
          <TouchableOpacity onPress={playPreviousSong} style={styles.controlButton}>
            <Ionicons name="play-back" size={24} color="#fff" />
            <Text style={styles.controlButtonText}>Précédent</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={isPlaying ? pauseSong : resumeSong} style={styles.controlButton}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
            <Text style={styles.controlButtonText}>
              {isPlaying ? "Pause" : "Lecture"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={playNextSong} style={styles.controlButton}>
            <Ionicons name="play-forward" size={24} color="#fff" />
            <Text style={styles.controlButtonText}>Suivant</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={stopSong} style={styles.controlButton}>
            <Ionicons name="square" size={24} color="#fff" />
            <Text style={styles.controlButtonText}>Arrêt</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#eef2f9",
    padding: 15,
  },
  loadingText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 50,
    color: "#555",
  },
  listContent: {
    paddingBottom: 100,
  },
  artistContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  artistName: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  songCount: {
    fontSize: 14,
    color: "#666",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalListContent: {
    paddingBottom: 20,
  },
  modalCloseButton: {
    marginTop: 15,
    alignSelf: "center",
    backgroundColor: "#1e90ff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  modalCloseButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  popupToggleButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#1e90ff",
    padding: 10,
    borderRadius: 20,
    elevation: 4,
  },
  popupToggleButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  popupContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  popupContent: {
    backgroundColor: "#f9f9f9",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: "relative",
  },
  popupTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  slider: {
    width: "100%",
    height: 40,
  },
  popupControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  popupControlButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  popupControlButtonText: {
    color: "#333",
    fontSize: 12,
    marginTop: 4,
  },
  closePopupButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  playerControls: {
    position: "absolute",
    bottom: 20,
    left: 15,
    right: 15,
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#1e1e1e",
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  controlButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
  songContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  songText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
});

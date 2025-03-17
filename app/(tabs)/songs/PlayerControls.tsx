import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface PlayerControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onStop: () => void;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  onPlayPause,
  onPrevious,
  onNext,
  onSkipForward,
  onSkipBackward,
  onStop,
}) => {
  return (
    <View style={styles.playerControls}>
      <TouchableOpacity onPress={onPrevious} style={styles.controlButton}>
        <Ionicons name="play-back" size={24} color="#fff" />
        <Text style={styles.controlButtonText}>Précédent</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkipBackward} style={styles.controlButton}>
        <Ionicons name="arrow-back-circle" size={24} color="#fff" />
        <Text style={styles.controlButtonText}>-10s</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onPlayPause} style={styles.controlButton}>
        <Ionicons name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
        <Text style={styles.controlButtonText}>
          {isPlaying ? "Pause" : "Lecture"}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSkipForward} style={styles.controlButton}>
        <Ionicons name="arrow-forward-circle" size={24} color="#fff" />
        <Text style={styles.controlButtonText}>+10s</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onNext} style={styles.controlButton}>
        <Ionicons name="play-forward" size={24} color="#fff" />
        <Text style={styles.controlButtonText}>Suivant</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onStop} style={styles.controlButton}>
        <Ionicons name="square" size={24} color="#fff" />
        <Text style={styles.controlButtonText}>Arrêt</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  playerControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#333",
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 20,
    flexWrap: "wrap",
  },
  controlButton: {
    alignItems: "center",
    marginHorizontal: 8,
    marginVertical: 5,
  },
  controlButtonText: {
    color: "#fff",
    fontSize: 12,
    marginTop: 4,
  },
});

export default PlayerControls;

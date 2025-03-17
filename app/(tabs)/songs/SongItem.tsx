import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import * as MediaLibrary from "expo-media-library";

interface SongItemProps {
  song: MediaLibrary.Asset;
  isSelected: boolean;
  isLoading: boolean;
  onPress: () => void;
}

const SongItem: React.FC<SongItemProps> = ({ song, isSelected, isLoading, onPress }) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      style={[
        styles.songContainer,
        isSelected && styles.selectedSongContainer,
      ]}
    >
      <Text
        style={[
          styles.songText,
          isSelected && styles.selectedSongText,
        ]}
      >
        {song.filename}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  songContainer: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedSongContainer: {
    backgroundColor: "#e0e0e0",
  },
  songText: {
    fontSize: 16,
    color: "#333",
  },
  selectedSongText: {
    color: "#007aff",
    fontWeight: "600",
  },
});

export default SongItem;

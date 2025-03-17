import React from "react";
import { FlatList } from "react-native";
import * as MediaLibrary from "expo-media-library";
import SongItem from "./SongItem";

interface SongListProps {
  songs: MediaLibrary.Asset[];
  currentSongId?: string;
  isLoadingSong: boolean;
  onSongPress: (index: number) => void;
}

const SongList: React.FC<SongListProps> = ({ songs, currentSongId, isLoadingSong, onSongPress }) => {
  return (
    <FlatList
      data={songs}
      renderItem={({ item, index }) => (
        <SongItem
          song={item}
          isSelected={currentSongId === item.id}
          isLoading={isLoadingSong}
          onPress={() => onSongPress(index)}
        />
      )}
      keyExtractor={(item, index) => `${item.id}-${index}`}
    />
  );
};

export default SongList;

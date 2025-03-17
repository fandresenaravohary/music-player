import React, { createContext, useState, useContext } from "react";
import * as MediaLibrary from "expo-media-library";

interface FavoritesContextType {
  favorites: MediaLibrary.Asset[];
  addFavorite: (song: MediaLibrary.Asset) => void;
  removeFavorite: (songId: string) => void;
  isFavorite: (songId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<MediaLibrary.Asset[]>([]);

  const addFavorite = (song: MediaLibrary.Asset) => {
    setFavorites((prev) => [...prev, song]);
  };

  const removeFavorite = (songId: string) => {
    setFavorites((prev) => prev.filter((song) => song.id !== songId));
  };

  const isFavorite = (songId: string) => {
    return favorites.some((song) => song.id === songId);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export default FavoritesProvider;

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites doit être utilisé dans un FavoritesProvider");
  }
  return context;
};

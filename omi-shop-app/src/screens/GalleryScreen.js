import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Text,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getPhotos, getPhotoFile, getAuthHeaders } from "../services/api";

export default function GalleryScreen({ navigation }) {
  const [photos, setPhotos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [authHeaders, setAuthHeaders] = useState({});

  const fetchPhotos = async (p = 1, append = false) => {
    try {
      const headers = await getAuthHeaders();
      setAuthHeaders(headers);
      const res = await getPhotos(p, 20);
      if (append) {
        setPhotos((prev) => [...prev, ...res.data.photos]);
      } else {
        setPhotos(res.data.photos);
      }
      setTotal(res.data.total);
      setPage(p);
    } catch (e) {
      console.log("Error fetching photos:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPhotos(1);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPhotos(1);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || photos.length >= total) return;
    setLoadingMore(true);
    await fetchPhotos(page + 1, true);
    setLoadingMore(false);
  };

  const renderPhoto = ({ item }) => (
    <TouchableOpacity
      style={styles.photoCard}
      onPress={() => navigation.navigate("PhotoDetail", { photo: item })}
    >
      <Image
        source={{
          uri: getPhotoFile(item.id),
          headers: authHeaders,
        }}
        style={[styles.thumb, styles.imageUpsideFix]}
      />
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Photos ({total})</Text>
      <FlatList
        data={photos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPhoto}
        numColumns={3}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ padding: 16 }} /> : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No photos yet</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    padding: 16,
    paddingBottom: 8,
  },
  photoCard: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 2,
  },
  thumb: {
    flex: 1,
    borderRadius: 6,
    backgroundColor: "#16213e",
  },
  imageUpsideFix: {
    transform: [{ rotate: "180deg" }],
  },
  timestamp: {
    color: "#aaa",
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: 60,
    fontSize: 16,
  },
});

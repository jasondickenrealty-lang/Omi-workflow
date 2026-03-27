import React, { useState, useCallback } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Text,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getVideos } from "../services/api";

export default function VideosScreen({ navigation }) {
  const [videos, setVideos] = useState([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVideos = async () => {
    try {
      const res = await getVideos(1, 50);
      setVideos(res.data.videos);
      setTotal(res.data.total);
    } catch (e) {
      console.log("Error fetching videos:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchVideos();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVideos();
    setRefreshing(false);
  };

  const renderVideo = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("VideoPlayer", { video: item })}
    >
      <View style={styles.playIcon}>
        <Text style={styles.playText}>▶</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.cardTitle}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
        <Text style={styles.cardSub}>
          {item.duration ? `${item.duration.toFixed(1)}s` : "Unknown length"} · {item.source}
        </Text>
        {item.tags && <Text style={styles.tags}>{item.tags}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Videos ({total})</Text>
      <FlatList
        data={videos}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderVideo}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No videos yet</Text>
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16213e",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 10,
    padding: 14,
  },
  playIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e94560",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  playText: { color: "#fff", fontSize: 18 },
  info: { flex: 1 },
  cardTitle: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cardSub: { color: "#aaa", fontSize: 13, marginTop: 2 },
  tags: { color: "#e94560", fontSize: 12, marginTop: 4 },
  empty: {
    color: "#666",
    textAlign: "center",
    marginTop: 60,
    fontSize: 16,
  },
});

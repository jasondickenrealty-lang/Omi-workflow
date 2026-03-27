import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { getVideoFileUrl, deleteVideo, getAuthHeaders } from "../services/api";

export default function VideoPlayerScreen({ route, navigation }) {
  const { video } = route.params;
  const [authHeaders, setAuthHeaders] = useState({});

  useEffect(() => {
    getAuthHeaders().then(setAuthHeaders);
  }, []);

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to save videos.");
        return;
      }
      const headers = await getAuthHeaders();
      const fileUri = FileSystem.documentDirectory + `video_${video.id}.mp4`;
      const download = await FileSystem.downloadAsync(
        getVideoFileUrl(video.id),
        fileUri,
        { headers }
      );
      await MediaLibrary.saveToLibraryAsync(download.uri);
      Alert.alert("Saved", "Video saved to your gallery.");
    } catch (e) {
      Alert.alert("Error", "Failed to download video.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Video", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteVideo(video.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Error", "Failed to delete video.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Video
        source={{
          uri: getVideoFileUrl(video.id),
          headers: authHeaders,
        }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
      />

      <View style={styles.meta}>
        <Text style={styles.label}>Time</Text>
        <Text style={styles.value}>
          {new Date(video.timestamp).toLocaleString()}
        </Text>
        {video.duration && (
          <>
            <Text style={styles.label}>Duration</Text>
            <Text style={styles.value}>{video.duration.toFixed(1)}s</Text>
          </>
        )}
        <Text style={styles.label}>Source</Text>
        <Text style={styles.value}>{video.source}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
          <Text style={styles.btnText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  video: {
    width: "100%",
    height: 300,
    backgroundColor: "#000",
  },
  meta: { padding: 20 },
  label: {
    color: "#e94560",
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 12,
  },
  value: { color: "#fff", fontSize: 16, marginTop: 2 },
  actions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
  },
  downloadBtn: {
    flex: 1,
    backgroundColor: "#0f3460",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#e94560",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { getPhotoFile, deletePhoto, getAuthHeaders } from "../services/api";

export default function PhotoDetailScreen({ route, navigation }) {
  const { photo } = route.params;
  const [authHeaders, setAuthHeaders] = useState({});

  useEffect(() => {
    getAuthHeaders().then(setAuthHeaders);
  }, []);

  const handleDownload = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow access to save photos.");
        return;
      }
      const headers = await getAuthHeaders();
      const fileUri = FileSystem.documentDirectory + `photo_${photo.id}.jpg`;
      const download = await FileSystem.downloadAsync(
        getPhotoFile(photo.id),
        fileUri,
        { headers }
      );
      await MediaLibrary.saveToLibraryAsync(download.uri);
      Alert.alert("Saved", "Photo saved to your gallery.");
    } catch (e) {
      Alert.alert("Error", "Failed to download photo.");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Photo", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePhoto(photo.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Error", "Failed to delete photo.");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{
          uri: getPhotoFile(photo.id),
          headers: authHeaders,
        }}
        style={[styles.image, styles.imageUpsideFix]}
        resizeMode="contain"
      />

      <View style={styles.meta}>
        <Text style={styles.label}>Time</Text>
        <Text style={styles.value}>
          {new Date(photo.timestamp).toLocaleString()}
        </Text>

        <Text style={styles.label}>Source</Text>
        <Text style={styles.value}>{photo.source}</Text>

        {photo.session_id && (
          <>
            <Text style={styles.label}>Session</Text>
            <Text style={styles.value}>{photo.session_id}</Text>
          </>
        )}

        {photo.tags && (
          <>
            <Text style={styles.label}>Tags</Text>
            <Text style={styles.value}>{photo.tags}</Text>
          </>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownload}>
          <Text style={styles.btnText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  image: {
    width: "100%",
    height: 400,
    backgroundColor: "#000",
  },
  imageUpsideFix: {
    transform: [{ rotate: "180deg" }],
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

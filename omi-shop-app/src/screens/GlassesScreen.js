import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
  ScrollView,
} from "react-native";
import glassesService from "../services/glasses";

export default function GlassesScreen() {
  const [status, setStatus] = useState("Disconnected");
  const [connected, setConnected] = useState(false);
  const [battery, setBattery] = useState(null);
  const [lastPhoto, setLastPhoto] = useState(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    glassesService.setOnStatus((s) => {
      setStatus(s);
      setConnected(glassesService.connected);
    });
    glassesService.setOnBattery((level) => setBattery(level));
    glassesService.setOnPhoto(({ uri, count }) => {
      setLastPhoto(uri);
      setPhotoCount(count);
    });

    return () => {
      glassesService.setOnStatus(null);
      glassesService.setOnBattery(null);
      glassesService.setOnPhoto(null);
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS === "android" && Platform.Version >= 31) {
      const permissionList = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];
      if (Platform.Version >= 33) {
        permissionList.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }
      const granted = await PermissionsAndroid.requestMultiple(permissionList);
      const allGranted = Object.values(granted).every(
        (v) => v === PermissionsAndroid.RESULTS.GRANTED
      );
      if (!allGranted) {
        Alert.alert("Permissions needed", "Bluetooth permissions are required to connect to the glasses.");
        return false;
      }
    } else if (Platform.OS === "android") {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert("Permission needed", "Location permission is required for Bluetooth scanning.");
        return false;
      }
    }
    return true;
  };

  const handleConnect = async () => {
    const hasPerms = await requestPermissions();
    if (!hasPerms) return;

    try {
      const device = await glassesService.scan();
      await glassesService.connect(device);
      setConnected(true);
    } catch (e) {
      Alert.alert("Connection Failed", e.message);
      setStatus("Disconnected");
    }
  };

  const handleDisconnect = async () => {
    setCapturing(false);
    await glassesService.stopCapture();
    await glassesService.disconnect();
    setConnected(false);
  };

  const handleStartCapture = async () => {
    try {
      await glassesService.setCaptureInterval(5); // firmware minimum is 5 seconds
      setCapturing(true);
    } catch (e) {
      Alert.alert("Start Capture Failed", e?.message || "Could not start auto capture");
      setCapturing(false);
    }
  };

  const handleStopCapture = async () => {
    try {
      await glassesService.stopCapture();
      setCapturing(false);
    } catch (e) {
      Alert.alert("Stop Capture Failed", e?.message || "Could not stop auto capture");
    }
  };

  const handleSingleShot = async () => {
    try {
      await glassesService.takePhoto();
    } catch (e) {
      Alert.alert("Snap Failed", e?.message || "Could not trigger single photo");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Omi Glasses</Text>

      {/* Status card */}
      <View style={[styles.statusCard, connected ? styles.statusConnected : styles.statusDisconnected]}>
        <Text style={styles.statusText}>{status}</Text>
        {battery !== null && (
          <Text style={styles.batteryText}>Battery: {battery}%</Text>
        )}
      </View>

      {/* Connect/disconnect */}
      {!connected ? (
        <TouchableOpacity style={styles.connectBtn} onPress={handleConnect}>
          <Text style={styles.btnText}>Scan & Connect</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.disconnectBtn} onPress={handleDisconnect}>
          <Text style={styles.btnText}>Disconnect</Text>
        </TouchableOpacity>
      )}

      {/* Capture controls */}
      {connected && (
        <View style={styles.controls}>
          <Text style={styles.sectionTitle}>Capture Controls</Text>

          <View style={styles.controlRow}>
            {!capturing ? (
              <TouchableOpacity style={styles.startBtn} onPress={handleStartCapture}>
                <Text style={styles.btnText}>Start Auto (5s)</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopBtn} onPress={handleStopCapture}>
                <Text style={styles.btnText}>Stop Auto</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.snapBtn} onPress={handleSingleShot}>
              <Text style={styles.btnText}>Snap</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.photoCounter}>
            Photos captured: {photoCount}
          </Text>
        </View>
      )}

      {/* Last captured photo preview */}
      {lastPhoto && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Last Capture</Text>
          <Image source={{ uri: lastPhoto }} style={[styles.preview, styles.imageUpsideFix]} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e", padding: 16 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    marginTop: 8,
  },
  statusCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  statusConnected: { backgroundColor: "#0a8754" },
  statusDisconnected: { backgroundColor: "#16213e" },
  statusText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  batteryText: { color: "#ccc", fontSize: 14, marginTop: 4 },
  connectBtn: {
    backgroundColor: "#0f3460",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  disconnectBtn: {
    backgroundColor: "#c0392b",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  controls: { marginTop: 8 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  controlRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  startBtn: {
    flex: 1,
    backgroundColor: "#0a8754",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  stopBtn: {
    flex: 1,
    backgroundColor: "#e94560",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  snapBtn: {
    flex: 1,
    backgroundColor: "#0f3460",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  photoCounter: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  previewSection: { marginTop: 8 },
  preview: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    backgroundColor: "#000",
    marginBottom: 30,
  },
  imageUpsideFix: {
    transform: [{ rotate: "180deg" }],
  },
});

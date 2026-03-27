import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { getHealth, getPhotos, getVideos, getEvents } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function DashboardScreen() {
  const { logout } = useAuth();
  const [stats, setStats] = useState({
    serverStatus: "...",
    totalPhotos: 0,
    totalVideos: 0,
    totalEvents: 0,
    recentTriggers: [],
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      const [healthRes, photosRes, videosRes, eventsRes] = await Promise.all([
        getHealth().catch(() => ({ data: { status: "offline" } })),
        getPhotos(1, 1).catch(() => ({ data: { total: 0 } })),
        getVideos(1, 1).catch(() => ({ data: { total: 0 } })),
        getEvents().catch(() => ({ data: { count: 0, events: [] } })),
      ]);

      // Get last 5 events that had triggers
      const triggered = (eventsRes.data.events || [])
        .filter((e) => e.capture_requested)
        .slice(-5)
        .reverse();

      setStats({
        serverStatus: healthRes.data.status || "offline",
        totalPhotos: photosRes.data.total || 0,
        totalVideos: videosRes.data.total || 0,
        totalEvents: eventsRes.data.count || 0,
        recentTriggers: triggered,
      });
    } catch (e) {
      console.log("Dashboard error:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Dashboard</Text>

      {/* Status cards */}
      <View style={styles.cardRow}>
        <View style={[styles.card, { backgroundColor: stats.serverStatus === "ok" ? "#0a8754" : "#c0392b" }]}>
          <Text style={styles.cardNum}>{stats.serverStatus === "ok" ? "ONLINE" : "OFFLINE"}</Text>
          <Text style={styles.cardLabel}>Server</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNum}>{stats.totalEvents}</Text>
          <Text style={styles.cardLabel}>Events</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardNum}>{stats.totalPhotos}</Text>
          <Text style={styles.cardLabel}>Photos</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNum}>{stats.totalVideos}</Text>
          <Text style={styles.cardLabel}>Videos</Text>
        </View>
      </View>

      {/* Recent triggers */}
      <Text style={styles.sectionTitle}>Recent Triggers</Text>
      {stats.recentTriggers.length === 0 ? (
        <Text style={styles.empty}>No triggers yet</Text>
      ) : (
        stats.recentTriggers.map((event) => (
          <View key={event.id} style={styles.triggerCard}>
            <Text style={styles.triggerText} numberOfLines={1}>
              {event.raw_text}
            </Text>
            <Text style={styles.triggerMeta}>
              {event.matched_triggers?.join(", ") || event.command_executed || "—"}
            </Text>
            <Text style={styles.triggerTime}>
              {new Date(event.timestamp).toLocaleString()}
            </Text>
          </View>
        ))
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
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
  cardRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#16213e",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  cardNum: { fontSize: 28, fontWeight: "bold", color: "#e94560" },
  cardLabel: { color: "#aaa", fontSize: 13, marginTop: 4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 20,
    marginBottom: 10,
  },
  triggerCard: {
    backgroundColor: "#16213e",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  triggerText: { color: "#fff", fontSize: 14 },
  triggerMeta: { color: "#e94560", fontSize: 12, marginTop: 4 },
  triggerTime: { color: "#666", fontSize: 11, marginTop: 2 },
  empty: { color: "#666", fontSize: 14, textAlign: "center", padding: 20 },
  logoutBtn: {
    backgroundColor: "#333",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
  },
  logoutText: { color: "#e94560", fontSize: 16, fontWeight: "bold" },
});

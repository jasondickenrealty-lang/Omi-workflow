/**
 * Omi Glasses BLE service.
 *
 * Connects to the glasses over Bluetooth, receives photo chunks,
 * reassembles them into JPEGs, and uploads to the VPS.
 *
 * BLE Protocol (from Omi firmware):
 *   - Service UUID:       19B10000-E8F2-537E-4F6C-D104768A1214
 *   - Photo Data UUID:    19B10005-E8F2-537E-4F6C-D104768A1214
 *   - Photo Control UUID: 19B10006-E8F2-537E-4F6C-D104768A1214
 *
 * Photo chunk format:
 *   First chunk:  [frameIdx 2B] [orientation 1B] [jpeg data ≤199B]
 *   Next chunks:  [frameIdx 2B] [jpeg data ≤200B]
 *   End marker:   0xFF 0xFF
 */

import { BleManager } from "react-native-ble-plx";
import { Buffer } from "buffer";
import * as FileSystem from "expo-file-system";

const SERVICE_UUID = "19B10000-E8F2-537E-4F6C-D104768A1214";
const PHOTO_DATA_UUID = "19B10005-E8F2-537E-4F6C-D104768A1214";
const PHOTO_CONTROL_UUID = "19B10006-E8F2-537E-4F6C-D104768A1214";
const BATTERY_SERVICE_UUID = "0000180F-0000-1000-8000-00805F9B34FB";
const BATTERY_LEVEL_UUID = "00002A19-0000-1000-8000-00805F9B34FB";

const API_BASE = "http://187.77.12.9:9000";

class GlassesService {
  constructor() {
    this.manager = new BleManager();
    this.device = null;
    this.connected = false;
    this.photoChunks = [];
    this.currentFrameIdx = -1;
    this.onPhotoCallback = null;
    this.onStatusCallback = null;
    this.onBatteryCallback = null;
    this.photoCount = 0;
  }

  setOnPhoto(callback) {
    this.onPhotoCallback = callback;
  }

  setOnStatus(callback) {
    this.onStatusCallback = callback;
  }

  setOnBattery(callback) {
    this.onBatteryCallback = callback;
  }

  _updateStatus(status) {
    if (this.onStatusCallback) this.onStatusCallback(status);
  }

  async scan() {
    this._updateStatus("Scanning for Omi Glasses...");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        reject(new Error("No Omi Glasses found"));
      }, 15000);

      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
          return;
        }
        if (device && device.name && device.name.includes("OMI")) {
          clearTimeout(timeout);
          this.manager.stopDeviceScan();
          this._updateStatus(`Found: ${device.name}`);
          resolve(device);
        }
      });
    });
  }

  async connect(device) {
    this._updateStatus("Connecting...");

    this.device = await device.connect({ requestMTU: 517 });
    await this.device.discoverAllServicesAndCharacteristics();
    this.connected = true;
    this._updateStatus("Connected");

    // Read battery level
    await this._readBattery();

    // Subscribe to photo data notifications
    this.device.monitorCharacteristicForService(
      SERVICE_UUID,
      PHOTO_DATA_UUID,
      (error, characteristic) => {
        if (error) {
          console.log("Photo notification error:", error);
          return;
        }
        if (characteristic?.value) {
          this._handlePhotoChunk(characteristic.value);
        }
      }
    );

    // Handle disconnect
    this.device.onDisconnected((error, dev) => {
      this.connected = false;
      this._updateStatus("Disconnected");
    });
  }

  async _readBattery() {
    try {
      const char = await this.device.readCharacteristicForService(
        BATTERY_SERVICE_UUID,
        BATTERY_LEVEL_UUID
      );
      if (char?.value) {
        const bytes = Buffer.from(char.value, "base64");
        const level = bytes[0];
        if (this.onBatteryCallback) this.onBatteryCallback(level);
      }
    } catch (e) {
      console.log("Battery read error:", e);
    }
  }

  _handlePhotoChunk(base64Value) {
    const bytes = Buffer.from(base64Value, "base64");

    // End marker: 0xFF 0xFF
    if (bytes.length === 2 && bytes[0] === 0xff && bytes[1] === 0xff) {
      this._assemblePhoto();
      return;
    }

    // Frame index from first 2 bytes
    const frameIdx = bytes[0] | (bytes[1] << 8);

    if (frameIdx !== this.currentFrameIdx) {
      // New frame starting — if we had chunks from a previous frame, assemble it
      if (this.photoChunks.length > 0) {
        this._assemblePhoto();
      }
      this.currentFrameIdx = frameIdx;
      // First chunk has 1 byte orientation + image data
      this.photoChunks.push(bytes.slice(3)); // skip 2B frame idx + 1B orientation
    } else {
      // Continuation chunk
      this.photoChunks.push(bytes.slice(2)); // skip 2B frame idx
    }
  }

  async _assemblePhoto() {
    if (this.photoChunks.length === 0) return;

    const jpeg = Buffer.concat(this.photoChunks);
    this.photoChunks = [];
    this.currentFrameIdx = -1;
    this.photoCount++;

    // Save locally first
    const filename = `photo_${Date.now()}.jpg`;
    const localUri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(localUri, jpeg.toString("base64"), {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Upload to VPS
    try {
      await FileSystem.uploadAsync(
        `${API_BASE}/webhook/photo?session_id=glasses-ble&uid=jason`,
        localUri,
        {
          fieldName: "file",
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        }
      );
    } catch (e) {
      console.log("Upload error:", e);
    }

    // Notify UI
    if (this.onPhotoCallback) {
      this.onPhotoCallback({ uri: localUri, count: this.photoCount });
    }
  }

  async setCaptureInterval(seconds) {
    if (!this.device || !this.connected) return;
    try {
      // Write interval value to photo control characteristic
      // Firmware accepts values 5-300 (seconds), 0 = stop, -1 = single shot
      const value = Buffer.alloc(1);
      value.writeInt8(Math.max(0, Math.min(seconds, 127)));
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        PHOTO_CONTROL_UUID,
        value.toString("base64")
      );
    } catch (e) {
      console.log("Set interval error:", e);
    }
  }

  async takePhoto() {
    if (!this.device || !this.connected) return;
    try {
      // -1 = single shot trigger
      const value = Buffer.alloc(1);
      value.writeInt8(-1);
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        PHOTO_CONTROL_UUID,
        value.toString("base64")
      );
    } catch (e) {
      console.log("Take photo error:", e);
    }
  }

  async stopCapture() {
    if (!this.device || !this.connected) return;
    try {
      const value = Buffer.alloc(1);
      value.writeInt8(0);
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        PHOTO_CONTROL_UUID,
        value.toString("base64")
      );
    } catch (e) {
      console.log("Stop capture error:", e);
    }
  }

  async disconnect() {
    if (this.device) {
      await this.device.cancelConnection();
      this.device = null;
      this.connected = false;
      this._updateStatus("Disconnected");
    }
  }

  destroy() {
    this.manager.destroy();
  }
}

// Singleton
const glassesService = new GlassesService();
export default glassesService;

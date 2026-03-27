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
    this.jpegBuffer = Buffer.alloc(0);
    this.awaitingJpeg = false;
    this.onPhotoCallback = null;
    this.onStatusCallback = null;
    this.onBatteryCallback = null;
    this.photoCount = 0;
    this.maxJpegBytes = 2 * 1024 * 1024;
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

  async _writePhotoControl(value) {
    if (!this.device || !this.connected) {
      throw new Error("Glasses are not connected");
    }

    // Most firmware builds use 1-byte control values (0=stop, -1=snap, 5-127 interval).
    // Try int8 first for compatibility, then fall back to int16 if needed.
    try {
      const int8 = Buffer.alloc(1);
      int8.writeInt8(Math.max(-1, Math.min(value, 127)));
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        PHOTO_CONTROL_UUID,
        int8.toString("base64")
      );
      return;
    } catch (e) {
      const int16 = Buffer.alloc(2);
      int16.writeInt16LE(value);
      await this.device.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        PHOTO_CONTROL_UUID,
        int16.toString("base64")
      );
    }
  }

  async scan() {
    this._updateStatus("Scanning for Omi Glasses...");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.manager.stopDeviceScan();
        reject(new Error("No Omi Glasses found"));
      }, 15000);

      this.manager.startDeviceScan([SERVICE_UUID], null, (error, device) => {
        if (error) {
          clearTimeout(timeout);
          reject(error);
          return;
        }

        const name = device?.name || device?.localName || "";
        const serviceUUIDs = device?.serviceUUIDs || [];
        const hasService =
          serviceUUIDs.length === 0 ||
          serviceUUIDs.some((uuid) => uuid?.toUpperCase?.() === SERVICE_UUID);

        if (device && name.toUpperCase().includes("OMI") && hasService) {
          clearTimeout(timeout);
          this.manager.stopDeviceScan();
          this._updateStatus(`Found Omi device: ${name}`);
          resolve(device);
        }
      });
    });
  }

  async connect(device) {
    this._updateStatus("Connecting...");

    this.device = await device.connect({ requestMTU: 517 });
    await this.device.discoverAllServicesAndCharacteristics();

    const photoChars = await this.device.characteristicsForService(SERVICE_UUID);
    const photoCharUuids = photoChars.map((c) => c.uuid?.toUpperCase?.());
    const hasPhotoData = photoCharUuids.includes(PHOTO_DATA_UUID);
    const hasPhotoControl = photoCharUuids.includes(PHOTO_CONTROL_UUID);

    if (!hasPhotoData || !hasPhotoControl) {
      await this.device.cancelConnection();
      this.device = null;
      this.connected = false;
      throw new Error("Connected device does not expose Omi photo characteristics");
    }

    this.connected = true;
    this._updateStatus("Connected to Omi glasses");

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
          this._updateStatus("Receiving photo data...");
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
    if (!bytes || bytes.length === 0) return;

    // Device-level terminator used by some firmware variants.
    if (bytes.length === 2 && bytes[0] === 0xff && bytes[1] === 0xff) {
      if (this.awaitingJpeg && this.jpegBuffer.length > 0) {
        const forced = Buffer.concat([this.jpegBuffer, Buffer.from([0xff, 0xd9])]);
        this.jpegBuffer = Buffer.alloc(0);
        this.awaitingJpeg = false;
        this._consumeCompletedJpeg(forced);
      }
      return;
    }

    // Omi chunk headers: [2B frame], optional [1B orientation on first chunk].
    let payload = bytes;
    if (bytes.length >= 3) {
      const hasOrientation =
        bytes.length >= 5 &&
        bytes[2] <= 8 &&
        bytes[3] === 0xff &&
        bytes[4] === 0xd8;
      payload = bytes.slice(hasOrientation ? 3 : 2);
    }

    this._ingestJpegPayload(payload);
  }

  _ingestJpegPayload(payload) {
    if (!payload || payload.length === 0) return;

    // If we're not currently collecting a JPEG, look for SOI marker.
    if (!this.awaitingJpeg) {
      const soi = payload.indexOf(Buffer.from([0xff, 0xd8]));
      if (soi === -1) {
        return;
      }
      this.awaitingJpeg = true;
      this.jpegBuffer = payload.slice(soi);
    } else {
      this.jpegBuffer = Buffer.concat([this.jpegBuffer, payload]);
    }

    if (this.jpegBuffer.length > this.maxJpegBytes) {
      this._updateStatus("Dropping oversized/invalid image stream");
      this.jpegBuffer = Buffer.alloc(0);
      this.awaitingJpeg = false;
      return;
    }

    // One payload can contain one or more complete JPEGs.
    while (this.awaitingJpeg) {
      const eoi = this.jpegBuffer.indexOf(Buffer.from([0xff, 0xd9]));
      if (eoi === -1) break;

      const complete = this.jpegBuffer.slice(0, eoi + 2);
      const remaining = this.jpegBuffer.slice(eoi + 2);
      this.jpegBuffer = Buffer.alloc(0);
      this.awaitingJpeg = false;
      this._consumeCompletedJpeg(complete);

      // Continue scanning trailing bytes for next SOI.
      if (remaining.length > 0) {
        const soi = remaining.indexOf(Buffer.from([0xff, 0xd8]));
        if (soi !== -1) {
          this.awaitingJpeg = true;
          this.jpegBuffer = remaining.slice(soi);
        }
      }
    }
  }

  _consumeCompletedJpeg(jpeg) {
    const isValidJpeg =
      jpeg &&
      jpeg.length >= 2048 &&
      jpeg[0] === 0xff &&
      jpeg[1] === 0xd8 &&
      jpeg[jpeg.length - 2] === 0xff &&
      jpeg[jpeg.length - 1] === 0xd9;

    if (!isValidJpeg) {
      return;
    }

    void this._saveAndUploadPhoto(jpeg);
  }

  async _saveAndUploadPhoto(jpeg) {
    this.photoCount++;
    this._updateStatus(`Photo ${this.photoCount} captured`);

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
    if (seconds !== 0 && seconds < 5) {
      throw new Error("Auto capture interval must be at least 5 seconds");
    }

    const safeSeconds = Math.max(0, Math.min(seconds, 300));
    await this._writePhotoControl(safeSeconds);
    this._updateStatus(
      safeSeconds === 0
        ? "Capture stopped"
        : `Auto capture every ${safeSeconds}s`
    );
  }

  async takePhoto() {
    await this._writePhotoControl(-1);
    this._updateStatus("Single shot requested");
  }

  async stopCapture() {
    await this._writePhotoControl(0);
    this._updateStatus("Capture stopped");
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

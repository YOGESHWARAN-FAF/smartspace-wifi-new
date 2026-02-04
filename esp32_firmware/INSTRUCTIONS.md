
# Smart Space Firmware Instructions

This folder contains the firmware for your ESP32 or ESP8266 device to work with the Smart Space Web App.

## 1. Prerequisites
- **Arduino IDE**: Download and install from [arduino.cc](https://www.arduino.cc/en/software).
- **Drivers**: Ensure you have the USB drivers for your board (CP210x or CH340).
- **Libraries**: Open Arduino IDE -> Sketch -> Include Library -> Manage Libraries...
  - Search for `ArduinoJson` and install it.
  - (For ESP8266) Search for `ESP8266WiFi`.
  - (For ESP32) Search for `WiFi`.

## 2. Configuration
1. Open `SmartSpace_Unified.ino` in Arduino IDE.
2. Update the WiFi credentials at the top of the file:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   ```
   **IMPORTANT:** Your computer/phone running the app must be on the SAME WiFi network.

3. Verify the `DeviceMapping` section aligns with your physical wiring.
   - Example: If your "light" is connected to GPIO 5, change `{ "light", 2, false }` to `{ "light", 5, false }`.

## 3. Flashing
1. Select your Board in Tools -> Board.
   - For ESP32: "DOIT ESP32 DEVKIT V1" (or similar).
   - For ESP8266: "NodeMCU 1.0 (ESP-12E Module)" (or Generic ESP8266).
2. Select the correct Port in Tools -> Port.
3. Click Upload (Right Arrow button).

## 4. Connecting
1. Once uploaded, open the **Serial Monitor** (Tools -> Serial Monitor). 
2. Set baud rate to `115200`.
3. Press the Reset button on your board.
4. Wait for the "WiFi connected" message.
5. Note the IP Address displayed (e.g., `192.168.1.45`).
6. Open the Smart Space Web App.
7. Go to the **Connect** page.
8. Enter the IP Address and Port (default `80`).
9. Click "Check Connection".

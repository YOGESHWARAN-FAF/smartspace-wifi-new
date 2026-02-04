#ifdef ESP32
  #include <WiFi.h>
  #include <WebServer.h>
#elif defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESP8266WebServer.h>
#endif

#include <ArduinoJson.h> // Make sure to install ArduinoJson library (v6 or v7)

// ==========================================
// CONFIGURATION
// ==========================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const int PORT = 80;

// Device Mapping: Name -> GPIO Pin
struct DeviceMapping {
  String name;
  int pin;
  bool isPWM; // true for Regulatable (Slider), false for Normal (Switch)
};

// Example Configuration - CHANGE THESE PINS TO MATCH YOUR SETUP
// ESP8266 often uses NodeMCU pin mapping (D1, D2 etc mapped to GPIO)
// ESP32 uses direct GPIO numbers
#ifdef ESP32
DeviceMapping devices[] = {
  { "light", 2, false },      // Built-in LED on many ESP32s (GPIO 2)
  { "fan", 4, true },         // Example PWM device on GPIO 4
  { "bedroom_light", 5, false }
};
#elif defined(ESP8266)
// D4 is often Built-in LED on NodeMCU (Active LOW usually)
DeviceMapping devices[] = {
  { "light", 2, false },      // GPIO 2 (D4 on NodeMCU)
  { "fan", 5, true },         // GPIO 5 (D1 on NodeMCU)
  { "bedroom_light", 4, false } // GPIO 4 (D2 on NodeMCU)
};
#endif

const int deviceCount = sizeof(devices) / sizeof(devices[0]);

// ==========================================
// SERVER SETUP
// ==========================================
#ifdef ESP32
  WebServer server(PORT);
#elif defined(ESP8266)
  ESP8266WebServer server(PORT);
#endif

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println("\n\nStarting Smart Space Controller...");
  
  // Initialize Pins
  for (int i = 0; i < deviceCount; i++) {
    pinMode(devices[i].pin, OUTPUT);
    
    // Initialize to OFF
    #ifdef ESP32
      if (devices[i].isPWM) {
        ledcSetup(i, 5000, 8); // Channel i, 5kHz, 8-bit
        ledcAttachPin(devices[i].pin, i);
        ledcWrite(i, 0);
      } else {
        digitalWrite(devices[i].pin, LOW);
      }
    #elif defined(ESP8266)
      if (devices[i].isPWM) {
        analogWrite(devices[i].pin, 0);
      } else {
        digitalWrite(devices[i].pin, LOW);
      }
    #endif
  }

  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection failed. Please check SSID/Password.");
  }

  // Setup Routes
  server.on("/ping", HTTP_GET, handlePing);
  server.on("/device", HTTP_GET, handleDevice);
  server.onNotFound(handleNotFound);

  // Start Server
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
}

// ==========================================
// HANDLERS
// ==========================================

void addCorsHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void handlePing() {
  addCorsHeaders();
  server.send(200, "text/plain", "pong");
}

void handleDevice() {
  addCorsHeaders();

  if (!server.hasArg("name")) {
    server.send(400, "text/plain", "Missing 'name' parameter");
    return;
  }

  String deviceName = server.arg("name");
  int deviceIndex = -1;

  // Find device by name
  for (int i = 0; i < deviceCount; i++) {
    if (devices[i].name.equalsIgnoreCase(deviceName)) {
      deviceIndex = i;
      break;
    }
  }

  if (deviceIndex == -1) {
    server.send(404, "text/plain", "Device not found");
    return;
  }

  // Handle 'state' (ON/OFF)
  if (server.hasArg("state")) {
    String state = server.arg("state");
    // Simple state handling
    bool turnOn = state.equalsIgnoreCase("on") || state.equalsIgnoreCase("true") || state == "1";
    bool turnOff = state.equalsIgnoreCase("off") || state.equalsIgnoreCase("false") || state == "0";

    if (turnOn) {
      if (devices[deviceIndex].isPWM) {
         #ifdef ESP32
           ledcWrite(deviceIndex, 255);
         #elif defined(ESP8266)
           analogWrite(devices[deviceIndex].pin, 255); // 0-255 or 0-1023? usually 1023 on 8266 but SDK varies. Let's assume 255 for now or check range. 
           // ESP8266 default is 1023. Let's fix that below.
           analogWrite(devices[deviceIndex].pin, 1023); 
         #endif
      } else {
         digitalWrite(devices[deviceIndex].pin, HIGH);
      }
    } else if (turnOff) {
      if (devices[deviceIndex].isPWM) {
         #ifdef ESP32
           ledcWrite(deviceIndex, 0);
         #elif defined(ESP8266)
           analogWrite(devices[deviceIndex].pin, 0);
         #endif
      } else {
         digitalWrite(devices[deviceIndex].pin, LOW);
      }
    } else {
      server.send(400, "text/plain", "Invalid state. Use 'on' or 'off'");
      return;
    }
  }
  // Handle 'value' (0-100)
  else if (server.hasArg("value")) {
    int val = server.arg("value").toInt();
    if (val < 0) val = 0;
    if (val > 100) val = 100;

    if (devices[deviceIndex].isPWM) {
      #ifdef ESP32
        // Map 0-100 to 0-255
        int pwmValue = map(val, 0, 100, 0, 255);
        ledcWrite(deviceIndex, pwmValue);
      #elif defined(ESP8266)
        // Map 0-100 to 0-1023 (default range for ESP8266)
        int pwmValue = map(val, 0, 100, 0, 1023);
        analogWrite(devices[deviceIndex].pin, pwmValue);
      #endif
    } else {
      // For non-PWM, >0 is ON
      digitalWrite(devices[deviceIndex].pin, val > 0 ? HIGH : LOW);
    }
  } else {
    server.send(400, "text/plain", "Missing 'state' or 'value' parameter");
    return;
  }

  // Response with JSON
  // Allocate a bit more for JSON
  StaticJsonDocument<256> doc;
  doc["status"] = "success";
  doc["device"] = deviceName;
  doc["pin"] = devices[deviceIndex].pin;
  doc["platform"] = 
    #ifdef ESP32 
      "ESP32" 
    #elif defined(ESP8266) 
      "ESP8266" 
    #else 
      "Unknown" 
    #endif
  ;
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleNotFound() {
  if (server.method() == HTTP_OPTIONS) {
    addCorsHeaders();
    server.send(204);
  } else {
    addCorsHeaders();
    server.send(404, "text/plain", "Not found");
  }
}

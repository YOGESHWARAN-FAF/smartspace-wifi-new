

/**
 * Check connection to ESP32
 * GET /ping
 */
export const checkConnection = async (ip, port) => {
  // Sanitize IP: remove http://, https://, and trailing slashes
  const cleanIP = ip.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const cleanPort = port.toString().replace(/[^0-9]/g, ''); // Ensure port is just numbers

  const url = `http://${cleanIP}:${cleanPort}/ping`;
  console.log(`Checking connection to: ${url}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    if (text.trim() !== 'pong') {
      throw new Error(`Unexpected response: "${text}"`);
    }

    return true;
  } catch (error) {
    console.error('Connection check failed:', error);
    throw error;
  }
};

/**
 * Control a device
 * GET /device?venue=<venueId>&name=<deviceName>&state=<on|off>
 * GET /device?venue=<venueId>&name=<deviceName>&value=<0-100>
 */
export const controlDevice = async (ip, port, venueId, deviceName, params) => {
  if (!ip || !port) {
    throw new Error('ESP32 not connected');
  }

  const cleanIP = ip.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const cleanPort = port.toString().replace(/[^0-9]/g, '');

  const queryParams = new URLSearchParams({
    venue: venueId,
    name: deviceName,
    ...params,
  });

  const url = `http://${cleanIP}:${cleanPort}/device?${queryParams.toString()}`;
  console.log(`Sending command: ${url}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Device control failed: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Device control error:', error);
    throw error;
  }
};

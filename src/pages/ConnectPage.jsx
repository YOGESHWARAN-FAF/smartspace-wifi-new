import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSmartSpace } from '../context/SmartSpaceContext';
import { checkConnection } from '../utils/api';
import { Save, Wifi } from 'lucide-react';

const ConnectPage = () => {
  const { espConfig, setEspConfig, addToast } = useSmartSpace();
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (espConfig.ip) setIp(espConfig.ip);
    if (espConfig.port) setPort(espConfig.port);
  }, [espConfig]);

  const handleConnect = async () => {
    if (!ip || !port) {
      addToast('Please enter IP and Port', 'error');
      return;
    }

    setLoading(true);
    setStatusMessage('Checking connection...');

    try {
      // The checkConnection function in api.js now handles sanitization
      await checkConnection(ip, port);

      // Success
      addToast('Connection successful!', 'success');
      setStatusMessage('Connected! ✔');

      // Sanitize for storage too, to keep it clean
      const cleanIP = ip.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const cleanPort = port.toString().replace(/[^0-9]/g, '');

      setEspConfig({
        ...espConfig,
        ip: cleanIP,
        port: cleanPort,
        isOnline: true,
        lastCheckedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error(error);
      addToast(`Connection failed: ${error.message}`, 'error');
      setStatusMessage(`Error: ${error.message}`);
      setEspConfig({ ...espConfig, isOnline: false });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!ip || !port) {
      addToast('Please enter IP and Port', 'error');
      return;
    }

    const cleanIP = ip.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const cleanPort = port.toString().replace(/[^0-9]/g, '');

    setEspConfig({ ...espConfig, ip: cleanIP, port: cleanPort });
    addToast('Configuration saved', 'success');
    navigate('/');
  };

  return (
    <div className="page connect-page">
      <div className="container">
        <header className="page-header">
          <h1>Connect to Space</h1>
          <p>Enter your ESP32 configuration</p>
        </header>

        <div className="card form-card">
          <div className="form-group">
            <label>ESP32 IP Address</label>
            <input
              type="text"
              placeholder="e.g. 192.168.1.100 or localhost"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Port</label>
            <input
              type="text"
              placeholder="e.g. 80 or 3000"
              value={port}
              onChange={(e) => setPort(e.target.value)}
            />
          </div>

          {statusMessage && (
            <div className={`status-message ${statusMessage.includes('Error') ? 'error' : 'success'}`} style={{ marginBottom: '1rem', padding: '0.5rem', borderRadius: '8px', background: statusMessage.includes('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: statusMessage.includes('Error') ? '#ef4444' : '#10b981' }}>
              {statusMessage}
            </div>
          )}

          <div className="button-group">
            <button
              className="btn btn-secondary"
              onClick={handleConnect}
              disabled={loading}
            >
              <Wifi size={18} />
              {loading ? 'Checking...' : 'Check Connection'}
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              <Save size={18} />
              Save & Continue
            </button>
          </div>
        </div>

        <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#6b7280' }}>
          <h3>Troubleshooting Guide:</h3>
          <ul style={{ paddingLeft: '1.2rem', textAlign: 'left' }}>
            <li><strong>Step 1:</strong> Upload the <code>SmartSpace_Unified.ino</code> firmware to your ESP32 or ESP8266.</li>
            <li><strong>Step 2:</strong> Check the <strong>Arduino Serial Monitor</strong> (baud 115200) to get the correct IP Address assigned by your router.</li>
            <li><strong>Step 3:</strong> Ensure your computer/phone is on the <strong>SAME Wi-Fi network</strong> as the ESP device.</li>
            <li><strong>Step 4:</strong> If using ESP8266, confirm you selected the correct Board in Arduino IDE.</li>
            <li><strong>Mobile Note:</strong> If on mobile, turn off <strong>Mobile Data</strong> to ensure it uses Wi-Fi.</li>
            <li><strong>Test Mock Server:</strong> Run <code>node mock-esp.cjs</code> and connect to IP: <code>localhost</code>, Port: <code>3000</code>.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ConnectPage;

import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Power, Sun } from 'lucide-react';
import { useSmartSpace } from '../context/SmartSpaceContext';
import { controlDevice } from '../utils/api';

// Simple debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

const DeviceCard = ({ device, venueId }) => {
  const { deleteDevice, updateDeviceLocal, espConfig, addToast } = useSmartSpace();
  const [localValue, setLocalValue] = useState(device.value || 0);
  const debouncedValue = useDebounce(localValue, 300);

  // Handle Slider Change (Regulatable)
  useEffect(() => {
    if (device.type === 'REGULATABLE' && debouncedValue !== device.value) {
      const sync = async () => {
        try {
          await controlDevice(espConfig.ip, espConfig.port, venueId, device.name, { value: debouncedValue });
          updateDeviceLocal(venueId, device.id, { value: debouncedValue });
        } catch (error) {
          addToast(`Failed to set value: ${error.message}`, 'error');
        }
      };

      if (debouncedValue !== device.value) {
        sync();
      }
    }
  }, [debouncedValue, device.type, device.name, venueId, espConfig, addToast, device.value, updateDeviceLocal]);

  // Sync local state if props change
  useEffect(() => {
    if (device.type === 'REGULATABLE') {
      setLocalValue(device.value);
    }
  }, [device.value, device.type]);


  const handleToggle = async () => {
    const newState = device.state === 'on' ? 'off' : 'on';
    try {
      // Optimistic update
      updateDeviceLocal(venueId, device.id, { state: newState });
      await controlDevice(espConfig.ip, espConfig.port, venueId, device.name, { state: newState });
    } catch (error) {
      // Revert on failure
      updateDeviceLocal(venueId, device.id, { state: device.state }); // revert
      addToast(`Failed to toggle: ${error.message || 'Check connection or device name'}`, 'error');
      console.error("Device Toggle Error:", error);
    }
  };

  const handleSliderChange = (e) => {
    setLocalValue(parseInt(e.target.value, 10));
  };

  const handleDelete = () => {
    if (window.confirm(`Delete device "${device.name}"?`)) {
      deleteDevice(venueId, device.id);
    }
  };

  return (
    <div className="card device-card">
      <div className="device-header">
        <div className="device-icon">
          {device.type === 'NORMAL' ? <Power size={20} /> : <Sun size={20} />}
        </div>
        <div className="device-info">
          <h4>{device.name}</h4>
          <span className="device-type">{device.type}</span>
        </div>
        <button className="btn-icon danger sm" onClick={handleDelete}>
          <Trash2 size={16} />
        </button>
      </div>

      <div className="device-controls">
        {device.type === 'NORMAL' ? (
          <button
            className={`btn-toggle ${device.state === 'on' ? 'active' : ''}`}
            onClick={handleToggle}
          >
            {device.state === 'on' ? 'ON' : 'OFF'}
          </button>
        ) : (
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="100"
              value={localValue}
              onChange={handleSliderChange}
              className="slider"
            />
            <span className="slider-value">{localValue}%</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeviceCard;

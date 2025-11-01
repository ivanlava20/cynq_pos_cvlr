import React, { useEffect, useState } from "react";
import { ArrowLeftIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { QRCodeSVG } from "qrcode.react";
import { store } from '../../config/env';
import { getCachedLocation, fetchCurrentLocation } from '../../processes/fetchCurrentLocation';
import './TimeEntryModal.css';

const TimeEntryModal = ({ isOpen, onClose }) => {
  const [location, setLocation] = useState(null);
  const [qrData, setQrData] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadLocationAndGenerateQR();
    }
  }, [isOpen]);

  // Auto-refresh QR code every minute
  useEffect(() => {
    if (!isOpen || !location) return;

    const checkAndUpdateQR = () => {
      const now = new Date();
      const timeString = now.toTimeString().split(':').slice(0, 2).join(':'); // HH:MM

      // If minute changed, regenerate QR code
      if (timeString !== currentTime) {
        setCurrentTime(timeString);
        generateQRCode(location);
        console.log('=== QR CODE AUTO-REFRESHED ===');
        console.log('New time:', timeString);
        console.log('==============================\n');
      }
    };

    // Check every second for minute change
    const interval = setInterval(checkAndUpdateQR, 1000);

    return () => clearInterval(interval);
  }, [isOpen, location, currentTime]);

  const loadLocationAndGenerateQR = async () => {
    setLoading(true);
    setError(null);

    try {
      let locationData = getCachedLocation();
      if (!locationData) {
        locationData = await fetchCurrentLocation();
      }

      setLocation(locationData);
      const now = new Date();
      const timeString = now.toTimeString().split(':').slice(0, 2).join(':');
      setCurrentTime(timeString);
      generateQRCode(locationData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const generateQRCode = (locationData) => {
    const currentDate = new Date();
    const timeString = currentDate.toTimeString().split(':').slice(0, 2).join(':');
    
    const qrPayload = {
      branchCode: store.branchCode,
      branchName: store.name,
      date: currentDate.toISOString().split('T')[0],
      time: timeString,
      latitude: locationData.latitude,
      longitude: locationData.longitude
    };

    setQrData(JSON.stringify(qrPayload));

    console.log('=== QR CODE DATA ===');
    console.log(JSON.stringify(qrPayload, null, 2));
    console.log('====================\n');
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);

    try {
      const locationData = await fetchCurrentLocation();
      setLocation(locationData);
      const now = new Date();
      const timeString = now.toTimeString().split(':').slice(0, 2).join(':');
      setCurrentTime(timeString);
      generateQRCode(locationData);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content time-entry-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="back-button" onClick={onClose}>
            <ArrowLeftIcon className="icon" />
          </button>
          <h2>Time Entry QR Code</h2>
        </div>

        <div className="modal-body">
          {/* Left Column - QR Code */}
          <div className="qr-column">

            <div className="info-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title">Scan QR Code</h3>
              <div className="qr-container" style={{ flex: 1 }}>
                {loading ? (
                  <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                  </div>
                ) : error ? (
                  <div className="error-container">
                    <p className="error-text">{error}</p>
                    <button className="retry-button" onClick={handleRefresh}>
                      Retry
                    </button>
                  </div>
                ) : qrData ? (
                  <div className="qr-wrapper">
                    <QRCodeSVG 
                      value={qrData} 
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right Column - Info */}
          <div className="info-column">
            {location && !loading && (
                
              <div className="info-section">

              <div className="branch-badge">
                <h3>{store.name}</h3>
                <p>Branch: {store.branch}</p>
              </div>
  
                <div className="section-header">
                  <MapPinIcon className="section-icon" />
                  <h3 className="section-title" style={{ marginBottom: 0, textAlign: 'left' }}>Location Details</h3>
                </div>
                <div className="info-grid">
                  <div className="info-row">
                    <span className="info-label">Latitude</span>
                    <span className="info-value">{location.latitude.toFixed(6)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Longitude</span>
                    <span className="info-value">{location.longitude.toFixed(6)}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Accuracy</span>
                    <span className="info-value">{location.accuracy.toFixed(2)}m</span>
                  </div>
                </div>
              </div>
            )}

            <div className="modal-actions">
              <button className="action-button refresh" onClick={handleRefresh}>
                Refresh
              </button>
              <button className="action-button close" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeEntryModal;

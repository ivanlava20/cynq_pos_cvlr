import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, CameraIcon, UserIcon } from '@heroicons/react/24/outline';
import { BrowserMultiFormatReader } from '@zxing/library';
import './ScanQRCodeModal.css';

const ScanQRCodeModal = ({ isOpen, onClose, onScanResult }) => {
  const [activeTab, setActiveTab] = useState('camera');
  const [membershipId, setMembershipId] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
      codeReaderRef.current = null;
    }

    setIsScanning(false);
    setCameraPermission(null);
  };

  const handleQRCodeDetected = (qrData) => {
    stopScanning();
    onScanResult?.(qrData);
    handleClose();
  };

  const startScanning = async () => {
    try {
      setError('');
      setCameraPermission('requesting');

      if (!videoRef.current) {
        setError('Camera element not ready.');
        setCameraPermission('denied');
        return;
      }

      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;
      setIsScanning(true);

      await codeReader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (result) {
          handleQRCodeDetected(result.getText());
        } else if (err && err.name !== 'NotFoundException') {
          setError(`Camera error: ${err.message}`);
        }
      });

      setCameraPermission('granted');
    } catch (err) {
      setError(`Camera error: ${err.message}`);
      setCameraPermission('denied');
      setIsScanning(false);

      setTimeout(() => {
        setActiveTab('manual');
        setError('Camera not available. Please use manual input.');
      }, 2000);
    }
  };

  const handleManualConfirm = () => {
    if (!membershipId.trim()) {
      setError('Please enter a membership ID');
      return;
    }

    onScanResult?.(membershipId.trim());
    setMembershipId('');
    setError('');
    handleClose();
  };

  const handleClose = () => {
    stopScanning();
    setMembershipId('');
    setError('');
    setActiveTab('camera');
    onClose?.();
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setError('');

    if (tab === 'manual') {
      stopScanning();
    }
  };

  const refreshCamera = () => {
    stopScanning();
    setTimeout(() => {
      if (activeTab === 'camera') {
        startScanning();
      }
    }, 100);
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startScanning();
    }

    return () => {
      stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="scan-qr-modal-overlay">
      <div className="scan-qr-modal-container">
        <div className="scan-qr-modal-header">
          <button className="scan-qr-back-btn" onClick={handleClose}>
            <ArrowLeftIcon className="scan-qr-back-icon" />
          </button>
          <h1>Scan Membership QR Code</h1>
        </div>

        <div className="scan-qr-tab-navigation">
          <button
            className={`scan-qr-tab-btn ${activeTab === 'camera' ? 'scan-qr-active' : ''}`}
            onClick={() => handleTabSwitch('camera')}
          >
            <CameraIcon className="scan-qr-tab-icon" />
            Camera Scan
          </button>
          <button
            className={`scan-qr-tab-btn ${activeTab === 'manual' ? 'scan-qr-active' : ''}`}
            onClick={() => handleTabSwitch('manual')}
          >
            <UserIcon className="scan-qr-tab-icon" />
            Manual Input
          </button>
        </div>

        <div className="scan-qr-modal-content">
          {activeTab === 'camera' ? (
            <div className="scan-qr-camera-section">
              <div className="scan-qr-camera-container" style={{ height: '300px', border: '2px solid #6366f1' }}>
                {isScanning && cameraPermission === 'granted' ? (
                  <>
                    <video ref={videoRef} className="scan-qr-video" autoPlay muted playsInline />
                    <div className="scan-qr-scan-overlay">
                      <div className="scan-qr-scan-frame">
                        <div className="scan-qr-corner scan-qr-top-left"></div>
                        <div className="scan-qr-corner scan-qr-top-right"></div>
                        <div className="scan-qr-corner scan-qr-bottom-left"></div>
                        <div className="scan-qr-corner scan-qr-bottom-right"></div>
                      </div>
                      <p className="scan-qr-instruction">Position QR code within the frame</p>
                    </div>
                    <button className="scan-qr-retry-btn" style={{ position: 'absolute', top: 10, right: 10 }} onClick={refreshCamera}>
                      Refresh
                    </button>
                  </>
                ) : (
                  <div className="scan-qr-camera-placeholder">
                    <CameraIcon className="scan-qr-placeholder-icon" />
                    {cameraPermission === 'requesting' ? (
                      <>
                        <p>Requesting camera access...</p>
                        <div className="scan-qr-spinner"></div>
                      </>
                    ) : cameraPermission === 'denied' ? (
                      <>
                        <p>Camera access denied</p>
                        <button className="scan-qr-retry-btn" onClick={startScanning}>
                          Try Again
                        </button>
                      </>
                    ) : (
                      <>
                        <p>Camera scanner ready</p>
                        <button className="scan-qr-retry-btn" onClick={startScanning}>
                          Start Scanning
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {error && <div className="scan-qr-error-message">{error}</div>}
            </div>
          ) : (
            <div className="scan-qr-manual-section">
              <h2>Enter Membership ID</h2>
              <p className="scan-qr-manual-description">
                If you can't scan the QR code, please enter the membership ID manually.
              </p>

              <div className="scan-qr-manual-input-group">
                <input
                  type="text"
                  placeholder="Enter Membership ID (e.g., MBR12345)"
                  value={membershipId}
                  onChange={(e) => setMembershipId(e.target.value)}
                  className="scan-qr-manual-input"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualConfirm();
                    }
                  }}
                />
                <button className="scan-qr-confirm-btn" onClick={handleManualConfirm} disabled={!membershipId.trim()}>
                  Confirm
                </button>
              </div>

              {error && <div className="scan-qr-error-message">{error}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanQRCodeModal;

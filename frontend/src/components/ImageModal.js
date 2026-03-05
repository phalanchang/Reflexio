import React, { useEffect } from 'react';
import './ImageModal.css';

const API_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:3002`;

function ImageModal({ image, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!image) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="image-modal-overlay" onClick={handleOverlayClick}>
      <div className="image-modal-content">
        <img
          src={`${API_URL}/api/wishes/images/${image.id}`}
          alt={image.original_name || 'image'}
        />
      </div>
      <button className="image-modal-close" onClick={onClose}>
        &times;
      </button>
      {image.original_name && (
        <div className="image-modal-filename">{image.original_name}</div>
      )}
    </div>
  );
}

export default ImageModal;

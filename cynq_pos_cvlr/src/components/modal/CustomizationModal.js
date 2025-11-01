import React, { useState } from 'react';
import { XMarkIcon } from "@heroicons/react/24/outline";
import './CustomizationModal.css';

const CustomizationModal = ({ isOpen, onClose, product, selectedSize, quantity, addOnsList, notesList, onAddOrder, triggerRef }) => {
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [customNote, setCustomNote] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const modalRef = React.useRef(null);

  // Reset all selections when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAddOns([]);
      setSelectedNotes([]);
      setCustomNote('');
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && triggerRef?.current && modalRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const modalWidth = 420;
      const modalHeight = modalRef.current.scrollHeight || 600;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      // Start position near the clicked card
      let top = triggerRect.top + scrollY;
      let left = triggerRect.right + scrollX + 10; // 10px gap from the card

      // Adjust horizontal position
      if (left + modalWidth > viewportWidth + scrollX) {
        // Try positioning to the left of the card
        left = triggerRect.left + scrollX - modalWidth - 10;
        
        // If still doesn't fit, center it horizontally
        if (left < scrollX + 10) {
          left = Math.max(scrollX + 10, (viewportWidth - modalWidth) / 2 + scrollX);
        }
      }

      // Ensure minimum left margin
      left = Math.max(scrollX + 10, left);

      // Adjust vertical position
      if (top + modalHeight > viewportHeight + scrollY) {
        // Try to fit above
        top = Math.max(scrollY + 10, triggerRect.bottom + scrollY - modalHeight);
        
        // If still doesn't fit, position at top with margin
        if (top < scrollY + 10) {
          top = scrollY + 10;
        }
      }

      // Ensure minimum top margin
      top = Math.max(scrollY + 10, top);

      setPosition({ top, left });
    }
  }, [isOpen, triggerRef]);

  if (!isOpen || !product || !selectedSize) return null;

  const handleAddOnToggle = (addOn) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.addOnCode === addOn.addOnCode);
      if (exists) {
        return prev.filter(a => a.addOnCode !== addOn.addOnCode);
      } else {
        return [...prev, addOn];
      }
    });
  };

  const handleNoteToggle = (note) => {
    setSelectedNotes(prev => {
      const exists = prev.find(n => n.noteId === note.noteId);
      if (exists) {
        return prev.filter(n => n.noteId !== note.noteId);
      } else {
        return [...prev, note];
      }
    });
  };

  const calculateTotal = () => {
    const basePrice = selectedSize.price * quantity;
    const addOnsTotal = selectedAddOns.reduce((sum, addOn) => sum + (addOn.addOnPrice * quantity), 0);
    return basePrice + addOnsTotal;
  };

  const handleClose = () => {
    // Reset all selections
    setSelectedAddOns([]);
    setSelectedNotes([]);
    setCustomNote('');
    onClose();
  };

  const handleAddOrder = () => {
    const addOnsText = selectedAddOns.length > 0 
      ? selectedAddOns.map(a => a.addOnDesc).join(', ') 
      : 'None';
    
    const notesArray = [...selectedNotes.map(n => n.noteDesc)];
    if (customNote.trim()) {
      notesArray.push(customNote.trim());
    }
    const notesText = notesArray.length > 0 ? notesArray.join(', ') : 'NA';

    onAddOrder({
      addOns: addOnsText,
      notes: notesText,
      totalAmount: calculateTotal()
    });

    // Reset and close
    handleClose();
  };

  return (
    <div className="customization-modal-overlay" onClick={handleClose}>
      <div 
        ref={modalRef}
        className="customization-modal-container popup-style" 
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={handleClose}>
          <XMarkIcon className="close-icon" />
        </button>

        <h1>Customize <strong>{product.productName}</strong></h1>
        
        <div className="customization-info">
          <div className="info-item">
            <span className="label">Size</span>
            <span className="value">{selectedSize.size}</span>
          </div>
          <div className="info-item">
            <span className="label">Quantity</span>
            <span className="value">{quantity}</span>
          </div>
        </div>

        <div className="customization-section">
          <h2>Add-Ons</h2>
          <div className="addons-list">
            {addOnsList.map((addOn) => {
              const isSelected = selectedAddOns.find(a => a.addOnCode === addOn.addOnCode);
              return (
                <div 
                  key={addOn.addOnCode} 
                  className={`addon-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleAddOnToggle(addOn)}
                >
                  <div className="checkbox">
                    {isSelected && <span className="checkmark">✓</span>}
                  </div>
                  <span className="addon-text">
                    {addOn.addOnDesc} - ₱{addOn.addOnPrice}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="customization-section">
          <h2>Notes</h2>
          <div className="notes-chips">
            {notesList.map((note) => {
              const isSelected = selectedNotes.find(n => n.noteId === note.noteId);
              return (
                <button
                  key={note.noteId}
                  className={`note-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleNoteToggle(note)}
                >
                  {note.noteDesc}
                </button>
              );
            })}
          </div>
          <textarea
            placeholder="Additional notes..."
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            className="notes-textarea"
          />
        </div>

        <div className="modal-footer">
          <div className="total">
            <span>Total</span>
            <span className="total-amount">₱{calculateTotal()}</span>
          </div>
          <div className="footer-buttons">
            <button className="customize-more-btn" onClick={handleClose}>
              Back
            </button>
            <button className="add-order-btn" onClick={handleAddOrder}>
              Add Order 🛒
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomizationModal;
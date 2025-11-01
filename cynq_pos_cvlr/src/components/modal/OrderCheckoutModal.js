import React, { useState } from 'react';
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import './OrderCheckoutModal.css';

const OrderCheckoutModal = ({ 
  isOpen, 
  onClose, 
  orderDetails,
  orderItems,
  tableDetails,
  queueDetails,
  discountDetails,
  mainDetails
}) => {
  
  const [inputAmount, setInputAmount] = useState('');

  // Get orderTotal from mainDetails
  const orderTotal = mainDetails?.totalAmount ? parseFloat(mainDetails.totalAmount) : 0;

  //Retrieve From Firebase
  const paymentMethodsList = [
    { paymentMethodCode: 'CASH', paymentMethodDesc: 'Cash'},
    { paymentMethodCode: 'MAYA', paymentMethodDesc: 'Maya'},
    { paymentMethodCode: 'GCAS', paymentMethodDesc: 'GCash'},
    { paymentMethodCode: 'CARD', paymentMethodDesc: 'Card'},
    { paymentMethodCode: 'GTYM', paymentMethodDesc: 'GoTyme'}
  ];

  const [paymentMethods, setPaymentMethods] = useState([]);
  
  // Set CASH as default payment method
  const [modeOfPayment, setModeOfPayment] = useState('CASH');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const totalPaid = paymentMethods.reduce((sum, payment) => sum + payment.paymentAmount, 0);
  const change = totalPaid - orderTotal;

  const handleNumberClick = (num) => {
    if (num === 10 || num === 100 || num === 1000) {
      // Add to current value
      const currentValue = parseFloat(inputAmount) || 0;
      setInputAmount((currentValue + num).toString());
    } else {
      // Concatenate for single digits
      setInputAmount(prev => prev + num.toString());
    }
  };

  const handleClear = () => {
    setInputAmount('');
  };

  const handleBackspace = () => {
    setInputAmount(prev => prev.slice(0, -1));
  };

  const handleApply = () => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Validate reference number for non-CASH payments
    if (modeOfPayment !== 'CASH' && !referenceNumber.trim()) {
      alert('Please enter a reference number for this payment method');
      return;
    }

    // Check if payment method already exists
    const existingPayment = paymentMethods.find(p => p.modeOfPayment === modeOfPayment);
    if (existingPayment) {
      const methodDesc = paymentMethodsList.find(
        m => m.paymentMethodCode === modeOfPayment
      )?.paymentMethodDesc || modeOfPayment;
      alert(`${methodDesc} payment method has already been added. Please remove it first if you want to change the amount.`);
      return;
    }

    // Get the next ID
    const nextId = paymentMethods.length > 0 
      ? Math.max(...paymentMethods.map(p => p.id)) + 1 
      : 1;

    // Create new payment object
    const newPayment = {
      id: nextId,
      modeOfPayment: modeOfPayment,
      paymentAmount: parseFloat(inputAmount),
      referenceNumber: modeOfPayment === 'CASH' ? '' : referenceNumber.trim()
    };

    // Add to paymentMethods
    setPaymentMethods(prev => [...prev, newPayment]);

    // Reset fields
    setInputAmount('');
    setModeOfPayment('CASH');
    setReferenceNumber('');
    setPaymentAmount('');
  };

  const handleRemovePayment = (id) => {
    setPaymentMethods(prev => prev.filter(payment => payment.id !== id));
  };

  // Add handler for Complete and Print Receipt
  const handleCompletePayment = () => {
    // Check if there are any payments
    if (paymentMethods.length === 0) {
      alert('Please add at least one payment method');
      return;
    }

    // Calculate total paid
    const totalPaid = paymentMethods.reduce((sum, payment) => sum + payment.paymentAmount, 0);
    const difference = orderTotal - totalPaid;

    let adjustedPayments = [...paymentMethods];

    // If there's a difference, adjust CASH payment
    if (difference !== 0) {
      // Find CASH payment
      const cashPaymentIndex = adjustedPayments.findIndex(p => p.modeOfPayment === 'CASH');
      
      if (cashPaymentIndex !== -1) {
        // Adjust existing CASH payment
        adjustedPayments[cashPaymentIndex] = {
          ...adjustedPayments[cashPaymentIndex],
          paymentAmount: adjustedPayments[cashPaymentIndex].paymentAmount + difference
        };
        
        console.log('CASH payment adjusted:');
        console.log('Previous amount:', adjustedPayments[cashPaymentIndex].paymentAmount - difference);
        console.log('New amount:', adjustedPayments[cashPaymentIndex].paymentAmount);
      } else {
        // No CASH payment exists, create one with the difference
        const nextId = adjustedPayments.length > 0 
          ? Math.max(...adjustedPayments.map(p => p.id)) + 1 
          : 1;
        
        const newCashPayment = {
          id: nextId,
          modeOfPayment: 'CASH',
          paymentAmount: difference,
          referenceNumber: ''
        };
        
        adjustedPayments.push(newCashPayment);
        
        console.log('New CASH payment created:', newCashPayment);
      }
    }

    // Calculate final totals
    const finalTotalPaid = adjustedPayments.reduce((sum, payment) => sum + payment.paymentAmount, 0);
    const finalChange = finalTotalPaid - orderTotal;

    // Log the results
    console.log('=== PAYMENT COMPLETION SUMMARY ===');
    console.log('Order Total:', orderTotal.toFixed(2));
    console.log('Original Total Paid:', totalPaid.toFixed(2));
    console.log('Difference:', difference.toFixed(2));
    console.log('\n--- Adjusted Payment Methods ---');
    adjustedPayments.forEach((payment, index) => {
      const methodDesc = paymentMethodsList.find(
        m => m.paymentMethodCode === payment.modeOfPayment
      )?.paymentMethodDesc || payment.modeOfPayment;
      
      console.log(`${index + 1}. ${methodDesc}:`);
      console.log(`   Amount: ₱${payment.paymentAmount.toFixed(2)}`);
      if (payment.referenceNumber) {
        console.log(`   Reference: ${payment.referenceNumber}`);
      }
    });
    console.log('\n--- Final Totals ---');
    console.log('Final Total Paid:', finalTotalPaid.toFixed(2));
    console.log('Final Change:', finalChange.toFixed(2));
    console.log('Verified Match:', finalTotalPaid === orderTotal ? '✓ YES' : '✗ NO');
    console.log('===============================\n');

    // Log all order data
    console.log('=== COMPLETE ORDER DATA ===');
    console.log('Order Details:', orderDetails);
    console.log('Order Items:', orderItems);
    console.log('Table Details:', tableDetails);
    console.log('Queue Details:', queueDetails);
    console.log('Discount Details:', discountDetails);
    console.log('Main Details:', mainDetails);
    console.log('Payment Methods:', adjustedPayments);
    console.log('==========================\n');

    // Update the state with adjusted payments
    setPaymentMethods(adjustedPayments);

    // Show summary alert
    alert(`Payment Complete!\n\nOrder Total: ₱${orderTotal.toFixed(2)}\nTotal Paid: ₱${finalTotalPaid.toFixed(2)}\nChange: ₱${finalChange.toFixed(2)}\n\nCheck console for detailed breakdown.`);

    // TODO: Proceed with receipt printing
    // onClose(); // Close modal after completion
  };

  // Add handler for payment method change
  const handlePaymentMethodChange = (e) => {
    const newPaymentMethod = e.target.value;
    setModeOfPayment(newPaymentMethod);
    
    // Reset input amount when payment method changes
    setInputAmount('');
    
    // Also reset reference number if switching to/from CASH
    if (newPaymentMethod === 'CASH') {
      setReferenceNumber('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <button className="back-btn" onClick={onClose}>
            <ArrowLeftIcon className="back-icon" />
          </button>
          <h1>Payment</h1>
        </div>

        <div className="modal-content">
          {/* Payment Summary */}
          <section className="payment-section">
            <h2>Payment Summary</h2>
            <div className="summary-row">
              <span>Total</span>
              <span className="amount">₱{orderTotal.toFixed(2)}</span>
            </div>
          </section>

          {/* Payment Methods */}
          <section className="payment-section">
            <h2>Payment Methods</h2>
            {paymentMethods.length > 0 ? (
              <>
                {paymentMethods.map((payment) => {
                  const methodDesc = paymentMethodsList.find(
                    m => m.paymentMethodCode === payment.modeOfPayment
                  )?.paymentMethodDesc || payment.modeOfPayment;
                  
                  return (
                    <div key={payment.id} className="summary-row payment-item">
                      <div className="payment-info">
                        <span>{methodDesc}</span>
                        {payment.referenceNumber && (
                          <span className="reference-number">Ref: {payment.referenceNumber}</span>
                        )}
                      </div>
                      <div className="payment-actions">
                        <span className="amount negative">-₱{payment.paymentAmount.toFixed(2)}</span>
                        <button 
                          className="remove-btn" 
                          onClick={() => handleRemovePayment(payment.id)}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div className="summary-row total-row">
                  <span>{change >= 0 ? 'Change' : 'Remaining Payment'}</span>
                  <span className={`amount ${change >= 0 ? 'positive' : 'negative'}`}>
                    ₱{change >= 0 ? change.toFixed(2) : Math.abs(change).toFixed(2)}
                  </span>
                </div>
              </>
            ) : (
              <p className="empty-message">No payments added yet</p>
            )}
          </section>

          {/* Payment Method */}
          <section className="payment-section">
            <h2>Payment Method</h2>
            <select 
              value={modeOfPayment}
              onChange={handlePaymentMethodChange}
              className="payment-select"
            >
              {paymentMethodsList.map((method) => (
                <option 
                  key={method.paymentMethodCode} 
                  value={method.paymentMethodCode}
                >
                  {method.paymentMethodDesc}
                </option>
              ))}
            </select>
          </section>

          {/* Reference Number - Only show for non-CASH payments */}
          {modeOfPayment !== 'CASH' && (
            <section className="payment-section">
              <h2>Reference Number</h2>
              <input 
                type="text" 
                placeholder="Enter reference number"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="reference-input"
              />
            </section>
          )}

          {/* Input Amount */}
          <section className="payment-section">
            <h2>Input Amount</h2>
            <div className="input-group">
              <input 
                type="text" 
                placeholder="Amount"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                className="amount-input"
              />
              <button className="apply-btn-small" onClick={handleApply}>
                Apply
              </button>
            </div>
          </section>

          {/* Number Pad */}
          <div className="number-pad">
            <button onClick={() => handleNumberClick(1)}>1</button>
            <button onClick={() => handleNumberClick(2)}>2</button>
            <button onClick={() => handleNumberClick(3)}>3</button>
            <button className="function-btn" onClick={handleClear}>C</button>
            
            <button onClick={() => handleNumberClick(4)}>4</button>
            <button onClick={() => handleNumberClick(5)}>5</button>
            <button onClick={() => handleNumberClick(6)}>6</button>
            <button className="function-btn" onClick={handleBackspace}>←</button>
            
            <button onClick={() => handleNumberClick(7)}>7</button>
            <button onClick={() => handleNumberClick(8)}>8</button>
            <button onClick={() => handleNumberClick(9)}>9</button>
            <button className="function-btn" onClick={() => setInputAmount(prev => prev + '.')}>.</button>
            
            <button className="function-btn" onClick={() => handleNumberClick(10)}>10</button>
            <button onClick={() => handleNumberClick(0)}>0</button>
            <button className="function-btn" onClick={() => handleNumberClick(100)}>100</button>
            <button className="function-btn" onClick={() => handleNumberClick(1000)}>1000</button>
          </div>

          {/* Complete Button */}
          <button className="complete-btn" onClick={handleCompletePayment}>
            Complete and Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCheckoutModal;
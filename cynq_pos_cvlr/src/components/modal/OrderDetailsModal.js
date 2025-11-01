import React, { useState, useEffect } from 'react';
import { XMarkIcon } from "@heroicons/react/24/outline";
import './OrderDetailsModal.css';

const OrderDetailsModal = ({ isOpen, onClose, orderData }) => {
  const [fullOrderData, setFullOrderData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock database of full order details
  const orderDatabase = [
    {
      mainDetails: {
        branchCode: 'BR001',
        customerName: 'Mikaela Santos',
        id: 'GB002',
        totalAmount: 310.00,
        transactionId: 'TXN2024001'
      },
      discountDetails: {
        discountAmount: 0,
        discountCode: '',
        discountDescription: ''
      },
      queueDetails: {
        orderStatus: 'MAKE',
        elapsedTime: '0:00',
        timeCompleted: null
      },
      tableDetails: {
        retekessNumber: 'R123',
        tableNumber: ''
      },
      orderDetails: {
        consumeMethod: 'TAKE',
        orderChange: 0,
        orderDate: '2024-10-28',
        orderMode: 'GB',
        orderNo: 'GB002',
        orderNote: 'Extra hot',
        orderTakenBy: 'Staff001',
        orderTime: '14:30:00'
      },
      orderItems: [
        {
          addOns: 'Oat Milk',
          id: '1234567',
          itemCategory: 'HCD',
          itemId: 'HCD001',
          itemName: 'Spanish Latte',
          itemNotes: 'Less Ice, Hot',
          itemPrice: 135,
          itemQuantity: 2,
          itemSize: 'M',
          itemStatus: 'MAKE',
          itemTotalAmount: 300
        },
        {
          addOns: 'None',
          id: '1234568',
          itemCategory: 'PST',
          itemId: 'PST001',
          itemName: 'Tiramisu',
          itemNotes: 'NA',
          itemPrice: 180,
          itemQuantity: 1,
          itemSize: 'STD',
          itemStatus: 'MAKE',
          itemTotalAmount: 180
        }
      ],
      paymentMethods: [
        {
          id: 'PM001',
          modeOfPayment: 'GrabPay',
          paymentAmount: 310.00,
          referenceNumber: 'GRAB123456'
        }
      ]
    },
    {
      mainDetails: {
        branchCode: 'BR001',
        customerName: 'John Doe',
        id: 'GB001',
        totalAmount: 155.00,
        transactionId: 'TXN2024000'
      },
      discountDetails: {
        discountAmount: 0,
        discountCode: '',
        discountDescription: ''
      },
      queueDetails: {
        orderStatus: 'DONE',
        elapsedTime: '5:00',
        timeCompleted: '14:25:00'
      },
      tableDetails: {
        retekessNumber: '',
        tableNumber: ''
      },
      orderDetails: {
        consumeMethod: 'TAKE',
        orderChange: 45.00,
        orderDate: '2024-10-28',
        orderMode: 'GB',
        orderNo: 'GB001',
        orderNote: '',
        orderTakenBy: 'Staff001',
        orderTime: '14:20:00'
      },
      orderItems: [
        {
          addOns: 'None',
          id: '1234565',
          itemCategory: 'TEA',
          itemId: 'TEA001',
          itemName: 'Hojicha Latte',
          itemNotes: 'NA',
          itemPrice: 155,
          itemQuantity: 1,
          itemSize: 'M',
          itemStatus: 'DONE',
          itemTotalAmount: 155
        }
      ],
      paymentMethods: [
        {
          id: 'PM000',
          modeOfPayment: 'Cash',
          paymentAmount: 200.00,
          referenceNumber: ''
        }
      ]
    },
    {
      mainDetails: {
        branchCode: 'BR001',
        customerName: 'Ivan Lava',
        id: 'OS001',
        totalAmount: 454.00,
        transactionId: 'TXN2024002'
      },
      discountDetails: {
        discountAmount: 20.00,
        discountCode: 'P20',
        discountDescription: '20%'
      },
      queueDetails: {
        orderStatus: 'MAKE',
        elapsedTime: '0:00',
        timeCompleted: null
      },
      tableDetails: {
        retekessNumber: 'R456',
        tableNumber: 'T05'
      },
      orderDetails: {
        consumeMethod: 'DINE',
        orderChange: 0,
        orderDate: '2024-10-28',
        orderMode: 'OS',
        orderNo: 'OS001',
        orderNote: 'Anniversary celebration',
        orderTakenBy: 'Staff002',
        orderTime: '14:35:00'
      },
      orderItems: [
        {
          addOns: 'Vanilla, Sugar',
          id: '1234569',
          itemCategory: 'HCD',
          itemId: 'HCD001',
          itemName: 'Spanish Latte',
          itemNotes: 'Less Sugar, Cold',
          itemPrice: 105,
          itemQuantity: 2,
          itemSize: 'M',
          itemStatus: 'MAKE',
          itemTotalAmount: 265
        },
        {
          addOns: 'None',
          id: '1234570',
          itemCategory: 'FOD',
          itemId: 'FOD001',
          itemName: 'Lasagna',
          itemNotes: 'NA',
          itemPrice: 209,
          itemQuantity: 1,
          itemSize: 'STD',
          itemStatus: 'MAKE',
          itemTotalAmount: 209
        }
      ],
      paymentMethods: [
        {
          id: 'PM002',
          modeOfPayment: 'Cash',
          paymentAmount: 500.00,
          referenceNumber: ''
        }
      ]
    },
    {
      mainDetails: {
        branchCode: 'BR001',
        customerName: 'Maria Cruz',
        id: 'FP001',
        totalAmount: 305.00,
        transactionId: 'TXN2024003'
      },
      discountDetails: {
        discountAmount: 50.00,
        discountCode: 'V50',
        discountDescription: '50 PESOS DISCOUNT'
      },
      queueDetails: {
        orderStatus: 'MAKE',
        elapsedTime: '0:00',
        timeCompleted: null
      },
      tableDetails: {
        retekessNumber: '',
        tableNumber: ''
      },
      orderDetails: {
        consumeMethod: 'DELI',
        orderChange: 0,
        orderDate: '2024-10-28',
        orderMode: 'FP',
        orderNo: 'FP001',
        orderNote: 'Leave at door',
        orderTakenBy: 'Staff001',
        orderTime: '14:40:00'
      },
      orderItems: [
        {
          addOns: 'Oat Milk',
          id: '1234571',
          itemCategory: 'HCD',
          itemId: 'HCD001',
          itemName: 'Spanish Latte',
          itemNotes: 'Hot',
          itemPrice: 125,
          itemQuantity: 1,
          itemSize: 'M',
          itemStatus: 'MAKE',
          itemTotalAmount: 140
        },
        {
          addOns: 'None',
          id: '1234572',
          itemCategory: 'PST',
          itemId: 'PST001',
          itemName: 'Tiramisu',
          itemNotes: 'NA',
          itemPrice: 180,
          itemQuantity: 1,
          itemSize: 'STD',
          itemStatus: 'MAKE',
          itemTotalAmount: 180
        }
      ],
      paymentMethods: [
        {
          id: 'PM003',
          modeOfPayment: 'Foodpanda',
          paymentAmount: 305.00,
          referenceNumber: 'FP789012'
        }
      ]
    }
  ];

  // Fetch full order details when modal opens
  useEffect(() => {
    if (isOpen && orderData) {
      setLoading(true);
      
      const matchedOrder = orderDatabase.find(order => 
        order.orderDetails.orderNo === orderData.orderNo &&
        order.orderDetails.orderDate === orderData.orderDate &&
        order.mainDetails.branchCode === orderData.branchCode
      );

      setTimeout(() => {
        setFullOrderData(matchedOrder || null);
        setLoading(false);
      }, 300);
    }
  }, [isOpen, orderData]);

  // Handle marking individual item as done
  const handleMarkItemDone = (itemId) => {
    setFullOrderData(prevData => ({
      ...prevData,
      orderItems: prevData.orderItems.map(item =>
        item.id === itemId ? { ...item, itemStatus: 'DONE' } : item
      )
    }));
  };

  // Handle marking all items as done
  const handleMarkAllDone = () => {
    setFullOrderData(prevData => ({
      ...prevData,
      queueDetails: {
        ...prevData.queueDetails,
        orderStatus: 'DONE',
        timeCompleted: new Date().toLocaleTimeString('en-US', { hour12: false })
      },
      orderItems: prevData.orderItems.map(item => ({ ...item, itemStatus: 'DONE' }))
    }));
    
    // TODO: In production, send update to backend/database
    // Example: updateOrderStatus(orderData.orderNo, 'DONE', updatedItems)
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="order-details-modal-overlay">
        <div className="order-details-modal-container">
          <div className="loading-state">Loading order details...</div>
        </div>
      </div>
    );
  }

  if (!fullOrderData) {
    return (
      <div className="order-details-modal-overlay" onClick={onClose}>
        <div className="order-details-modal-container" onClick={(e) => e.stopPropagation()}>
          <button className="close-btn" onClick={onClose}>
            <XMarkIcon className="close-icon" />
          </button>
          <div className="error-state">Order not found</div>
          <button className="close-modal-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const { mainDetails, discountDetails, queueDetails, tableDetails, orderDetails, orderItems, paymentMethods } = fullOrderData;
  const isMakeStatus = queueDetails.orderStatus === 'MAKE';
  const allItemsDone = orderItems.every(item => item.itemStatus === 'DONE');

  return (
    <div className="order-details-modal-overlay" onClick={onClose}>
      <div className="order-details-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          <XMarkIcon className="close-icon" />
        </button>

        <h1>Order Details: {orderDetails.orderNo} - {mainDetails.customerName}</h1>

        {/* Order Items */}
        <section className="details-section">
          <h2>Order Items</h2>
          <div className="items-list">
            {orderItems.map((item) => (
              <div key={item.id} className={`item-card ${item.itemStatus === 'DONE' ? 'item-done' : ''}`}>
                <div className="item-header">
                  <h3>{item.itemName}</h3>
                  <div className="item-header-right">
                    {item.itemStatus === 'DONE' && (
                      <span className="item-status-badge done">✓ DONE</span>
                    )}
                    <span className="item-total">₱{item.itemTotalAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="item-details">
                  <span>Size: {item.itemSize}</span>
                  <span>Qty: {item.itemQuantity}</span>
                  {!isMakeStatus && <span>Price: ₱{item.itemPrice}</span>}
                </div>
                {item.addOns !== 'None' && (
                  <div className="item-addons">
                    <strong>Add-ons:</strong> {item.addOns}
                  </div>
                )}
                {item.itemNotes !== 'NA' && (
                  <div className="item-notes">
                    <strong>Notes:</strong> {item.itemNotes}
                  </div>
                )}
                {isMakeStatus && item.itemStatus !== 'DONE' && (
                  <button 
                    className="mark-item-done-btn"
                    onClick={() => handleMarkItemDone(item.id)}
                  >
                    Mark as Done
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {isMakeStatus && !allItemsDone && (
            <button 
              className="mark-all-done-btn"
              onClick={handleMarkAllDone}
            >
              MARK ALL AS DONE
            </button>
          )}
        </section>

        {/* Main Details */}
        <section className="details-section">
          <h2>Transaction Information</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">Transaction ID:</span>
              <span className="value">{mainDetails.transactionId}</span>
            </div>
            <div className="detail-item">
              <span className="label">Order No:</span>
              <span className="value">{mainDetails.id}</span>
            </div>
            <div className="detail-item">
              <span className="label">Customer Name:</span>
              <span className="value">{mainDetails.customerName}</span>
            </div>
            <div className="detail-item">
              <span className="label">Branch:</span>
              <span className="value">{mainDetails.branchCode}</span>
            </div>
            <div className="detail-item">
              <span className="label">Total Amount:</span>
              <span className="value highlight">₱{mainDetails.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </section>

        {/* Order Details */}
        <section className="details-section">
          <h2>Order Information</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">Order Mode:</span>
              <span className="value">{orderDetails.orderMode}</span>
            </div>
            <div className="detail-item">
              <span className="label">Consume Method:</span>
              <span className="value">{orderDetails.consumeMethod}</span>
            </div>
            <div className="detail-item">
              <span className="label">Order Date:</span>
              <span className="value">{orderDetails.orderDate}</span>
            </div>
            <div className="detail-item">
              <span className="label">Order Time:</span>
              <span className="value">{orderDetails.orderTime}</span>
            </div>
            <div className="detail-item">
              <span className="label">Taken By:</span>
              <span className="value">{orderDetails.orderTakenBy}</span>
            </div>
            <div className="detail-item">
              <span className="label">Change:</span>
              <span className="value">₱{orderDetails.orderChange.toFixed(2)}</span>
            </div>
            {orderDetails.orderNote && (
              <div className="detail-item full-width">
                <span className="label">Notes:</span>
                <span className="value">{orderDetails.orderNote}</span>
              </div>
            )}
          </div>
        </section>

        {/* Queue Details */}
        <section className="details-section">
          <h2>Queue Information</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">Status:</span>
              <span className={`value status-${queueDetails.orderStatus.toLowerCase()}`}>
                {queueDetails.orderStatus}
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Elapsed Time:</span>
              <span className="value">{queueDetails.elapsedTime}</span>
            </div>
            {queueDetails.timeCompleted && (
              <div className="detail-item">
                <span className="label">Time Completed:</span>
                <span className="value">{queueDetails.timeCompleted}</span>
              </div>
            )}
          </div>
        </section>

        {/* Table Details */}
        {(tableDetails.tableNumber || tableDetails.retekessNumber) && (
          <section className="details-section">
            <h2>Table Information</h2>
            <div className="details-grid">
              {tableDetails.tableNumber && (
                <div className="detail-item">
                  <span className="label">Table Number:</span>
                  <span className="value">{tableDetails.tableNumber}</span>
                </div>
              )}
              {tableDetails.retekessNumber && (
                <div className="detail-item">
                  <span className="label">Retekess Number:</span>
                  <span className="value">{tableDetails.retekessNumber}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Discount Details */}
        {discountDetails.discountCode && (
          <section className="details-section">
            <h2>Discount Applied</h2>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Discount Code:</span>
                <span className="value">{discountDetails.discountCode}</span>
              </div>
              <div className="detail-item">
                <span className="label">Description:</span>
                <span className="value">{discountDetails.discountDescription}</span>
              </div>
              <div className="detail-item">
                <span className="label">Amount:</span>
                <span className="value discount">-₱{discountDetails.discountAmount.toFixed(2)}</span>
              </div>
            </div>
          </section>
        )}

        {/* Payment Methods */}
        <section className="details-section">
          <h2>Payment Methods</h2>
          <div className="payment-list">
            {paymentMethods.map((payment) => (
              <div key={payment.id} className="payment-card">
                <div className="payment-method">{payment.modeOfPayment}</div>
                <div className="payment-amount">₱{payment.paymentAmount.toFixed(2)}</div>
                {payment.referenceNumber && (
                  <div className="payment-reference">Ref: {payment.referenceNumber}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <button className="close-modal-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
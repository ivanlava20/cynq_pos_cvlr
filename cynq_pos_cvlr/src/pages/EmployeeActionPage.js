import React, { useState } from 'react';
import { 
  ClockIcon, 
  HomeIcon, 
  UserGroupIcon, 
  ArrowRightOnRectangleIcon 
} from "@heroicons/react/24/outline";
import TimeEntryModal from '../components/modal/TimeEntryModal';
import './EmployeeActionPage.css';
import { store } from '../config/env';

const EmployeeActionPage = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('monitoring');
  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false);

  // Mock data
  //Retrieve From Firebase
  const storeInfo = {
    branchName: 'Waltermart Taytay',
    status: 'OPEN',
    operatingHours: '09:00 AM - 09:00 PM',
    openingTime: '09:00 AM',
    closingTime: '09:00 PM',
    openedBy: 'Von Emmanuel Lava',
    closedBy: 'Von Emmanuel Lava'
  };

  //Retrieve From Firebase
  const expenses = [
    { receiptNumber: '9097', itemName: 'Sdlecks', quantity: 2, price: 162, totalAmount: 162 },
    { receiptNumber: '4057', itemName: 'Haritkaya', quantity: 1, price: 231, totalAmount: 231 }
  ];

  //Retrieve From Firebase
  const deposits = [
    { depositId: '603 34 55659', amountDeposited: 24743.05 }
  ];

  //Retrieve From Firebase
  const staffing = [
    { 
      employee: 'Mathilda Bell', 
      timeIn: '09:00 AM', 
      breakIn: '12:00 NN', 
      breakOut: '09:00 AM', 
      timeOut: '12:00 NN' 
    },
    { 
      employee: 'Marion Figueroa', 
      timeIn: '09:00 AM', 
      breakIn: '11:00 AM', 
      breakOut: '09:00 AM', 
      timeOut: '12:00 NN' 
    }
  ];

  //Retrieve From Firebase
  const checklist = [
    { id: 1, label: 'Marketing dashboard app', completed: false },
    { id: 2, label: 'Create new version 4.0', completed: false },
    { id: 3, label: 'User Testing', completed: true },
    { id: 4, label: 'Design system', completed: true },
    { id: 5, label: 'Awesome task', completed: false },
    { id: 6, label: 'Marketing dashboard concept', completed: true }
  ];

  const [checklistItems, setChecklistItems] = useState(checklist);

  //Retrieve From Firebase
  const dailySales = {
    totalSale: 22880.50,
    transactionCount: 16,
    totalCupsSold: 16,
    small: 8,
    medium: 2,
    large: 6,
    foodSold: 16,
    pastriesSold: 16
  };

  //Retrieve From Firebase
  const salesBreakdown = [
    { type: 'Cash Transactions', amount: 2500.00, transactions: 12 },
    { type: 'GCash Transactions', amount: 2500.00, transactions: 12 },
    { type: 'Card Transactions', amount: 2500.00, transactions: 12 },
    { type: 'GRAB Transactions', amount: 2500.00, transactions: 12 }
  ];

  //Retrieve From Firebase
  const onlineBreakdown = [
    { type: 'FoodPanda Transactions', amount: 2500.00, transactions: 12 },
    { type: 'Grab Transactions', amount: 2500.00, transactions: 12 },
    { type: 'Foodpanda Transactions', amount: 2500.00, transactions: 12 }
  ];

  const handleChecklistToggle = (id) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleCompleteAll = () => {
    setChecklistItems(prev =>
      prev.map(item => ({ ...item, completed: true }))
    );
  };

  return (
    <div className="employee-action-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-left">
          <h1>Employee Monitoring </h1>
          <h5>{store.name} {store.branch}</h5>
        </div>
        <div className="header-right">
          <button 
            className="header-btn time-entry"
            onClick={() => setIsTimeEntryModalOpen(true)}
          >
            <ClockIcon className="btn-icon" />
            TIME ENTRY SCAN
          </button>
          <button className="header-btn" onClick={() => navigation.navigate('Home')}>
            <HomeIcon className="btn-icon" />
            Main
          </button>
          <button className="header-btn active">
            <UserGroupIcon className="btn-icon" />
            Employee
          </button>
          <button className="header-btn logout" onClick={() => navigation.navigate('Login')}>
            <ArrowRightOnRectangleIcon className="btn-icon" />
            Logout
          </button>
        </div>
      </header>

      <div className="page-content">
        {/* Left Section */}
        <div className="left-section">
          {/* Store Management */}
          <div className="card store-management">
            <h2>Store Management</h2>
            <div className="store-info">
              <div className="store-header">
                <span className="branch-name">Branch: {storeInfo.branchName}</span>
                <span className={`store-status ${storeInfo.status.toLowerCase()}`}>
                  {storeInfo.status}
                </span>
              </div>
              <p className="operating-hours">
                Operating Hours: {storeInfo.operatingHours}
              </p>
              <div className="time-display">
                <div className="time-box">
                  <label>Opening Time</label>
                  <div className="time">{storeInfo.openingTime}</div>
                </div>
                <div className="time-box">
                  <label>Closing Time</label>
                  <div className="time">{storeInfo.closingTime}</div>
                </div>
              </div>
              <div className="store-footer">
                <span>Opened By: {storeInfo.openedBy}</span>
                <span>Closed By: {storeInfo.closedBy}</span>
              </div>
              <button className="close-store-btn">Close Store</button>
            </div>
          </div>

          {/* Checklist */}
          <div className="card checklist">
            <div className="card-header">
              <h2>Checklist</h2>
              <button className="menu-btn">⋮</button>
            </div>
            <p className="checklist-count">
              {checklistItems.filter(item => item.completed).length} of {checklistItems.length} remaining
            </p>
            <div className="checklist-items">
              {checklistItems.map(item => (
                <label key={item.id} className="checklist-item">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleChecklistToggle(item.id)}
                  />
                  <span className={item.completed ? 'completed' : ''}>{item.label}</span>
                </label>
              ))}
            </div>
            <button className="complete-all-btn" onClick={handleCompleteAll}>
              Complete All
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className="right-section">
          {/* Daily Sales */}
          <div className="card daily-sales">
            <h2>Daily Sales</h2>
            <div className="sales-grid">
              <div className="sales-stat main">
                <div className="stat-value">₱{dailySales.totalSale.toFixed(2)}</div>
                <div className="stat-label">Total Sale</div>
                <div className="stat-sub">
                  <span className="stat-number">{dailySales.transactionCount}</span>
                  <span className="stat-text">Transaction Count</span>
                </div>
              </div>
              <div className="sales-stat">
                <div className="stat-value">{dailySales.totalCupsSold}</div>
                <div className="stat-label">Total Cups Sold</div>
                <div className="sizes">
                  <div><span>{dailySales.small}</span> Small</div>
                  <div><span>{dailySales.medium}</span> Medium</div>
                  <div><span>{dailySales.large}</span> Large</div>
                </div>
              </div>
              <div className="sales-stat">
                <div className="stat-value">{dailySales.foodSold}</div>
                <div className="stat-label">Food Sold</div>
              </div>
              <div className="sales-stat">
                <div className="stat-value">{dailySales.pastriesSold}</div>
                <div className="stat-label">Pastries Sold</div>
              </div>
            </div>
          </div>

          {/* Sales Breakdown */}
          <div className="card sales-breakdown">
            <h2>Sales Breakdown</h2>
            <div className="breakdown-grid">
              {salesBreakdown.map((item, index) => (
                <div key={index} className="breakdown-card">
                  <div className="breakdown-amount">₱{item.amount.toFixed(2)}</div>
                  <div className="breakdown-type">{item.type}</div>
                  <div className="breakdown-transactions">
                    <span>{item.transactions}</span> Transactions
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Online Breakdown */}
          <div className="card online-breakdown">
            <h2>Online Breakdown</h2>
            <div className="breakdown-grid">
              {onlineBreakdown.map((item, index) => (
                <div key={index} className="breakdown-card">
                  <div className="breakdown-amount">₱{item.amount.toFixed(2)}</div>
                  <div className="breakdown-type">{item.type}</div>
                  <div className="breakdown-transactions">
                    <span>{item.transactions}</span> Transactions
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Staffing */}
          <div className="card staffing">
            <h2>Staffing</h2>
            <p className="section-subtitle">List of staff for the current branch today</p>
            <table className="data-table staffing-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Time In</th>
                  <th>Break In</th>
                  <th>Break Out</th>
                  <th>Time Out</th>
                </tr>
              </thead>
              <tbody>
                {staffing.map((staff, index) => (
                  <tr key={index}>
                    <td>{staff.employee}</td>
                    <td>{staff.timeIn}</td>
                    <td>{staff.breakIn}</td>
                    <td>{staff.breakOut}</td>
                    <td>{staff.timeOut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expenses */}
          <div className="card expenses">
            <h2>Expenses</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>RECEIPT NUMBER</th>
                  <th>ITEM NAME</th>
                  <th>QUANTITY</th>
                  <th>PRICE</th>
                  <th>TOTAL AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense, index) => (
                  <tr key={index}>
                    <td>{expense.receiptNumber}</td>
                    <td>{expense.itemName}</td>
                    <td>{expense.quantity}</td>
                    <td>₱{expense.price}</td>
                    <td>₱{expense.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Deposit */}
          <div className="card deposit">
            <h2>Deposit</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>DEPOSIT ID</th>
                  <th>AMOUNT DEPOSITED</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((deposit, index) => (
                  <tr key={index}>
                    <td>{deposit.depositId}</td>
                    <td>₱{deposit.amountDeposited.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Time Entry Modal */}
      <TimeEntryModal
        isOpen={isTimeEntryModalOpen}
        onClose={() => setIsTimeEntryModalOpen(false)}
      />
    </div>
  );
};

export default EmployeeActionPage;
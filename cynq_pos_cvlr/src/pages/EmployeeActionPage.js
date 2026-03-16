import React, { useEffect, useState } from 'react';
import { 
  ClockIcon, 
  HomeIcon, 
  UserGroupIcon, 
  ArrowRightOnRectangleIcon 
} from "@heroicons/react/24/outline";
import TimeEntryModal from '../components/modal/TimeEntryModal';
import './EmployeeActionPage.css';
import { store } from '../config/env';
import { checkStoreStatus } from '../utils/checkStoreStatus';
import { updateStoreStatus } from '../utils/updateStoreStatus';
import { fetchExpenses } from '../utils/fetchExpenses';
import { fetchDeposits } from '../utils/fetchDeposits';
import { fetchEmployeeStaffing } from '../utils/fetchEmployeeStaffing';
import { fetchDailySales } from '../utils/fetchDailySales';
import { fetchChecklistItems } from '../utils/fetchChecklistItems';
import { updateChecklistItem } from '../utils/updateChecklistItem';
import { getStoredItem } from '../utils/storage';

const EmployeeActionPage = ({ navigation }) => {
  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false);

  const [storeInfo, setStoreInfo] = useState({
    branchName: store.branch || 'Loading...',
    status: 'CLOSED',
    operatingHours: 'N/A',
    openingTime: null,
    closingTime: null,
    openedBy: null,
    closedBy: null
  });
  const [expenses, setExpenses] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [staffing, setStaffing] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [dailySales, setDailySales] = useState({
    totalSale: 0,
    transactionCount: 0,
    totalCupsSold: 0,
    small: 0,
    medium: 0,
    large: 0,
    foodSold: 0,
    pastriesSold: 0
  });
  const [salesBreakdown, setSalesBreakdown] = useState([]);
  const [onlineBreakdown, setOnlineBreakdown] = useState([]);

  const [isStoreLoading, setIsStoreLoading] = useState(true);
  const [isStoreActionLoading, setIsStoreActionLoading] = useState(false);
  const [isExpensesLoading, setIsExpensesLoading] = useState(true);
  const [isDepositsLoading, setIsDepositsLoading] = useState(true);
  const [isStaffingLoading, setIsStaffingLoading] = useState(true);
  const [isSalesLoading, setIsSalesLoading] = useState(true);
  const [isChecklistLoading, setIsChecklistLoading] = useState(true);
  const [isChecklistSubmitting, setIsChecklistSubmitting] = useState(false);

  const normalizeChecklistItems = (rows) => {
    return rows
      .filter((row) => row.checklistitemCategory !== 'EMPL')
      .map((row) => ({
        id: row.checklistItemId,
        label: row.checklistItem,
        category: row.checklistitemCategory,
        completed: String(row.checklistDone || '').toUpperCase() === 'YES'
      }));
  };

  const refreshStoreStatus = async () => {
    setIsStoreLoading(true);
    try {
      const result = await checkStoreStatus(store.branchCode, store.branch);
      if (result.success) {
        setStoreInfo(result.data);
      }
    } finally {
      setIsStoreLoading(false);
    }
  };

  const refreshExpenses = async () => {
    setIsExpensesLoading(true);
    try {
      const result = await fetchExpenses(store.branchCode);
      setExpenses(result.success ? (result.data || []) : []);
    } finally {
      setIsExpensesLoading(false);
    }
  };

  const refreshDeposits = async () => {
    setIsDepositsLoading(true);
    try {
      const result = await fetchDeposits(store.branchCode);
      setDeposits(result.success ? (result.data || []) : []);
    } finally {
      setIsDepositsLoading(false);
    }
  };

  const refreshStaffing = async () => {
    setIsStaffingLoading(true);
    try {
      const result = await fetchEmployeeStaffing(store.branchCode);
      setStaffing(result.success ? (result.data || []) : []);
    } finally {
      setIsStaffingLoading(false);
    }
  };

  const refreshSales = async () => {
    setIsSalesLoading(true);
    try {
      const result = await fetchDailySales(store.branchCode);
      if (result.success) {
        const salesData = result.data || {};
        const paymentSummary = salesData.paymentSummary || {};

        setDailySales({
          totalSale: Number(salesData.totalSale || 0),
          transactionCount: Number(salesData.transactionCount || 0),
          totalCupsSold: Number(salesData.totalCupsSold || 0),
          small: Number(salesData.small || 0),
          medium: Number(salesData.medium || 0),
          large: Number(salesData.large || 0),
          foodSold: Number(salesData.foodSold || 0),
          pastriesSold: Number(salesData.pastriesSold || 0)
        });

        const toBreakdownRows = (entries) =>
          entries.map(([type, amount]) => ({
            type: `${type} Transactions`,
            amount: Number(amount || 0),
            transactions: 0
          }));

        const onlineKeys = ['GRAB', 'FOODPANDA'];
        const onlineRows = toBreakdownRows(
          Object.entries(paymentSummary).filter(([key]) => onlineKeys.includes(String(key).toUpperCase()))
        );
        const salesRows = toBreakdownRows(
          Object.entries(paymentSummary).filter(([key]) => !onlineKeys.includes(String(key).toUpperCase()))
        );

        setSalesBreakdown(salesRows);
        setOnlineBreakdown(onlineRows);
      }
    } finally {
      setIsSalesLoading(false);
    }
  };

  const refreshChecklist = async () => {
    setIsChecklistLoading(true);
    try {
      const result = await fetchChecklistItems(store.branchCode);
      setChecklistItems(result.success ? normalizeChecklistItems(result.data || []) : []);
    } finally {
      setIsChecklistLoading(false);
    }
  };

  useEffect(() => {
    refreshStoreStatus();
    refreshExpenses();
    refreshDeposits();
    refreshStaffing();
    refreshSales();
    refreshChecklist();

    const storeTimer = setInterval(refreshStoreStatus, 30000);
    const expenseTimer = setInterval(refreshExpenses, 300000);
    const depositTimer = setInterval(refreshDeposits, 300000);
    const staffingTimer = setInterval(refreshStaffing, 60000);
    const salesTimer = setInterval(refreshSales, 300000);

    return () => {
      clearInterval(storeTimer);
      clearInterval(expenseTimer);
      clearInterval(depositTimer);
      clearInterval(staffingTimer);
      clearInterval(salesTimer);
    };
  }, []);

  const handleChecklistToggle = (id) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleCompleteAll = async () => {
    if (!checklistItems.length || isChecklistSubmitting) return;

    const allCompletedItems = checklistItems.map((item) => ({ ...item, completed: true }));
    setChecklistItems(allCompletedItems);

    setIsChecklistSubmitting(true);
    try {
      const currentEmployee = JSON.parse((await getStoredItem('currentEmployee')) || '{}');
      const employeeId = currentEmployee.employeeId;

      if (!employeeId) {
        alert('Employee ID not found. Please log in again.');
        navigation.navigate('Login');
        return;
      }

      const grouped = allCompletedItems.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});

      const categoryMap = { CAFE: 'CAFE', EQUI: 'EQUI', CLEA: 'CLEA' };

      for (const [category, items] of Object.entries(grouped)) {
        const mappedCategory = categoryMap[category];
        if (!mappedCategory) continue;

        await updateChecklistItem({
          category: mappedCategory,
          submittedBy: employeeId,
          dateUpdated: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
          branchCode: store.branchCode,
          checklistItems: items.map((item) => ({
            checklistItemId: item.id,
            checklistDone: item.completed ? 'YES' : 'NO'
          }))
        });
      }

      alert('Checklist submitted successfully.');
      await refreshChecklist();
    } catch (error) {
      console.error('Checklist submit error:', error);
      alert('Failed to submit checklist. Please try again.');
    } finally {
      setIsChecklistSubmitting(false);
    }
  };

  const handleStoreToggle = async () => {
    const isForOpen =
      storeInfo.status === 'CLOSED' &&
      (!storeInfo.openingTime || storeInfo.openingTime === 'N/A');

    const targetStatus = isForOpen ? 'OPEN' : 'CLOSED';
    const actionText = isForOpen ? 'open' : 'close';

    const currentEmployee = JSON.parse((await getStoredItem('currentEmployee')) || '{}');
    const employeeName = currentEmployee.name;

    if (!employeeName) {
      alert('Employee name not found. Please log in again.');
      navigation.navigate('Login');
      return;
    }

    if (!window.confirm(`Are you sure you want to ${actionText} the store?`)) return;

    setIsStoreActionLoading(true);
    try {
      const result = await updateStoreStatus(store.branchCode, employeeName, targetStatus);
      if (result.success) {
        alert(result.description || `Store ${actionText}ed successfully.`);
        await refreshStoreStatus();
      } else {
        alert(result.description || `Failed to ${actionText} store.`);
      }
    } catch (error) {
      console.error('Store action error:', error);
      alert(`Error trying to ${actionText} store.`);
    } finally {
      setIsStoreActionLoading(false);
    }
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
                  <div className="time">{storeInfo.openingTime || 'N/A'}</div>
                </div>
                <div className="time-box">
                  <label>Closing Time</label>
                  <div className="time">{storeInfo.closingTime || 'N/A'}</div>
                </div>
              </div>
              <div className="store-footer">
                <span>Opened By: {storeInfo.openedBy || 'N/A'}</span>
                <span>Closed By: {storeInfo.closedBy || 'N/A'}</span>
              </div>
              <button
                className="close-store-btn"
                onClick={handleStoreToggle}
                disabled={isStoreActionLoading}
              >
                {isStoreActionLoading
                  ? 'Processing...'
                  : storeInfo.status === 'CLOSED'
                  ? 'Open Store'
                  : 'Close Store'}
              </button>
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
            <button className="complete-all-btn" onClick={handleCompleteAll} disabled={isChecklistSubmitting}>
              {isChecklistSubmitting ? 'Submitting...' : 'Complete All'}
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
                <div className="stat-value">₱{(dailySales.totalSale || 0).toFixed(2)}</div>
                <div className="stat-label">Total Sale</div>
                <div className="stat-sub">
                  <span className="stat-number">{dailySales.transactionCount || 0}</span>
                  <span className="stat-text">Transaction Count</span>
                </div>
              </div>
              <div className="sales-stat">
                <div className="stat-value">{dailySales.totalCupsSold || 0}</div>
                <div className="stat-label">Total Cups Sold</div>
                <div className="sizes">
                  <div><span>{dailySales.small || 0}</span> Small</div>
                  <div><span>{dailySales.medium || 0}</span> Medium</div>
                  <div><span>{dailySales.large || 0}</span> Large</div>
                </div>
              </div>
              <div className="sales-stat">
                <div className="stat-value">{dailySales.foodSold || 0}</div>
                <div className="stat-label">Food Sold</div>
              </div>
              <div className="sales-stat">
                <div className="stat-value">{dailySales.pastriesSold || 0}</div>
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
                  <div className="breakdown-amount">₱{(item.amount || 0).toFixed(2)}</div>
                  <div className="breakdown-type">{item.type}</div>
                  <div className="breakdown-transactions">
                    <span>{item.transactions || 0}</span> Transactions
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
                  <div className="breakdown-amount">₱{(item.amount || 0).toFixed(2)}</div>
                  <div className="breakdown-type">{item.type}</div>
                  <div className="breakdown-transactions">
                    <span>{item.transactions || 0}</span> Transactions
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
                  <tr key={expense.id || index}>
                    <td>{expense.receiptNumber || 'N/A'}</td>
                    <td>{expense.itemName || 'N/A'}</td>
                    <td>{expense.quantity || 0}</td>
                    <td>₱{(expense.price || 0).toFixed(2)}</td>
                    <td>₱{(expense.totalAmount || 0).toFixed(2)}</td>
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
                    <td>₱{(deposit.amountDeposited || 0).toFixed(2)}</td>
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
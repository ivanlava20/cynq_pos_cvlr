import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
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
  const [hasStoreUpdates, setHasStoreUpdates] = useState(false);
  const [pendingStoreInfo, setPendingStoreInfo] = useState(null);

  const storeInfoRef = useRef(storeInfo);

  useEffect(() => {
    storeInfoRef.current = storeInfo;
  }, [storeInfo]);

  const normalizeStoreInfoForCompare = (info = {}) => ({
    branchName: String(info.branchName || ''),
    status: String(info.status || ''),
    operatingHours: String(info.operatingHours || ''),
    openingTime: String(info.openingTime || ''),
    closingTime: String(info.closingTime || ''),
    openedBy: String(info.openedBy || ''),
    closedBy: String(info.closedBy || '')
  });

  const hasStoreInfoChanged = (nextInfo = {}, currentInfo = {}) => {
    return JSON.stringify(normalizeStoreInfoForCompare(nextInfo)) !== JSON.stringify(normalizeStoreInfoForCompare(currentInfo));
  };

  const normalizeChecklistItems = (rows) => rows
    .filter((row) => row.checklistitemCategory !== 'EMPL')
    .map((row) => ({
      id: row.checklistItemId,
      label: row.checklistItem,
      category: row.checklistitemCategory,
      completed: String(row.checklistDone || '').toUpperCase() === 'YES'
    }));

  const refreshStoreStatus = async () => {
    setIsStoreLoading(true);
    try {
      const result = await checkStoreStatus(store.branchCode, store.branch);
      if (result.success) {
        setStoreInfo(result.data);
        setPendingStoreInfo(null);
        setHasStoreUpdates(false);
      }
    } finally {
      setIsStoreLoading(false);
    }
  };

  const checkStoreStatusForUpdates = async () => {
    try {
      const result = await checkStoreStatus(store.branchCode, store.branch);
      if (!result.success) return;

      const latestStoreInfo = result.data || {};
      if (hasStoreInfoChanged(latestStoreInfo, storeInfoRef.current)) {
        setPendingStoreInfo(latestStoreInfo);
        setHasStoreUpdates(true);
      }
    } catch {
      // Silent background check; ignore transient polling errors.
    }
  };

  const handleStoreRefreshPress = async () => {
    if (pendingStoreInfo) {
      setStoreInfo(pendingStoreInfo);
      setPendingStoreInfo(null);
      setHasStoreUpdates(false);
      return;
    }

    await refreshStoreStatus();
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

  const refreshAll = async () => {
    await Promise.all([
      refreshStoreStatus(),
      refreshExpenses(),
      refreshDeposits(),
      refreshStaffing(),
      refreshSales(),
      refreshChecklist()
    ]);
  };

  useEffect(() => {
    refreshAll();

    const storeTimer = setInterval(checkStoreStatusForUpdates, 30000);
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

  const completedCount = useMemo(
    () => checklistItems.filter((item) => item.completed).length,
    [checklistItems]
  );

  const handleChecklistToggle = (id) => {
    setChecklistItems((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
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
        Alert.alert('Error', 'Employee ID not found. Please log in again.');
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

        // eslint-disable-next-line no-await-in-loop
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

      Alert.alert('Success', 'Checklist submitted successfully.');
      await refreshChecklist();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Checklist submit error:', error);
      Alert.alert('Error', 'Failed to submit checklist. Please try again.');
    } finally {
      setIsChecklistSubmitting(false);
    }
  };

  const confirmAction = (title, message) =>
    new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirm', style: 'default', onPress: () => resolve(true) }
      ]);
    });

  const handleStoreToggle = async () => {
    const isForOpen =
      storeInfo.status === 'CLOSED' &&
      (!storeInfo.openingTime || storeInfo.openingTime === 'N/A');

    const targetStatus = isForOpen ? 'OPEN' : 'CLOSED';
    const actionText = isForOpen ? 'open' : 'close';

    const currentEmployee = JSON.parse((await getStoredItem('currentEmployee')) || '{}');
    const employeeName = currentEmployee.name;

    if (!employeeName) {
      Alert.alert('Error', 'Employee name not found. Please log in again.');
      navigation.navigate('Login');
      return;
    }

    const confirmed = await confirmAction('Confirm', `Are you sure you want to ${actionText} the store?`);
    if (!confirmed) return;

    setIsStoreActionLoading(true);
    try {
      const result = await updateStoreStatus(store.branchCode, employeeName, targetStatus);
      if (result.success) {
        Alert.alert('Success', result.description || `Store ${actionText}ed successfully.`);
        await refreshStoreStatus();
      } else {
        Alert.alert('Error', result.description || `Failed to ${actionText} store.`);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Store action error:', error);
      Alert.alert('Error', `Error trying to ${actionText} store.`);
    } finally {
      setIsStoreActionLoading(false);
    }
  };

  const renderBreakdown = (rows, loading) => {
    if (loading) return <ActivityIndicator color="#f59e0b" />;
    if (!rows.length) return <Text style={styles.emptyText}>No data available</Text>;

    return (
      <View style={styles.breakdownGrid}>
        {rows.map((item, index) => (
          <View key={`${item.type}-${index}`} style={styles.breakdownCard}>
            <Text style={styles.breakdownAmount}>₱{Number(item.amount || 0).toFixed(2)}</Text>
            <Text style={styles.breakdownType}>{item.type}</Text>
            <Text style={styles.breakdownTransactions}>{item.transactions || 0} Transactions</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.timeEntryButton} onPress={() => Alert.alert('Time Entry Scan', 'Please use Time Entry Scan from the POS page.') }>
            <Text style={styles.actionButtonText}>Time Entry Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.actionButtonText}>POS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('EmployeeAction')}>
            <Text style={styles.actionButtonText}>Employee</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.actionButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.leftColumn}>
          <View style={[styles.card, styles.panel, styles.leftTopPanel]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Store Management</Text>
              {!isStoreLoading ? (
                <View style={styles.storeHeaderActions}>
                  <Text style={[styles.storeStatus, storeInfo.status === 'OPEN' ? styles.statusOpen : styles.statusClosed]}>
                    {storeInfo.status}
                  </Text>
                  <TouchableOpacity
                    style={[styles.refreshBtn, hasStoreUpdates && styles.refreshBtnHighlight]}
                    onPress={handleStoreRefreshPress}
                  >
                    <Text style={[styles.refreshIconText, hasStoreUpdates && styles.refreshTextHighlight]}>↻</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {isStoreLoading ? (
              <ActivityIndicator color="#f59e0b" />
            ) : (
              <>
                <View style={styles.storeRow}>
                  <Text style={styles.storeBranch} numberOfLines={1}>Branch: {storeInfo.branchName}</Text>
                </View>

                <Text style={styles.operatingHoursText} numberOfLines={1} ellipsizeMode="tail">
                  Operating Hours: {storeInfo.operatingHours}
                </Text>

                <View style={styles.storeInfoGrid}>
                  <View style={styles.storeInfoGroup}>
                    <Text style={styles.storeInfoGroupTitle}>Opening</Text>
                    <Text style={styles.storeInfoGroupLine}>Time: {storeInfo.openingTime || 'N/A'}</Text>
                    <Text style={styles.storeInfoGroupLine}>By: {storeInfo.openedBy || 'N/A'}</Text>
                  </View>
                  <View style={styles.storeInfoGroup}>
                    <Text style={styles.storeInfoGroupTitle}>Closing</Text>
                    <Text style={styles.storeInfoGroupLine}>Time: {storeInfo.closingTime || 'N/A'}</Text>
                    <Text style={styles.storeInfoGroupLine}>By: {storeInfo.closedBy || 'N/A'}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isStoreActionLoading && styles.disabledBtn]}
                  disabled={isStoreActionLoading}
                  onPress={handleStoreToggle}
                >
                  <Text style={styles.primaryBtnText}>
                    {isStoreActionLoading
                      ? 'Processing...'
                      : storeInfo.status === 'CLOSED'
                      ? 'Open Store'
                      : 'Close Store'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={[styles.card, styles.panel, styles.leftBottomPanel]}>
            <Text style={styles.cardTitle}>Checklist</Text>
            {isChecklistLoading ? (
              <ActivityIndicator color="#f59e0b" />
            ) : (
              <>
                <Text style={styles.infoText}>{completedCount} of {checklistItems.length} completed</Text>
                <ScrollView style={styles.sectionScroll}>
                  {(checklistItems || []).map((item) => (
                    <View key={item.id} style={styles.checkRow}>
                      <Switch
                        value={item.completed}
                        onValueChange={() => handleChecklistToggle(item.id)}
                        trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
                        thumbColor="#fff"
                      />
                      <Text style={[styles.checkLabel, item.completed && styles.checkDone]}>{item.label}</Text>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.primaryBtn, isChecklistSubmitting && styles.disabledBtn]}
                  onPress={handleCompleteAll}
                  disabled={isChecklistSubmitting}
                >
                  <Text style={styles.primaryBtnText}>{isChecklistSubmitting ? 'Submitting...' : 'Complete All'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.rightColumn}>
          <View style={styles.rightRow}>
            <View style={[styles.card, styles.panel, styles.rightPanel]}>
              <Text style={styles.cardTitle}>Daily Sales</Text>
              {isSalesLoading ? (
                <ActivityIndicator color="#f59e0b" />
              ) : (
                <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.dailySalesWrap}>
                  <View style={styles.totalSaleCard}>
                    <Text style={styles.totalSaleLabel}>Total Sale</Text>
                    <Text style={styles.bigValue}>₱{Number(dailySales.totalSale || 0).toFixed(2)}</Text>
                    <Text style={styles.salesGroupValue}>Transaction Count: {dailySales.transactionCount || 0}</Text>
                  </View>

                  <View style={styles.salesGroupCard}>
                    <Text style={styles.salesGroupTitle}>Cups Sold: {dailySales.totalCupsSold || 0}</Text>
                    <View style={styles.cupSizeRow}>
                      <Text style={styles.cupSizeChip}>S: {dailySales.small || 0}</Text>
                      <Text style={styles.cupSizeChip}>M: {dailySales.medium || 0}</Text>
                      <Text style={styles.cupSizeChip}>L: {dailySales.large || 0}</Text>
                    </View>
                  </View>

                  <View style={styles.salesGroupCard}>
                    <Text style={styles.salesGroupTitle}>Food & Pastries</Text>
                    <Text style={styles.salesGroupValue}>Food Sold: {dailySales.foodSold || 0}</Text>
                    <Text style={styles.salesGroupValue}>Pastries Sold: {dailySales.pastriesSold || 0}</Text>
                  </View>
                </ScrollView>
              )}
            </View>

            <View style={[styles.card, styles.panel, styles.rightPanel]}>
              <Text style={styles.cardTitle}>Sales Breakdown</Text>
              <ScrollView style={styles.sectionScroll}>
                {renderBreakdown(salesBreakdown, isSalesLoading)}
              </ScrollView>
            </View>

            <View style={[styles.card, styles.panel, styles.rightPanel]}>
              <Text style={styles.cardTitle}>Online Breakdown</Text>
              <ScrollView style={styles.sectionScroll}>
                {renderBreakdown(onlineBreakdown, isSalesLoading)}
              </ScrollView>
            </View>
          </View>

          <View style={styles.rightRow}>
            <View style={[styles.card, styles.panel, styles.rightPanel]}>
              <Text style={styles.cardTitle}>Staffing</Text>
              <ScrollView style={styles.sectionScroll}>
                {isStaffingLoading ? (
                  <ActivityIndicator color="#f59e0b" />
                ) : staffing.length ? (
                  staffing.map((staff, index) => (
                    <View key={`${staff.employee}-${index}`} style={styles.itemRow}>
                      <Text style={styles.itemTitle}>{staff.employee || 'N/A'}</Text>
                      <Text style={styles.infoText}>In: {staff.timeIn || 'N/A'} • Break In: {staff.breakIn || 'N/A'}</Text>
                      <Text style={styles.infoText}>Break Out: {staff.breakOut || 'N/A'} • Out: {staff.timeOut || 'N/A'}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No staffing records</Text>
                )}
              </ScrollView>
            </View>

            <View style={[styles.card, styles.panel, styles.rightPanel]}>
              <Text style={styles.cardTitle}>Expenses</Text>
              <ScrollView style={styles.sectionScroll}>
                {isExpensesLoading ? (
                  <ActivityIndicator color="#f59e0b" />
                ) : expenses.length ? (
                  expenses.map((expense, index) => (
                    <View key={expense.id || index} style={styles.itemRow}>
                      <Text style={styles.itemTitle}>{expense.itemName || 'N/A'}</Text>
                      <Text style={styles.infoText}>Receipt: {expense.receiptNumber || 'N/A'}</Text>
                      <Text style={styles.infoText}>Qty: {expense.quantity || 0} • Price: ₱{Number(expense.price || 0).toFixed(2)}</Text>
                      <Text style={styles.infoText}>Total: ₱{Number(expense.totalAmount || 0).toFixed(2)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No expense records</Text>
                )}
              </ScrollView>
            </View>

            <View style={[styles.card, styles.panel, styles.rightPanel]}>
              <Text style={styles.cardTitle}>Deposit</Text>
              <ScrollView style={styles.sectionScroll}>
                {isDepositsLoading ? (
                  <ActivityIndicator color="#f59e0b" />
                ) : deposits.length ? (
                  deposits.map((deposit, index) => (
                    <View key={`${deposit.depositId}-${index}`} style={styles.itemRow}>
                      <Text style={styles.itemTitle}>{deposit.depositId || 'N/A'}</Text>
                      <Text style={styles.infoText}>Amount Deposited: ₱{Number(deposit.amountDeposited || 0).toFixed(2)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No deposit records</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbf5' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fffdf8',
    borderBottomWidth: 1,
    borderBottomColor: '#f59e0b33',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  headerActions: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  timeEntryButton: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#111111',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2
  },
  homeButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e78f00',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2
  },
  actionButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e78f00',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2
  },
  actionButtonText: { color: '#fff', fontWeight: '700' },
  logoutButton: {
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#111111',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    gap: 12
  },
  leftColumn: {
    width: '30%',
    gap: 12
  },
  rightColumn: {
    width: '70%',
    gap: 12
  },
  rightRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 12
  },
  panel: {
    flex: 1,
    minHeight: 0
  },
  leftTopPanel: { flex: 1 },
  leftBottomPanel: { flex: 1 },
  rightPanel: { flex: 1 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f59e0b33',
    padding: 12
  },
  sectionScroll: {
    flex: 1,
    minHeight: 0
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111111', marginBottom: 8 },
  refreshBtn: {
    minWidth: 34,
    minHeight: 30,
    borderRadius: 999,
    backgroundColor: '#111111',
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  refreshBtnHighlight: {
    backgroundColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#e78f00'
  },
  refreshIconText: { color: '#fff', fontWeight: '900', fontSize: 16, lineHeight: 18 },
  refreshTextHighlight: { color: '#ffffff' },
  storeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  storeBranch: { color: '#111111', fontWeight: '800', flex: 1, paddingRight: 8 },
  storeStatus: { fontWeight: '800', fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusOpen: { color: '#166534', backgroundColor: '#dcfce7' },
  statusClosed: { color: '#991b1b', backgroundColor: '#fee2e2' },
  operatingHoursText: { color: '#374151', marginTop: 2, marginBottom: 8, fontWeight: '600' },
  storeInfoGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  storeInfoGroup: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1111111f',
    borderRadius: 10,
    backgroundColor: '#fffdf9',
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  storeInfoGroupTitle: { color: '#111111', fontWeight: '800', marginBottom: 3, fontSize: 12 },
  storeInfoGroupLine: { color: '#374151', fontWeight: '600', fontSize: 12, marginTop: 1 },
  infoText: { color: '#374151', marginTop: 3 },
  primaryBtn: {
    marginTop: 12,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#e78f00'
  },
  disabledBtn: { opacity: 0.6 },
  primaryBtnText: { color: '#ffffff', fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  checkLabel: { marginLeft: 10, color: '#111111', flex: 1, fontWeight: '600' },
  checkDone: { textDecorationLine: 'line-through', color: '#6b7280' },
  dailySalesWrap: { gap: 8, paddingBottom: 8 },
  totalSaleCard: {
    borderWidth: 1,
    borderColor: '#f59e0b55',
    borderRadius: 12,
    backgroundColor: '#fffbf3',
    padding: 10
  },
  totalSaleLabel: { color: '#6b7280', fontWeight: '700', marginBottom: 4 },
  bigValue: { fontSize: 22, fontWeight: '900', color: '#111111' },
  salesGroupCard: {
    borderWidth: 1,
    borderColor: '#1111111f',
    borderRadius: 10,
    backgroundColor: '#fffdf9',
    padding: 8
  },
  salesGroupTitle: {
    color: '#111111',
    fontWeight: '800',
    marginBottom: 4,
    fontSize: 12
  },
  salesGroupValue: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
    marginTop: 1
  },
  cupSizeRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 4
  },
  cupSizeChip: {
    flex: 1,
    minWidth: 0,
    color: '#111111',
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#11111126',
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 3,
    backgroundColor: '#ffffff'
  },
  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  breakdownCard: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#11111122',
    borderRadius: 12,
    backgroundColor: '#fffdf9',
    padding: 10
  },
  breakdownAmount: { color: '#111111', fontSize: 16, fontWeight: '800' },
  breakdownType: { marginTop: 4, color: '#374151', fontWeight: '700' },
  breakdownTransactions: { marginTop: 2, color: '#6b7280', fontSize: 12 },
  itemRow: {
    borderWidth: 1,
    borderColor: '#1111111f',
    borderRadius: 12,
    backgroundColor: '#fffdf9',
    padding: 10,
    marginBottom: 8
  },
  itemTitle: { color: '#111111', fontWeight: '800' },
  emptyText: { color: '#6b7280' }
});

export default EmployeeActionPage;

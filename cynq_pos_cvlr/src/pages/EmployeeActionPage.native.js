import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  PixelRatio,
  SafeAreaView,
  ScrollView,
  StyleSheet,
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
import { fetchChecklistCategories } from '../processes/fetchChecklistCategories';
import { getStoredItem } from '../utils/storage';
import DisplayCheckListDetailsModal from '../components/modal/displayCheckListDetailsModal.native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const WIDTH_SCALE = Math.min(Math.max(SCREEN_WIDTH / 1024, 0.9), 1.25);
const FONT_SCALE = Math.min(PixelRatio.getFontScale(), 1.2);
const RF = (size) => Math.round(PixelRatio.roundToNearestPixel((size * WIDTH_SCALE) / FONT_SCALE));

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
  const [checklistCategories, setChecklistCategories] = useState([]);
  const [selectedChecklistCategory, setSelectedChecklistCategory] = useState('');
  const [isChecklistDetailsOpen, setIsChecklistDetailsOpen] = useState(false);
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
        const paymentBreakdown = salesData.paymentBreakdown || [];
        const orderModeBreakdown = salesData.orderModeBreakdown || [];

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

        const toBreakdownRows = (rows) =>
          rows.map((row) => ({
            type: `${row.paymentMethodDesc || row.paymentMethodCode || 'Unknown'} Transactions`,
            amount: Number(row.amount || 0),
            transactions: Number(row.transactions || 0),
            paymentMethodCode: String(row.paymentMethodCode || '').toUpperCase()
          }));

        const breakdownRows = toBreakdownRows(paymentBreakdown);
        const salesRows = breakdownRows;

        const onlineRows = orderModeBreakdown.map((row) => ({
          type: `${row.orderModeDesc || row.orderModeCode || 'Unknown'} Transactions`,
          amount: Number(row.amount || 0),
          transactions: Number(row.transactions || 0)
        }));

        if (!breakdownRows.length) {
          const summaryRows = Object.entries(paymentSummary).map(([paymentMethodCode, amount]) => ({
            type: `${paymentMethodCode} Transactions`,
            amount: Number(amount || 0),
            transactions: 0,
            paymentMethodCode: String(paymentMethodCode || '').toUpperCase()
          }));

          setSalesBreakdown(summaryRows);
          setOnlineBreakdown(onlineRows);
          return;
        }

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
      const result = await fetchChecklistCategories();
      const rows = Array.isArray(result) ? result : [];
      setChecklistCategories(rows.filter((row) => String(row.checklistitemCategory || '').trim()));
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

  const handleChecklistCategoryPress = (categoryCode) => {
    setSelectedChecklistCategory(categoryCode);
    setIsChecklistDetailsOpen(true);
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
            <Text style={styles.breakdownAmount} numberOfLines={1}>
              ₱{Number(item.amount || 0).toFixed(2)}
            </Text>
            <Text style={styles.breakdownType} numberOfLines={1}>
              {item.type}
            </Text>
            <Text style={styles.breakdownTransactions} numberOfLines={1}>
              {item.transactions || 0} Transactions
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const formatCreatedAt = (value) => {
    if (!value) return 'N/A';

    const sourceDate = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    if (!(sourceDate instanceof Date) || Number.isNaN(sourceDate.getTime())) {
      return String(value);
    }

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).formatToParts(sourceDate);

    const year = parts.find((part) => part.type === 'year')?.value || '0000';
    const month = parts.find((part) => part.type === 'month')?.value || '00';
    const day = parts.find((part) => part.type === 'day')?.value || '00';
    const hour = parts.find((part) => part.type === 'hour')?.value || '00';
    const minute = parts.find((part) => part.type === 'minute')?.value || '00';
    const second = parts.find((part) => part.type === 'second')?.value || '00';

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
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
              <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.storeManagementContent}>
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

                {!(storeInfo.closingTime && storeInfo.closedBy) ? (
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
                ) : null}
              </ScrollView>
            )}
          </View>

          <View style={[styles.card, styles.panel, styles.leftBottomPanel]}>
            <Text style={styles.cardTitle}>Checklist</Text>
            {isChecklistLoading ? (
              <ActivityIndicator color="#f59e0b" />
            ) : (
              <>
                <ScrollView style={styles.sectionScroll} contentContainerStyle={styles.checklistGridWrap}>
                  {(checklistCategories || []).map((item, index) => (
                    <TouchableOpacity
                      key={`${item.checklistitemCategory}-${index}`}
                      style={styles.checklistCategoryBtn}
                      activeOpacity={0.8}
                      onPress={() => handleChecklistCategoryPress(item.checklistitemCategory)}
                    >
                      <View style={styles.checklistCategoryTopRow}>
                        <Text style={styles.checklistCategoryTitle} numberOfLines={2}>
                          {item.checklistitemDescription || item.checklistitemCategory || 'Checklist'}
                        </Text>
                        <Text style={styles.checklistCategoryChevron}>›</Text>
                      </View>
                      <View style={styles.checklistCategoryBottomRow}>
                        <Text style={styles.checklistCategoryMeta}>
                          {Number(item.itemsDone || 0)} / {Number(item.totalItems || 0)}
                        </Text>
                        <Text style={styles.checklistTapHint}>Tap to open</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {!checklistCategories.length ? <Text style={styles.emptyText}>No checklist categories</Text> : null}
                </ScrollView>
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

                      <View style={styles.staffingGroupRow}>
                        <View style={styles.staffingGroupCard}>
                          <Text style={styles.staffingGroupValue}>In: {staff.timeIn || 'N/A'}</Text>
                          <Text style={styles.staffingGroupValue}>Out: {staff.timeOut || 'N/A'}</Text>
                        </View>

                        <View style={styles.staffingGroupCard}>
                          <Text style={styles.staffingGroupValue}>Break In: {staff.breakIn || 'N/A'}</Text>
                          <Text style={styles.staffingGroupValue}>Break Out: {staff.breakOut || 'N/A'}</Text>
                        </View>
                      </View>
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
                      <Text style={styles.itemTitle}>Receipt No: {expense.receiptNumber || 'N/A'}</Text>
                      <Text style={styles.infoText}>Created At: {formatCreatedAt(expense.createdAt)}</Text>
                      <Text style={styles.infoText}>Payment Method: {expense.paymentMethod || 'N/A'}</Text>
                      <Text style={styles.infoText}>Receipt Total: ₱{Number(expense.receiptTotalAmount || 0).toFixed(2)}</Text>
                      <Text style={styles.infoText}>No Receipt Reason: {expense.noReceiptReason || 'N/A'}</Text>

                      {Array.isArray(expense.items) && expense.items.length ? (
                        <View style={styles.expenseItemsWrap}>
                          {expense.items.map((item, itemIndex) => (
                            <View key={`${item.itemName || 'item'}-${itemIndex}`} style={styles.expenseItemCard}>
                              <Text style={styles.expenseItemName}>{item.itemName || 'N/A'}</Text>
                              <Text style={styles.expenseItemMeta}>
                                Qty: {Number(item.itemQTY || 0)} • Price: ₱{Number(item.itemPrice || 0).toFixed(2)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
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

      <DisplayCheckListDetailsModal
        isOpen={isChecklistDetailsOpen}
        onClose={() => setIsChecklistDetailsOpen(false)}
        checklistitemCategory={selectedChecklistCategory}
        onUpdated={refreshChecklist}
      />
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
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: RF(13) },
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
  storeManagementContent: {
    paddingBottom: 8
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  storeHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: RF(16), fontWeight: '800', color: '#111111', marginBottom: 8 },
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
  refreshIconText: { color: '#fff', fontWeight: '900', fontSize: RF(16), lineHeight: RF(18) },
  refreshTextHighlight: { color: '#ffffff' },
  storeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  storeBranch: { color: '#111111', fontWeight: '800', flex: 1, paddingRight: 8 },
  storeStatus: { fontWeight: '800', fontSize: RF(12), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusOpen: { color: '#166534', backgroundColor: '#dcfce7' },
  statusClosed: { color: '#991b1b', backgroundColor: '#fee2e2' },
  operatingHoursText: { color: '#374151', marginTop: 2, marginBottom: 8, fontWeight: '600', fontSize: RF(13) },
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
  storeInfoGroupTitle: { color: '#111111', fontWeight: '800', marginBottom: 3, fontSize: RF(12) },
  storeInfoGroupLine: { color: '#374151', fontWeight: '600', fontSize: RF(12), marginTop: 1 },
  infoText: { color: '#374151', marginTop: 3, fontSize: RF(12) },
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
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: RF(13) },
  checklistGridWrap: {
    flexDirection: 'column',
    gap: 8,
    paddingBottom: 8
  },
  checklistCategoryBtn: {
    width: '100%',
    minHeight: 82,
    borderWidth: 1,
    borderColor: '#f59e0b88',
    borderRadius: 10,
    backgroundColor: '#fff7e8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'space-between',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2
  },
  checklistCategoryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8
  },
  checklistCategoryChevron: {
    color: '#b45309',
    fontWeight: '900',
    fontSize: RF(18),
    lineHeight: RF(18)
  },
  checklistCategoryBottomRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6
  },
  checklistCategoryTitle: {
    color: '#111111',
    fontWeight: '800',
    fontSize: RF(12),
    flex: 1
  },
  checklistCategoryMeta: {
    color: '#374151',
    fontWeight: '800',
    fontSize: RF(12)
  },
  checklistTapHint: {
    color: '#92400e',
    fontWeight: '700',
    fontSize: RF(10)
  },
  dailySalesWrap: { gap: 8, paddingBottom: 8 },
  totalSaleCard: {
    borderWidth: 1,
    borderColor: '#f59e0b55',
    borderRadius: 12,
    backgroundColor: '#fffbf3',
    padding: 10
  },
  totalSaleLabel: { color: '#6b7280', fontWeight: '700', marginBottom: 4, fontSize: RF(12) },
  bigValue: { fontSize: RF(22), fontWeight: '900', color: '#111111' },
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
    fontSize: RF(12)
  },
  salesGroupValue: {
    color: '#374151',
    fontWeight: '600',
    fontSize: RF(12),
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
    fontSize: RF(11),
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#11111126',
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 3,
    backgroundColor: '#ffffff'
  },
  breakdownGrid: { flexDirection: 'column', gap: 8, width: '100%' },
  breakdownCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#11111122',
    borderRadius: 12,
    backgroundColor: '#fffdf9',
    padding: 10
  },
  breakdownAmount: { color: '#111111', fontSize: RF(16), fontWeight: '800' },
  breakdownType: { marginTop: 4, color: '#374151', fontWeight: '700', fontSize: RF(12) },
  breakdownTransactions: { marginTop: 2, color: '#6b7280', fontSize: RF(12) },
  itemRow: {
    borderWidth: 1,
    borderColor: '#1111111f',
    borderRadius: 12,
    backgroundColor: '#fffdf9',
    padding: 10,
    marginBottom: 8
  },
  staffingGroupRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  staffingGroupCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1111111f',
    borderRadius: 10,
    backgroundColor: '#fffdf9',
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  staffingGroupTitle: {
    color: '#111111',
    fontWeight: '800',
    fontSize: RF(11),
    marginBottom: 4
  },
  staffingGroupValue: {
    color: '#374151',
    fontWeight: '600',
    fontSize: RF(11),
    marginTop: 1
  },
  expenseItemsWrap: {
    marginTop: 8,
    gap: 6
  },
  expenseItemCard: {
    borderWidth: 1,
    borderColor: '#1111111a',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  expenseItemName: {
    color: '#111111',
    fontWeight: '700',
    fontSize: RF(12)
  },
  expenseItemMeta: {
    color: '#4b5563',
    fontWeight: '600',
    fontSize: RF(11),
    marginTop: 2
  },
  itemTitle: { color: '#111111', fontWeight: '800', fontSize: RF(13) },
  emptyText: { color: '#6b7280', fontSize: RF(12) }
});

export default EmployeeActionPage;

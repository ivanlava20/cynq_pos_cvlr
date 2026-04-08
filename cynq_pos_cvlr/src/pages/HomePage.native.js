import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { store } from '../config/env';
import {
  fetchCurrentLocation,
  getCachedLocation,
  initializeLocation
} from '../processes/fetchCurrentLocation';
import { loadQueueSummary } from '../processes/loadQueueSummary';
import { loadEmployeeList } from '../processes/employees';
import { fetchOrderMode } from '../processes/fetchOrderMode';
import { fetchMenuCategory } from '../processes/fetchMenuCategory';
import { fetchMenuItems } from '../processes/fetchMenuItems';
import { fetchAddOns } from '../processes/fetchAddOns';
import { fetchOrderNotes } from '../processes/fetchOrderNotes';
import { fetchConsumeMethods } from '../processes/fetchConsumeMethods';
import { fetchDiscounts } from '../processes/fetchDiscounts';
import { fetchVouchers } from '../processes/fetchVouchers';
import { fetchOrderPerCustomer } from '../processes/fetchOrderPerCustomer';
import { processSpecialDiscount } from '../processes/processSpecialDiscount';
import { updateOrderStatus } from '../processes/updateOrderStatus';
import { completeOrder } from '../processes/completeOrder';
import OrderCheckoutModal from '../components/modal/OrderCheckoutModal';
import OrderDetailsModal from '../components/modal/OrderDetailsModal.native';
import { getStoredItem } from '../utils/storage';
import { preloadReceiptAssets, printReceipt } from '../utils/printReceipt';
import {
  DEFAULT_ADD_ONS,
  DEFAULT_CONSUME_METHODS,
  DEFAULT_DISCOUNTS,
  DEFAULT_EMPLOYEES,
  DEFAULT_MENU_CATEGORIES,
  DEFAULT_NOTES,
  DEFAULT_ORDER_MODES,
  DEFAULT_VOUCHERS
} from '../utils/constants';

const HomePage = () => {
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState('MAKE');
  const [queueItems, setQueueItems] = useState([]);
  const [elapsedTimes, setElapsedTimes] = useState({});

  const [orderItems, setOrderItems] = useState([]);
  const [orderMode, setOrderMode] = useState('OS');
  const [consumeMethod, setConsumeMethod] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [retekessNumber, setRetekessNumber] = useState('');
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [discountValue, setDiscountValue] = useState('');
  const [discountDescription, setDiscountDescription] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [isDiscountDropdownOpen, setIsDiscountDropdownOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCheckoutSubmitting, setIsCheckoutSubmitting] = useState(false);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [pendingCheckoutPayload, setPendingCheckoutPayload] = useState(null);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [customizingSize, setCustomizingSize] = useState(null);
  const [customizingQuantity, setCustomizingQuantity] = useState(1);
  const [selectedCustomizationAddOns, setSelectedCustomizationAddOns] = useState([]);
  const [selectedCustomizationNotes, setSelectedCustomizationNotes] = useState([]);
  const [customizationCustomNote, setCustomizationCustomNote] = useState('');
  const [timeEntryLocation, setTimeEntryLocation] = useState(null);
  const [timeEntryQrData, setTimeEntryQrData] = useState('');
  const [timeEntryLoading, setTimeEntryLoading] = useState(false);
  const [timeEntryError, setTimeEntryError] = useState('');
  const [timeEntryCurrentMinute, setTimeEntryCurrentMinute] = useState('');

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSizes, setSelectedSizes] = useState({});
  const [quantities, setQuantities] = useState({});
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const [discountsList, setDiscountsList] = useState(DEFAULT_DISCOUNTS);
  const [vouchersList, setVouchersList] = useState(DEFAULT_VOUCHERS);
  const [orderModesList, setOrderModesList] = useState(DEFAULT_ORDER_MODES);
  const [menuCategories, setMenuCategories] = useState(DEFAULT_MENU_CATEGORIES);
  const [consumeMethodsList, setConsumeMethodsList] = useState(DEFAULT_CONSUME_METHODS);
  const [addOnsList, setAddOnsList] = useState(DEFAULT_ADD_ONS);
  const [employeeList, setEmployeeList] = useState(DEFAULT_EMPLOYEES);
  const [notesList, setNotesList] = useState(DEFAULT_NOTES);

  const fallbackMenuItemsList = [
    {
      productName: 'Spanish Latte',
      categoryCode: 'HCD',
      productId: 'HCD001',
      sizes: [
        { size: 'S', price: 100 },
        { size: 'M', price: 105 },
        { size: 'L', price: 120 }
      ],
      fpSizes: [
        { size: 'S', price: 120 },
        { size: 'M', price: 125 },
        { size: 'L', price: 130 }
      ],
      grabSizes: [
        { size: 'S', price: 130 },
        { size: 'M', price: 135 },
        { size: 'L', price: 140 }
      ]
    },
    {
      productName: 'Hojicha Latte',
      categoryCode: 'TEA',
      productId: 'TEA001',
      sizes: [
        { size: 'M', price: 155 },
        { size: 'L', price: 170 }
      ]
    }
  ];
  const [menuItemsList, setMenuItemsList] = useState(fallbackMenuItemsList);

  const generateRandomId = () => Math.floor(1000000 + Math.random() * 9000000).toString();
  const generateRandomTransactionId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 15; i += 1) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };
  const getCurrentDate = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const getCurrentPhilippineDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  const getCurrentTime = () => new Date().toTimeString().split(' ')[0];
  const generateOrderNumber = () => `${orderMode}${Date.now().toString().slice(-4)}`;

  useEffect(() => {
    setElapsedTimes((prev) => {
      const next = {};

      queueItems.forEach((order) => {
        if (order.orderStatus !== 'MAKE' || !order.isStarted) return;

        if (prev[order.id] !== undefined) {
          next[order.id] = prev[order.id];
          return;
        }

        const [m, s] = String(order.time || '0:00').split(':').map(Number);
        next[order.id] = (Number.isNaN(m) ? 0 : m) * 60 + (Number.isNaN(s) ? 0 : s);
      });

      return next;
    });
  }, [queueItems]);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTimes((prev) => {
        const next = { ...prev };
        queueItems.forEach((order) => {
          if (order.orderStatus === 'MAKE' && order.isStarted && next[order.id] !== undefined) next[order.id] += 1;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [queueItems]);

  useEffect(() => {
    let unsubscribe = () => {};
    const attach = async () => {
      unsubscribe = await loadQueueSummary(store.branchCode, (items) => setQueueItems(items || []));
    };
    attach();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadReferences = async () => {
      const [employeesResult, fetchedOrderModes, fetchedMenuCategories, fetchedMenuItems, fetchedAddOns, fetchedOrderNotes, fetchedConsumeMethods, fetchedDiscounts, fetchedVouchers] = await Promise.all([
        loadEmployeeList(store.branchCode),
        fetchOrderMode().catch(() => []),
        fetchMenuCategory().catch(() => []),
        fetchMenuItems().catch(() => []),
        fetchAddOns().catch(() => []),
        fetchOrderNotes().catch(() => []),
        fetchConsumeMethods().catch(() => []),
        fetchDiscounts().catch(() => []),
        fetchVouchers().catch(() => [])
      ]);
      if (!mounted) return;

      if (Array.isArray(fetchedOrderModes) && fetchedOrderModes.length) {
        setOrderModesList(fetchedOrderModes);
      }

      if (Array.isArray(fetchedMenuCategories) && fetchedMenuCategories.length) {
        setMenuCategories(fetchedMenuCategories);
        if (!selectedCategory) setSelectedCategory(fetchedMenuCategories[0].itemCategoryCode);
      }

      if (Array.isArray(fetchedMenuItems) && fetchedMenuItems.length) {
        setMenuItemsList(fetchedMenuItems);
      }

      if (Array.isArray(fetchedAddOns) && fetchedAddOns.length) {
        setAddOnsList(fetchedAddOns);
      }

      if (Array.isArray(fetchedOrderNotes) && fetchedOrderNotes.length) {
        setNotesList(fetchedOrderNotes);
      }

      if (Array.isArray(fetchedConsumeMethods) && fetchedConsumeMethods.length) {
        setConsumeMethodsList(fetchedConsumeMethods);
      }

      if (Array.isArray(fetchedDiscounts) && fetchedDiscounts.length) {
        setDiscountsList(fetchedDiscounts);
      }

      if (Array.isArray(fetchedVouchers) && fetchedVouchers.length) {
        setVouchersList(fetchedVouchers);
      }

      if (employeesResult.success && Array.isArray(employeesResult.data) && employeesResult.data.length) {
        setEmployeeList(employeesResult.data);
      }
    };

    loadReferences();
    return () => {
      mounted = false;
    };
  }, [selectedCategory]);

  const subtotalValue = useMemo(() => orderItems.reduce((sum, item) => sum + Number(item.itemTotalAmount || 0), 0), [orderItems]);

  const discountVoucherOptions = useMemo(
    () => [
      ...discountsList.map((discount) => ({
        code: discount.discountCd,
        label: `${discount.discountCd} - ${discount.discountDesc}`
      })),
      ...vouchersList.map((voucher) => ({
        code: voucher.voucherCd,
        label: `${voucher.voucherCd} - ${voucher.voucherDesc}`
      }))
    ],
    [discountsList, vouchersList]
  );

  const calculatedDiscount = useMemo(() => {
    const floorDiscount = (value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) return 0;
      return Math.floor(parsed);
    };

    if (!discountValue || !discountType) return 0;

    if (discountType === 'SPEC') {
      return floorDiscount(processSpecialDiscount({
        orderItems,
        discountDetails: {
          discountAmount: discountValue,
          discountCd: discountCodeInput,
          discountDesc: discountDescription,
          discountType
        }
      }));
    }

    if (discountType === 'PERC') return floorDiscount((subtotalValue * parseFloat(discountValue || '0')) / 100);
    if (discountType === 'CASH') return floorDiscount(parseFloat(discountValue || '0'));
    return 0;
  }, [discountType, discountValue, subtotalValue, orderItems, discountCodeInput, discountDescription]);

  useEffect(() => setDiscountAmount(calculatedDiscount.toString()), [calculatedDiscount]);

  const totalValue = subtotalValue - (parseFloat(discountAmount) || 0);

  const customerNamePrefix = useMemo(() => {
    if (orderMode === 'FB') return 'FB ';
    if (orderMode === 'FP') return 'FP ';
    if (orderMode === 'GB') return 'GB ';
    return '';
  }, [orderMode]);

  const shouldShowDiscountDropdown = !['FD', 'GB', 'FP'].includes(orderMode);

  const getDisplaySizes = (product) => {
    let sizes = [];

    if (orderMode === 'FP' && Array.isArray(product.fpSizes) && product.fpSizes.length) {
      sizes = product.fpSizes;
    } else if (orderMode === 'GB' && Array.isArray(product.grabSizes) && product.grabSizes.length) {
      sizes = product.grabSizes;
    } else if ((orderMode === 'FP' || orderMode === 'GB') && !product.fpSizes && !product.grabSizes) {
      sizes = [];
    } else {
      sizes = product.sizes || [];
    }

    return sizes.filter((sizeObj) => Number(sizeObj?.price || 0) > 0);
  };

  const handleSizeSelect = (productId, size) => setSelectedSizes({ [productId]: size });
  const handleQuantityChange = (productId, change) => {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(1, (prev[productId] || 1) + change) }));
  };

  const handleCategoryChange = (categoryCode) => {
    setSelectedCategory(categoryCode);
    setSelectedSizes({});
  };

  const handleCustomerNameChange = (value) => {
    if (!customerNamePrefix) {
      setCustomerName(value);
      return;
    }

    if (value.startsWith(customerNamePrefix)) {
      setCustomerName(value.slice(customerNamePrefix.length));
      return;
    }

    setCustomerName(value);
  };

  const handleQuickAdd = (product) => {
    const productKey = product.productId;
    const selectedSize = selectedSizes[product.productId];
    const quantity = quantities[product.productId] || 1;
    if (!selectedSize) {
      Alert.alert('Missing size', `Please select size for ${product.productName}`);
      return;
    }

    const newItem = {
      addOns: 'None',
      id: generateRandomId(),
      itemCategory: product.categoryCode,
      itemId: product.productId,
      itemName: product.productName,
      itemNotes: 'NA',
      itemPrice: selectedSize.price,
      itemQuantity: quantity,
      itemSize: selectedSize.size,
      itemStatus: 'MAKE',
      itemTotalAmount: selectedSize.price * quantity
    };

    setOrderItems((prev) => [...prev, newItem]);

    setSelectedSizes((prev) => {
      const next = { ...prev };
      delete next[productKey];
      return next;
    });
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[productKey];
      return next;
    });
  };

  const handleCustomize = (product) => {
    const selectedSize = selectedSizes[product.productId];
    const quantity = quantities[product.productId] || 1;

    if (!selectedSize) {
      Alert.alert('Missing size', `Please select size for ${product.productName}`);
      return;
    }

    setCustomizingProduct(product);
    setCustomizingSize(selectedSize);
    setCustomizingQuantity(quantity);
    setSelectedCustomizationAddOns([]);
    setSelectedCustomizationNotes([]);
    setCustomizationCustomNote('');
    setIsCustomizationModalOpen(true);
  };

  const handleCustomizationAddOnToggle = (addOn) => {
    setSelectedCustomizationAddOns((prev) => {
      const exists = prev.find((a) => a.addOnCode === addOn.addOnCode);
      if (exists) return prev.filter((a) => a.addOnCode !== addOn.addOnCode);
      return [...prev, addOn];
    });
  };

  const handleCustomizationNoteToggle = (note) => {
    setSelectedCustomizationNotes((prev) => {
      const exists = prev.find((n) => n.noteId === note.noteId);
      if (exists) return prev.filter((n) => n.noteId !== note.noteId);
      return [...prev, note];
    });
  };

  const getCustomizationTotal = () => {
    if (!customizingSize) return 0;
    const basePrice = Number(customizingSize.price || 0) * Number(customizingQuantity || 1);
    const addOnsTotal = selectedCustomizationAddOns.reduce(
      (sum, addOn) => sum + Number(addOn.addOnPrice || 0) * Number(customizingQuantity || 1),
      0
    );
    return basePrice + addOnsTotal;
  };

  const handleCustomizationAddOrder = () => {
    if (!customizingProduct || !customizingSize) return;

    const addOnsText = selectedCustomizationAddOns.length
      ? selectedCustomizationAddOns.map((a) => a.addOnDesc).join(', ')
      : 'None';

    const notes = [...selectedCustomizationNotes.map((n) => n.noteDesc)];
    if (customizationCustomNote.trim()) notes.push(customizationCustomNote.trim());

    const newItem = {
      addOns: addOnsText,
      id: generateRandomId(),
      itemCategory: customizingProduct.categoryCode,
      itemId: customizingProduct.productId,
      itemName: customizingProduct.productName,
      itemNotes: notes.length ? notes.join(', ') : 'NA',
      itemPrice: customizingSize.price,
      itemQuantity: customizingQuantity,
      itemSize: customizingSize.size,
      itemStatus: 'MAKE',
      itemTotalAmount: getCustomizationTotal()
    };

    setOrderItems((prev) => [...prev, newItem]);

    setSelectedSizes((prev) => {
      const next = { ...prev };
      delete next[customizingProduct.productId];
      return next;
    });
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[customizingProduct.productId];
      return next;
    });

    setIsCustomizationModalOpen(false);
    setCustomizingProduct(null);
    setCustomizingSize(null);
    setCustomizingQuantity(1);
    setSelectedCustomizationAddOns([]);
    setSelectedCustomizationNotes([]);
    setCustomizationCustomNote('');
  };

  const handleDone = async (orderId) => {
    const order = queueItems.find((item) => item.id === orderId);
    if (!order) return Alert.alert('Error', 'Order not found');
    const result = await updateOrderStatus(order.orderNo, order.id, order.branchCode, 'DONE', '');
    if (!result.success) {
      Alert.alert('Error', result.message || 'Failed to mark order done');
      return false;
    }
    return true;
  };

  const handleVoid = async (orderId, voidReason = '') => {
    const order = queueItems.find((item) => item.id === orderId);
    if (!order) return Alert.alert('Error', 'Order not found');
    const reason = String(voidReason || '').trim() || 'VOIDED IN MOBILE';
    const result = await updateOrderStatus(order.orderNo, order.id, order.branchCode, 'VOID', reason);
    if (!result.success) {
      Alert.alert('Error', result.message || 'Failed to void order');
      return false;
    }
    return true;
  };

  const handleStartOrder = async (orderId) => {
    const order = queueItems.find((item) => item.id === orderId);
    if (!order) {
      Alert.alert('Error', 'Order not found');
      return false;
    }

    if (order.isStarted) return true;

    const startTime = getCurrentTime();
    const result = await updateOrderStatus(order.orderNo, order.id, order.branchCode, 'UPD', startTime);
    if (!result.success) {
      Alert.alert('Error', result.message || 'Failed to start order');
      return false;
    }

    const [m, s] = String(order.time || '0:00').split(':').map(Number);
    setElapsedTimes((prev) => ({
      ...prev,
      [order.id]: (Number.isNaN(m) ? 0 : m) * 60 + (Number.isNaN(s) ? 0 : s)
    }));

    return true;
  };

  const handleViewItems = (order) => {
    setSelectedOrderDetails({
      id: order.id,
      orderNo: order.orderNo,
      orderDate: order.orderDate,
      branchCode: order.branchCode,
      orderStatus: order.orderStatus
    });
    setIsOrderDetailsModalOpen(true);
  };

  const handlePrintQueueReceipt = async (order) => {
    try {
      if (!order?.orderNo) {
        Alert.alert('Error', 'Order number is missing');
        return;
      }

      const currentOrderDate = getCurrentPhilippineDate();
      const rows = await fetchOrderPerCustomer(store.branchCode, currentOrderDate, order.orderNo);
      const receiptPayload = Array.isArray(rows) ? rows[0] : null;

      if (!receiptPayload) {
        Alert.alert('Error', 'No order data found for receipt printing');
        return;
      }

      await printReceipt(receiptPayload);
    } catch (error) {
      Alert.alert('Error', error?.message || 'Failed to print receipt');
    }
  };

  const handleOrderModeChange = (nextMode) => {
    if (orderItems.length) return Alert.alert('Order in progress', 'Cancel current order before changing order mode.');
    setOrderMode(nextMode);
    setSelectedSizes({});
  };

  const handleDiscountChange = (value) => {
    setDiscountCodeInput(value);
    setIsDiscountDropdownOpen(false);
    const discount = discountsList.find((d) => d.discountCd === value);
    if (discount) {
      setDiscountValue(discount.discountAmount);
      setDiscountDescription(discount.discountDesc);
      setDiscountType(discount.discountType);
      return;
    }
    const voucher = vouchersList.find((v) => v.voucherCd === value);
    if (voucher) {
      setDiscountValue(voucher.voucherAmount);
      setDiscountDescription(voucher.voucherDesc);
      setDiscountType(voucher.voucherType);
      return;
    }
    setDiscountValue('');
    setDiscountDescription('');
    setDiscountType('');
  };

  const handleCancelOrder = () => {
    setOrderItems([]);
    setSelectedSizes({});
    setConsumeMethod('');
    setCustomerName('');
    setOrderNote('');
    setTableNumber('');
    setRetekessNumber('');
    setDiscountCodeInput('');
    setDiscountAmount('0');
    setDiscountValue('');
    setDiscountDescription('');
    setDiscountType('');
    setIsDiscountDropdownOpen(false);
    setIsEmployeeDropdownOpen(false);
    setSelectedEmployee('');
    setOrderMode('OS');
  };

  const getFilteredConsumeMethods = () => {
    switch (orderMode) {
      case 'GB':
      case 'FP':
        return consumeMethodsList.filter((m) => m.consumeMethodCode === 'ONLN' || m.consumeMethodCode === 'PICK');
      case 'OS':
      case 'KI':
      case 'FD':
        return consumeMethodsList.filter((m) => m.consumeMethodCode === 'DINE' || m.consumeMethodCode === 'TAKE');
      case 'FB':
        return consumeMethodsList.filter((m) => m.consumeMethodCode === 'DELI');
      default:
        return consumeMethodsList;
    }
  };

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  const generateTimeEntryQr = (locationData) => {
    const now = new Date();
    const minuteString = now.toTimeString().split(':').slice(0, 2).join(':');
    const payload = {
      branchCode: store.branchCode,
      branchName: store.name,
      date: now.toISOString().split('T')[0],
      time: minuteString,
      latitude: locationData.latitude,
      longitude: locationData.longitude
    };

    setTimeEntryCurrentMinute(minuteString);
    setTimeEntryQrData(JSON.stringify(payload));
  };

  const loadTimeEntryData = async () => {
    setTimeEntryLoading(true);
    setTimeEntryError('');

    try {
      const locationData = await fetchCurrentLocation();

      setTimeEntryLocation(locationData);
      generateTimeEntryQr(locationData);
    } catch (error) {
      const fallbackLocation = getCachedLocation();
      if (fallbackLocation) {
        setTimeEntryLocation(fallbackLocation);
        generateTimeEntryQr(fallbackLocation);
      }
      setTimeEntryError('');
    } finally {
      setTimeEntryLoading(false);
    }
  };

  useEffect(() => {
    initializeLocation().catch(() => {});
  }, []);

  useEffect(() => {
    preloadReceiptAssets(store.branchCode).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isTimeEntryModalOpen) return;
    loadTimeEntryData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimeEntryModalOpen]);

  useEffect(() => {
    if (!isTimeEntryModalOpen || !timeEntryLocation) return;

    const interval = setInterval(() => {
      const nowMinute = new Date().toTimeString().split(':').slice(0, 2).join(':');
      if (nowMinute !== timeEntryCurrentMinute) {
        generateTimeEntryQr(timeEntryLocation);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimeEntryModalOpen, timeEntryLocation, timeEntryCurrentMinute]);

  const handleCompleteOrder = async () => {
    const normalizedCustomerName = `${customerNamePrefix}${customerName}`.trim();
    const hasTableNumber = Boolean(String(tableNumber || '').trim());
    const hasRetekessNumber = Boolean(String(retekessNumber || '').trim());

    if (!customerName.trim()) return Alert.alert('Validation', 'Please enter Customer Name');
    if (!consumeMethod) return Alert.alert('Validation', 'Please select Consume Method');
    if (!orderItems.length) return Alert.alert('Validation', 'Please add at least one item');
    if (orderMode === 'OS' && !hasTableNumber && !hasRetekessNumber) {
      return Alert.alert('Validation', 'For On Site orders, please provide either Table Number or Retekess Number');
    }

    const currentEmployee = JSON.parse((await getStoredItem('currentEmployee')) || '{}');

    const completeOrderObject = {
      orderDetails: {
        consumeMethod,
        orderDate: getCurrentDate(),
        orderMode,
        orderNo: generateOrderNumber(),
        orderNote: orderNote || '',
        orderTakenBy: currentEmployee.name || 'Unknown',
        orderTime: getCurrentTime()
      },
      orderItems,
      tableDetails: {
        ...(retekessNumber && { retekessNumber }),
        ...(tableNumber && { tableNumber })
      },
      queueDetails: {
        orderStatus: 'MAKE',
        elapsedTime: '00:00',
        timeCompleted: ''
      },
      discountDetails: {
        discountAmount: discountAmount || '0',
        ...(discountCodeInput && { discountCode: discountCodeInput }),
        ...(discountDescription && { discountDescription })
      },
      mainDetails: {
        branchCode: store.branchCode,
        customerName: normalizedCustomerName,
        id: generateRandomTransactionId(),
        totalAmount: totalValue.toFixed(2),
        transactionId: generateRandomTransactionId()
      },
      paymentMethods: [
        {
          id: 1,
          modeOfPayment: orderMode === 'FD' ? 'NEGA' : orderMode === 'GB' ? 'GRAB' : orderMode === 'FP' ? 'FPAN' : 'CASH',
          paymentAmount: parseFloat(totalValue.toFixed(2)),
          referenceNumber: '1111111'
        }
      ]
    };

    if (orderMode === 'OS' || orderMode === 'FB') {
      setPendingCheckoutPayload(completeOrderObject);
      setIsCheckoutModalOpen(true);
      return;
    }

    console.log('[HomePage] completeOrder payload:', JSON.stringify(completeOrderObject, null, 2));

    const result = await completeOrder(completeOrderObject);
    if (!result.success) return Alert.alert('Error', result.message || 'Failed to complete order');

    Alert.alert('Success', 'Order completed successfully!');
    handleCancelOrder();
  };

  const handleCheckoutConfirm = async (paymentMethods, shouldPrintReceipt = false, checkoutSummary = {}) => {
    if (!pendingCheckoutPayload || isCheckoutSubmitting) return;

    setIsCheckoutSubmitting(true);

    try {
      const orderChangeRawValue = Number(checkoutSummary?.orderChange || 0);
      const orderChangeValue = orderChangeRawValue >= 0
        ? Math.floor(orderChangeRawValue)
        : orderChangeRawValue;
      const orderPaymentTotalAmountValue = Number(
        checkoutSummary?.orderPaymentTotalAmount ||
        (Array.isArray(paymentMethods)
          ? paymentMethods.reduce((sum, payment) => sum + Number(payment?.paymentAmount || 0), 0)
          : 0)
      );

      const payloadToSubmit = {
        ...pendingCheckoutPayload,
        paymentMethods: Array.isArray(paymentMethods) && paymentMethods.length ? paymentMethods : pendingCheckoutPayload.paymentMethods,
        orderDetails: {
          ...(pendingCheckoutPayload.orderDetails || {}),
          orderChange: orderChangeValue,
          orderPaymentTotalAmount: orderPaymentTotalAmountValue
        }
      };

      console.log('[HomePage] completeOrder payload:', JSON.stringify(payloadToSubmit, null, 2));

      const result = await completeOrder(payloadToSubmit);
      if (!result.success) return Alert.alert('Error', result.message || 'Failed to complete order');

      if (shouldPrintReceipt) {
        await printReceipt(payloadToSubmit);
      }

      setIsCheckoutModalOpen(false);
      setPendingCheckoutPayload(null);
      Alert.alert('Success', 'Order completed successfully!');
      handleCancelOrder();
    } finally {
      setIsCheckoutSubmitting(false);
    }
  };

  const filteredQueue = [...queueItems]
    .filter((order) => order.orderStatus === activeTab)
    .sort((a, b) => {
      const aTime = Number.isFinite(new Date(a?.createdAt || '').getTime()) ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = Number.isFinite(new Date(b?.createdAt || '').getTime()) ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      return String(a?.orderNo || '').localeCompare(String(b?.orderNo || ''));
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.timeEntryButton} onPress={() => setIsTimeEntryModalOpen(true)}>
            <Text style={styles.actionButtonText}>Time Entry Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.actionButtonText}>POS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('EmployeeAction')}>
            <Text style={styles.actionButtonText}>Employee</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.splitContainer}>
        <ScrollView style={styles.leftColumn} contentContainerStyle={{ paddingBottom: 120 }}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Queue</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRowInline}>
              {['MAKE', 'DONE', 'VOID'].map((tab) => (
                <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab} ({queueItems.filter((o) => o.orderStatus === tab).length})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queueList}>
              {filteredQueue.map((order) => (
                <View key={order.id} style={styles.queueCard}>
                  <Text style={styles.queueTitle}>Order #{order.orderNo}</Text>
                  <Text style={styles.queueMeta}>{order.name} • {order.orderMode}</Text>
                  <Text style={styles.queueMeta}>
                    Time: {order.orderStatus === 'MAKE' && order.isStarted && elapsedTimes[order.id] !== undefined ? formatTime(elapsedTimes[order.id]) : order.time}
                  </Text>
                  <View style={styles.queueActionsRow}>
                    {activeTab === 'MAKE' && !order.isStarted ? (
                      <TouchableOpacity style={styles.startBtn} onPress={() => handleStartOrder(order.id)}>
                        <Text style={styles.smallBtnText}>START ORDER</Text>
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.printBtn} onPress={() => handlePrintQueueReceipt(order)}>
                      <Text style={styles.smallBtnText}>Print Receipt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.smallBtn} onPress={() => handleViewItems(order)}>
                      <Text style={styles.smallBtnText}>Items</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Order Mode</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {orderModesList.map((mode) => (
                <TouchableOpacity
                  key={mode.orderModeCode}
                  style={[styles.chip, orderMode === mode.orderModeCode && styles.chipActive]}
                  onPress={() => handleOrderModeChange(mode.orderModeCode)}
                >
                  <Text style={[styles.chipText, orderMode === mode.orderModeCode && styles.chipTextActive]}>{mode.orderModeDesc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Menu</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              {menuCategories.map((category) => (
                <TouchableOpacity
                  key={category.itemCategoryCode}
                  style={[styles.chip, selectedCategory === category.itemCategoryCode && styles.chipActive]}
                  onPress={() => handleCategoryChange(category.itemCategoryCode)}
                >
                  <Text style={[styles.chipText, selectedCategory === category.itemCategoryCode && styles.chipTextActive]}>{category.itemCategoryDesc}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.menuGrid}>
              {menuItemsList
                .filter((product) => !selectedCategory || product.categoryCode === selectedCategory)
                .map((product) => {
                  const displaySizes = getDisplaySizes(product);
                  if (!displaySizes.length) return null;

                  const productKey = product.productId;
                  const selectedSize = selectedSizes[productKey];
                  const qty = quantities[productKey] || 1;

                  return (
                    <View key={product.productId} style={styles.menuCard}>
                      <Text style={styles.menuName}>{product.productName}</Text>
                      <View style={styles.rowWrap}>
                        {displaySizes.map((sizeObj) => (
                          <TouchableOpacity
                            key={`${product.productId}-${sizeObj.size}`}
                            style={[styles.sizeBtn, selectedSize?.size === sizeObj.size && styles.sizeBtnActive]}
                            onPress={() => handleSizeSelect(productKey, sizeObj)}
                          >
                            <Text style={[styles.sizeText, selectedSize?.size === sizeObj.size && styles.sizeTextActive]}>
                              {sizeObj.size} ₱{sizeObj.price}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={styles.rowGap}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleQuantityChange(productKey, -1)}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{qty}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleQuantityChange(productKey, 1)}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.customizeBtn} onPress={() => handleCustomize(product)}>
                          <Text style={styles.customizeText} numberOfLines={1}>Customize</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickAddBtn} onPress={() => handleQuickAdd(product)}>
                          <Text style={styles.quickAddText} numberOfLines={1}>Quick Add</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.rightColumn}>
        <ScrollView style={styles.rightColumnScroll} contentContainerStyle={styles.rightColumnContent}>
          <View style={styles.sectionCardRight}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          {orderItems.length === 0 ? (
            <View style={styles.noOrdersWrap}>
              <Text style={styles.noOrdersText}>No orders yet. Place an order to start the transaction</Text>
            </View>
          ) : (
            <>
              <View style={styles.orderItemsList}>
                {orderItems.map((item) => (
                  <View key={item.id} style={styles.cartItem}>
                    <Text style={styles.cartTitle}>{item.itemName}</Text>
                    <Text style={styles.cartField}>Size: {item.itemSize || '-'}</Text>
                    <Text style={styles.cartField}>Quantity: {item.itemQuantity || 0}</Text>
                    <Text style={styles.cartField}>Price: ₱{Number(item.itemTotalAmount || 0).toFixed(2)}</Text>
                    <Text style={styles.cartField}>Add Ons: {item.addOns || 'None'}</Text>
                    <Text style={styles.cartField}>Notes: {item.itemNotes || 'NA'}</Text>
                  </View>
                ))}
              </View>

              {orderMode === 'FD' && (
                <View style={styles.employeeSelectionWrap}>
                  <Text style={styles.fieldLabel}>Select Employee</Text>
                  <View style={styles.dropdownBlockTight}>
                    <TouchableOpacity
                      style={styles.dropdownTrigger}
                      onPress={() => setIsEmployeeDropdownOpen((prev) => !prev)}
                    >
                      <Text style={selectedEmployee ? styles.dropdownText : styles.dropdownPlaceholder}>
                        {selectedEmployee
                          ? (employeeList.find((emp) => emp.employeeId === selectedEmployee)?.employeeName || selectedEmployee)
                          : 'Select Employee'}
                      </Text>
                      <Text style={styles.dropdownCaret}>{isEmployeeDropdownOpen ? '▲' : '▼'}</Text>
                    </TouchableOpacity>

                    {isEmployeeDropdownOpen && (
                      <View style={styles.dropdownMenu}>
                        <ScrollView nestedScrollEnabled style={styles.dropdownMenuScroll}>
                          {employeeList.map((emp) => (
                            <TouchableOpacity
                              key={emp.employeeId}
                              style={styles.dropdownOption}
                              onPress={() => {
                                setSelectedEmployee(emp.employeeId);
                                setCustomerName(`Free Drink for ${emp.employeeName}`);
                                setOrderNote(emp.employeeId);
                                setIsEmployeeDropdownOpen(false);
                              }}
                            >
                              <Text style={styles.dropdownOptionText}>{emp.employeeName}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.formSection}>
                <TextInput
                  style={[styles.input, orderMode === 'FD' && styles.inputDisabled]}
                  placeholder="Customer Name"
                  value={`${customerNamePrefix}${customerName}`}
                  onChangeText={handleCustomerNameChange}
                  editable={orderMode !== 'FD'}
                />
                <TextInput
                  style={[styles.input, orderMode === 'FD' && styles.inputDisabled]}
                  placeholder="Order Notes"
                  value={orderNote}
                  onChangeText={setOrderNote}
                  editable={orderMode !== 'FD'}
                />
              </View>

              {orderMode === 'OS' && (
                <View style={styles.formSection}>
                  <TextInput style={styles.input} placeholder="Table Number" value={tableNumber} onChangeText={setTableNumber} />
                  <TextInput style={styles.input} placeholder="Retekess Number" value={retekessNumber} onChangeText={setRetekessNumber} />
                </View>
              )}

              <View style={styles.consumeMethodSection}>
                <Text style={styles.fieldLabel}>Consume Method</Text>
                <View style={styles.consumeMethodGrid}>
                  {getFilteredConsumeMethods().map((method) => (
                    <TouchableOpacity
                      key={method.consumeMethodCode}
                      style={[
                        styles.consumeMethodBtn,
                        consumeMethod === method.consumeMethodCode && styles.consumeMethodBtnActive
                      ]}
                      onPress={() => setConsumeMethod(method.consumeMethodCode)}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.consumeMethodText,
                          consumeMethod === method.consumeMethodCode && styles.consumeMethodTextActive
                        ]}
                      >
                        {method.consumeMethodDesc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {shouldShowDiscountDropdown ? (
                <View style={styles.dropdownBlock}>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => setIsDiscountDropdownOpen((prev) => !prev)}
                  >
                    <Text style={discountCodeInput ? styles.dropdownText : styles.dropdownPlaceholder}>
                      {discountCodeInput || 'Select Discount/Voucher Code'}
                    </Text>
                    <Text style={styles.dropdownCaret}>{isDiscountDropdownOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {isDiscountDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      <ScrollView nestedScrollEnabled style={styles.dropdownMenuScroll}>
                        {discountVoucherOptions.map((option) => (
                          <TouchableOpacity
                            key={option.code}
                            style={styles.dropdownOption}
                            onPress={() => handleDiscountChange(option.code)}
                          >
                            <Text style={styles.dropdownOptionText}>{option.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              ) : null}

              <View style={styles.summaryBox}>
                <Text style={styles.summaryLine}>Sub Total: ₱{subtotalValue.toFixed(2)}</Text>
                <Text style={styles.summaryLine}>Discount: -₱{(parseFloat(discountAmount) || 0).toFixed(2)}</Text>
                <Text style={styles.summaryTotal}>Total: ₱{totalValue.toFixed(2)}</Text>
              </View>

              <View style={styles.orderActionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelOrder}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.completeBtn} onPress={handleCompleteOrder}>
                  <Text style={styles.completeBtnText}>Complete Order</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          </View>
        </ScrollView>
          <OrderCheckoutModal
            isOpen={isCheckoutModalOpen}
            docked
            onClose={() => {
              if (isCheckoutSubmitting) return;
              setIsCheckoutModalOpen(false);
              setPendingCheckoutPayload(null);
            }}
            payload={pendingCheckoutPayload}
            onConfirm={handleCheckoutConfirm}
            isSubmitting={isCheckoutSubmitting}
          />

          <OrderDetailsModal
            isOpen={isOrderDetailsModalOpen}
            onClose={() => {
              setIsOrderDetailsModalOpen(false);
              setSelectedOrderDetails(null);
            }}
            orderData={selectedOrderDetails}
            onDone={handleDone}
            onVoid={handleVoid}
          />
        </View>
      </View>

      <Modal visible={isTimeEntryModalOpen} transparent animationType="fade" onRequestClose={() => setIsTimeEntryModalOpen(false)}>
        <View style={styles.timeEntryOverlay}>
          <View style={styles.timeEntryModalCard}>
            <Text style={styles.timeEntryTitle}>Time Entry QR Code</Text>

            {timeEntryLoading ? (
              <View style={styles.timeEntryLoadingWrap}>
                <ActivityIndicator size="large" color="#f59e0b" />
                <Text style={styles.timeEntryInfo}>Loading location...</Text>
              </View>
            ) : timeEntryError ? (
              <View style={styles.timeEntryLoadingWrap}>
                <Text style={styles.timeEntryError}>{timeEntryError}</Text>
              </View>
            ) : (
              <>
                <View style={styles.timeEntryQrWrap}>
                  {timeEntryQrData ? <QRCode value={timeEntryQrData} size={190} /> : null}
                </View>

                {timeEntryLocation ? (
                  <View style={styles.timeEntryDetailsBox}>
                    <Text style={styles.timeEntryInfo}>Branch: {store.name}</Text>
                    <Text style={styles.timeEntryInfo}>Code: {store.branchCode}</Text>
                    <Text style={styles.timeEntryInfo}>Lat: {timeEntryLocation.latitude.toFixed(6)}</Text>
                    <Text style={styles.timeEntryInfo}>Lng: {timeEntryLocation.longitude.toFixed(6)}</Text>
                    <Text style={styles.timeEntryInfo}>Accuracy: {Number(timeEntryLocation.accuracy || 0).toFixed(2)}m</Text>
                  </View>
                ) : null}
              </>
            )}

            <View style={styles.timeEntryActions}>
              <TouchableOpacity style={styles.timeEntryRefreshBtn} onPress={loadTimeEntryData}>
                <Text style={styles.actionButtonText}>Refresh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timeEntryCloseBtn} onPress={() => setIsTimeEntryModalOpen(false)}>
                <Text style={styles.actionButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isCustomizationModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCustomizationModalOpen(false)}
      >
        <View style={styles.customizationOverlay}>
          <View style={styles.customizationCard}>
            <Text style={styles.customizationTitle}>Customize {customizingProduct?.productName || ''}</Text>
            <Text style={styles.customizationInfo}>
              Size: {customizingSize?.size || '-'} • Qty: {customizingQuantity}
            </Text>

            <Text style={styles.customizationSectionLabel}>Add-Ons</Text>
            <View style={styles.customizationChipsWrap}>
              {addOnsList.map((addOn) => {
                const selected = selectedCustomizationAddOns.some((a) => a.addOnCode === addOn.addOnCode);
                return (
                  <TouchableOpacity
                    key={addOn.addOnCode}
                    style={[styles.customizationChip, selected && styles.customizationChipActive]}
                    onPress={() => handleCustomizationAddOnToggle(addOn)}
                  >
                    <Text style={[styles.customizationChipText, selected && styles.customizationChipTextActive]}>
                      {addOn.addOnDesc} ₱{addOn.addOnPrice}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.customizationSectionLabel}>Notes</Text>
            <View style={styles.customizationChipsWrap}>
              {notesList.map((note) => {
                const selected = selectedCustomizationNotes.some((n) => n.noteId === note.noteId);
                return (
                  <TouchableOpacity
                    key={note.noteId}
                    style={[styles.customizationChip, selected && styles.customizationChipActive]}
                    onPress={() => handleCustomizationNoteToggle(note)}
                  >
                    <Text style={[styles.customizationChipText, selected && styles.customizationChipTextActive]}>{note.noteDesc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Additional notes..."
              value={customizationCustomNote}
              onChangeText={setCustomizationCustomNote}
            />

            <View style={styles.customizationFooter}>
              <Text style={styles.customizationTotal}>Total: ₱{getCustomizationTotal().toFixed(2)}</Text>
              <View style={styles.customizationActionRow}>
                <TouchableOpacity style={styles.customizationBackBtn} onPress={() => setIsCustomizationModalOpen(false)}>
                  <Text style={styles.actionButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.customizationAddBtn} onPress={handleCustomizationAddOrder}>
                  <Text style={styles.actionButtonText}>Add Order</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
  logoutText: { color: '#fff', fontWeight: '700' },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 12
  },
  leftColumn: {
    width: '70%'
  },
  rightColumn: {
    width: '30%',
    position: 'relative'
  },
  rightColumnScroll: {
    flex: 1
  },
  rightColumnContent: {
    flexGrow: 1,
    paddingBottom: 12
  },
  tabsRowInline: { marginBottom: 8 },
  tabBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#11111122',
    backgroundColor: '#ffffff'
  },
  tabBtnActive: { backgroundColor: '#111111', borderColor: '#111111' },
  tabText: { color: '#6b7280', fontWeight: '700' },
  tabTextActive: { color: '#ffffff' },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f59e0b33',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2
  },
  sectionCardRight: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f59e0b33',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 2,
    flex: 1
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#111111', marginBottom: 10, letterSpacing: 0.2 },
  queueList: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2
  },
  queueCard: {
    width: 260,
    borderWidth: 1,
    borderColor: '#f59e0b2f',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#fffcf6'
  },
  queueTitle: { fontWeight: '800', color: '#111111' },
  queueMeta: { color: '#4b5563', marginTop: 2 },
  queueActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 8
  },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  smallBtn: {
    backgroundColor: '#f59e0b',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e78f00',
    minWidth: 110,
    flexGrow: 1,
    alignItems: 'center'
  },
  startBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#15803d',
    minWidth: 110,
    flexGrow: 1,
    alignItems: 'center'
  },
  printBtn: {
    backgroundColor: '#111111',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#111111',
    minWidth: 110,
    flexGrow: 1,
    alignItems: 'center'
  },
  voidBtn: { backgroundColor: '#111111' },
  smallBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  chip: {
    borderWidth: 1,
    borderColor: '#11111133',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    backgroundColor: '#ffffff'
  },
  chipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  chipText: { color: '#111111', fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  menuCard: {
    borderWidth: 1,
    borderColor: '#1111111f',
    borderRadius: 12,
    padding: 10,
    flexBasis: 260,
    flexGrow: 1,
    backgroundColor: '#ffffff',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1
  },
  menuName: { fontWeight: '800', color: '#111111', marginBottom: 8, fontSize: 15 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeBtn: {
    borderWidth: 1,
    borderColor: '#11111133',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff'
  },
  sizeBtnActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  sizeText: { color: '#111111', fontWeight: '600' },
  sizeTextActive: { color: '#fff' },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#11111133',
    alignItems: 'center',
    justifyContent: 'center'
  },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: '#111111' },
  qtyText: { minWidth: 20, textAlign: 'center', fontWeight: '700', color: '#111111' },
  customizeBtn: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    backgroundColor: '#111111',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#111111',
    alignItems: 'center'
  },
  customizeText: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 12 },
  quickAddBtn: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e78f00',
    alignItems: 'center'
  },
  quickAddText: { color: '#fff', fontWeight: '700', textAlign: 'center', fontSize: 12 },
  orderItemsList: { marginTop: 2 },
  cartItem: {
    borderWidth: 1,
    borderColor: '#f59e0b2a',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    backgroundColor: '#fffcf8'
  },
  cartTitle: { fontWeight: '700', color: '#111827' },
  cartField: { color: '#4b5563', marginTop: 3 },
  formSection: { marginTop: 4 },
  employeeSelectionWrap: { marginTop: 8 },
  fieldLabel: { color: '#111111', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  consumeMethodSection: { marginTop: 12, marginBottom: 2 },
  consumeMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  consumeMethodBtn: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#11111133',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  consumeMethodBtnActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b'
  },
  consumeMethodText: {
    color: '#111111',
    fontWeight: '700',
    fontSize: 13
  },
  consumeMethodTextActive: {
    color: '#ffffff'
  },
  selectorScroll: { marginTop: 12, marginBottom: 2 },
  noOrdersWrap: {
    flex: 1,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  noOrdersText: {
    color: '#4b5563',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600'
  },
  input: {
    borderWidth: 1,
    borderColor: '#11111133',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#fffdf9'
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    color: '#6b7280',
    borderColor: '#11111122'
  },
  dropdownBlock: {
    marginTop: 10
  },
  dropdownBlockTight: {
    marginTop: 2
  },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: '#11111133',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fffdf9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dropdownText: {
    color: '#111111',
    fontWeight: '600',
    flex: 1,
    paddingRight: 8
  },
  dropdownPlaceholder: {
    color: '#9ca3af',
    fontWeight: '500',
    flex: 1,
    paddingRight: 8
  },
  dropdownCaret: {
    color: '#111111',
    fontSize: 12
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#11111133',
    borderRadius: 11,
    backgroundColor: '#ffffff',
    overflow: 'hidden'
  },
  dropdownMenuScroll: {
    maxHeight: 170
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#11111114'
  },
  dropdownOptionText: {
    color: '#111111',
    fontSize: 13
  },
  summaryBox: {
    backgroundColor: '#fffbf3',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#f59e0b4a'
  },
  summaryLine: { color: '#374151', marginBottom: 4 },
  summaryTotal: { color: '#111111', fontSize: 16, fontWeight: '800', marginTop: 4 },
  orderActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2
  },
  cancelBtnText: { color: '#ffffff', fontWeight: '700' },
  completeBtn: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 11,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e78f00',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2
  },
  completeBtnText: { color: '#fff', fontWeight: '700' },
  timeEntryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  timeEntryModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fffdf8',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f59e0b3a'
  },
  timeEntryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 12,
    textAlign: 'center'
  },
  timeEntryLoadingWrap: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center'
  },
  timeEntryQrWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  timeEntryDetailsBox: {
    borderWidth: 1,
    borderColor: '#f59e0b33',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fffbf3'
  },
  timeEntryInfo: {
    color: '#374151',
    marginBottom: 4
  },
  timeEntryError: {
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '600'
  },
  timeEntryActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14
  },
  timeEntryRefreshBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    backgroundColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#e78f00',
    alignItems: 'center'
  },
  timeEntryCloseBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    backgroundColor: '#111111',
    alignItems: 'center'
  },
  customizationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  customizationCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    backgroundColor: '#fffdf8',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f59e0b33'
  },
  customizationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111'
  },
  customizationInfo: {
    color: '#4b5563',
    marginTop: 6,
    marginBottom: 10
  },
  customizationSectionLabel: {
    color: '#111111',
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6
  },
  customizationChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  customizationChip: {
    borderWidth: 1,
    borderColor: '#11111133',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff'
  },
  customizationChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b'
  },
  customizationChipText: {
    color: '#374151',
    fontWeight: '600'
  },
  customizationChipTextActive: {
    color: '#fff'
  },
  customizationFooter: {
    marginTop: 12
  },
  customizationTotal: { fontWeight: '800', color: '#111111', marginBottom: 10 },
  customizationActionRow: {
    flexDirection: 'row',
    gap: 8
  },
  customizationBackBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    backgroundColor: '#111111',
    alignItems: 'center'
  },
  customizationAddBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    backgroundColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#e78f00',
    alignItems: 'center'
  }
});

export default HomePage;

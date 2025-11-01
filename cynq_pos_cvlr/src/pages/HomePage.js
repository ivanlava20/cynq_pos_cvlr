import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ArrowUpRightIcon,
    ClockIcon, 
  HomeIcon, 
  UserGroupIcon, 
  ArrowRightOnRectangleIcon
 } from "@heroicons/react/24/outline";
import OrderCheckoutModal from '../components/modal/OrderCheckoutModal';
import CustomizationModal from '../components/modal/CustomizationModal';
import OrderDetailsModal from '../components/modal/OrderDetailsModal';
import TimeEntryModal from '../components/modal/TimeEntryModal';
import { store } from '../config/env';
import './HomePage.css';

const HomePage = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('MAKE');
  const [selectedItems, setSelectedItems] = useState([]);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [isTimeEntryModalOpen, setIsTimeEntryModalOpen] = useState(false);
  const [customizingProduct, setCustomizingProduct] = useState(null);
  const [customizingSize, setCustomizingSize] = useState(null);
  const [customizingQuantity, setCustomizingQuantity] = useState(1);
  const [customizingTrigger, setCustomizingTrigger] = useState(null);


  //Order Items 
  const [orderDetails, setOrderDetails] = useState(null);
  /*
    [type:group]
    consumeMethod,
    orderChange,
    orderDate,
    orderMode,
    orderNo,
    orderNote,
    orderTakenBy,
    orderTime
  */

  const [paymentMethods, setPaymentMethods] = useState(null);
   /*
    [type:arraylist]
    id
    modeOfPayment
    paymentAmount
    referenceNumber
  */

  const [orderItems, setOrderItems] = useState(null);
  /*
    [type:arraylist]
    addOns,
    id,
    itemCategory,
    itemId,
    itemName,
    itemNotes,
    itemPrice,
    itemQuantity,
    itemSize,
    itemStatus,
    itemTotalAmount
  */

  const [tableDetails, setTableDetails] = useState(null);
  /*
    [type:group]
    retekessNumber,
    tableNumber
  */

  const [queueDetails, setQueueDetails] = useState(null);
  /*
    [type:group]
    orderStatus,
    elapsedTime,
    timeCompleted
  */

  const [discountDetails, setDiscountDetails] = useState(null);
  /*
    [type:group]
    discountAmount,
    discountCode,
    discountDescription
  */

  const [mainDetails, setMainDetails] = useState(null);
  /*
    [type:group]
    branchCode,
    customerName,
    id,
    totalAmount,
    transactionId
  */
  const [activeMode, setActiveMode] = useState('Main');
  const [orderMode, setOrderMode] = useState('OS');
  const [consumeMethod, setConsumeMethod] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [retekessNumber, setRetekessNumber] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountDescription, setDiscountDescription] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [subtotalValue, setSubtotalValue] = useState(0.00);
  const [elapsedTimes, setElapsedTimes] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSizes, setSelectedSizes] = useState({});
  const [quantities, setQuantities] = useState({});

  // Generate random 7-digit ID
  const generateRandomId = () => {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
  };

  // Helper function to generate random 15-character ID with numbers and letters
  const generateRandomTransactionId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 15; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  // Helper function to get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Helper function to get current time in HH:MM:SS format
  const getCurrentTime = () => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  };

  // Helper function to generate order number based on order mode
  const generateOrderNumber = () => {
    const timestamp = Date.now().toString().slice(-4);
    return `${orderMode}${timestamp}`;
  };

  // Handle Quick Add
  const handleQuickAdd = (product, displaySizes) => {
    const productKey = product.productId;
    const selectedSize = selectedSizes[productKey];
    const quantity = quantities[productKey] || 1;
    
    // Check if size is selected
    if (!selectedSize) {
      alert(`Please select size for ${product.productName}`);
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
    
    setOrderItems(prevItems => {
      if (!prevItems) return [newItem];
      return [...prevItems, newItem];
    });
    
    // Update subtotal
    setSubtotalValue(prev => prev + newItem.itemTotalAmount);
    
    // Reset the selected size and quantity for this product
    setSelectedSizes(prev => {
      const updated = { ...prev };
      delete updated[productKey];
      return updated;
    });
    
    setQuantities(prev => {
      const updated = { ...prev };
      delete updated[productKey];
      return updated;
    });
  };

  // Handle size selection
  const handleSizeSelect = (productId, size) => {
    setSelectedSizes(prev => ({
      ...prev,
      [productId]: size
    }));
  };

  // Handle quantity change
  const handleQuantityChange = (productId, change) => {
    setQuantities(prev => {
      const currentQty = prev[productId] || 1;
      const newQty = Math.max(1, currentQty + change);
      return {
        ...prev,
        [productId]: newQty
      };
    });
  };

  // Initialize elapsed times when component mounts
  React.useEffect(() => {
    const initialTimes = {};
    queueItems.forEach(order => {
      if (order.orderStatus === 'MAKE') {
        // Parse initial time (e.g., "1:00" to seconds)
        const [minutes, seconds] = order.time.split(':').map(Number);
        initialTimes[order.id] = minutes * 60 + seconds;
      }
    });
    setElapsedTimes(initialTimes);
  }, []);

  //Simplified queueItems with only essential data
  const [queueItems, setQueueItems] = useState([
    { 
      id: 'GB002', 
      name: 'Mikaela', 
      items: 2, 
      time: '0:00', 
      orderMode: 'Grab', 
      color: 'green', 
      orderStatus: 'MAKE',
      orderNo: 'GB002',
      orderDate: '2024-10-28',
      branchCode: 'BR001'
    },
    { 
      id: 'GB001', 
      name: 'John Doe', 
      items: 1, 
      time: '5:00', 
      orderMode: 'Grab', 
      color: 'green', 
      orderStatus: 'DONE',
      orderNo: 'GB001',
      orderDate: '2024-10-28',
      branchCode: 'BR001'
    },
    { 
      id: 'OS001', 
      name: 'Ivan Lava', 
      items: 3, 
      time: '0:00', 
      orderMode: 'Dine In', 
      color: 'orange', 
      orderStatus: 'MAKE',
      orderNo: 'OS001',
      orderDate: '2024-10-28',
      branchCode: 'BR001'
    },
    { 
      id: 'FP001', 
      name: 'Maria Cruz', 
      items: 2, 
      time: '0:00', 
      orderMode: 'Foodpanda', 
      color: 'pink', 
      orderStatus: 'MAKE',
      orderNo: 'FP001',
      orderDate: '2024-10-28',
      branchCode: 'BR001'
    }
  ]);

  const [isOrderDetailsModalOpen, setIsOrderDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  // Handle Done button
  const handleDone = (orderId) => {
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    setQueueItems(prevItems =>
      prevItems.map(item =>
        item.id === orderId
          ? {
              ...item,
              orderStatus: 'DONE',
              time: elapsedTimes[orderId] ? formatTime(elapsedTimes[orderId]) : item.time
            }
          : item
      )
    );
  };

  // Handle Void button
  const handleVoid = (orderId) => {
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    setQueueItems(prevItems =>
      prevItems.map(item =>
        item.id === orderId
          ? {
              ...item,
              orderStatus: 'VOID',
              time: elapsedTimes[orderId] ? formatTime(elapsedTimes[orderId]) : item.time
            }
          : item
      )
    );
  };

  // Handle Items button - only pass essential data to fetch full details
  const handleViewItems = (order) => {
    setSelectedOrderDetails({
      orderNo: order.orderNo,
      orderDate: order.orderDate,
      branchCode: order.branchCode
    });
    setIsOrderDetailsModalOpen(true);
  };

  // Handle Customize button click
  const handleCustomize = (product, displaySizes, event) => {
    const productKey = product.productId;
    const selectedSize = selectedSizes[productKey];
    const quantity = quantities[productKey] || 1;
    
    // Check if size is selected
    if (!selectedSize) {
      alert(`Please select size for ${product.productName}`);
      return;
    }

    setCustomizingProduct(product);
    setCustomizingSize(selectedSize);
    setCustomizingQuantity(quantity);
    setCustomizingTrigger(event.currentTarget.closest('.product-card'));
    setIsCustomizationModalOpen(true);
  };

  // Handle Add Order from customization
  const handleCustomizationAddOrder = (customization) => {
    const newItem = {
      addOns: customization.addOns,
      id: generateRandomId(),
      itemCategory: customizingProduct.categoryCode,
      itemId: customizingProduct.productId,
      itemName: customizingProduct.productName,
      itemNotes: customization.notes,
      itemPrice: customizingSize.price,
      itemQuantity: customizingQuantity,
      itemSize: customizingSize.size,
      itemStatus: 'MAKE',
      itemTotalAmount: customization.totalAmount
    };
    
    setOrderItems(prevItems => {
      if (!prevItems) return [newItem];
      return [...prevItems, newItem];
    });
    
    // Update subtotal
    setSubtotalValue(prev => prev + newItem.itemTotalAmount);
    
    // Reset the selected size and quantity for this product
    const productKey = customizingProduct.productId;
    setSelectedSizes(prev => {
      const updated = { ...prev };
      delete updated[productKey];
      return updated;
    });
    
    setQuantities(prev => {
      const updated = { ...prev };
      delete updated[productKey];
      return updated;
    });
  };

  // Calculate discount amount based on type
  const calculateDiscountAmount = () => {
    if (!discountValue || !discountType) return 0;
    
    if (discountType === 'PERC') {
      // Percentage discount
      return (subtotalValue * parseFloat(discountValue)) / 100;
    } else if (discountType === 'CASH') {
      // Cash discount
      return parseFloat(discountValue);
    }
    return 0;
  };

  // Set discountAmount whenever it's calculated
  React.useEffect(() => {
    const calculated = calculateDiscountAmount();
    setDiscountAmount(calculated.toString());
  }, [discountValue, discountType, subtotalValue]);

  // Clear orderItems when orderMode changes
  React.useEffect(() => {
    setOrderItems(null);
  }, [orderMode]);

  // Clear all order-related fields when orderItems becomes null
  React.useEffect(() => {
    if (orderItems === null || (Array.isArray(orderItems) && orderItems.length === 0)) {
      setOrderDetails(null);
      setPaymentMethods(null);
      setTableDetails(null);
      setQueueDetails(null);
      setDiscountDetails(null);
      setMainDetails(null);
      setConsumeMethod('');
      setCustomerName('');
      setOrderNote('');
      setTableNumber('');
      setRetekessNumber('');
      setDiscountCode('');
      setDiscountAmount('');
      setDiscountValue('');
      setDiscountDescription('');
      setDiscountType('');
      setInputValue('');
      setSubtotalValue(0);
      setOrderMode('OS');
    }
  }, [orderItems]);

  const totalValue = subtotalValue - (parseFloat(discountAmount) || 0);

  //Retrieve from Firebase
  const discountsList = [
    { discountAmount: '20', discountCd: 'P20', discountDesc: "20%" , discountType: 'PERC'},
  ]

  //Retrieve from Firebase
  const vouchersList = [
    { voucherAmount: '50', voucherCd: 'V50', voucherDesc: "50 PESOS DISCOUNT" , voucherType: 'CASH'},
    { voucherAmount: '10', voucherCd: 'CVLRPRMO', voucherDesc: "CAFE VANLEROE PROMO CODE" , voucherType: 'PERC'},
  ]

  //Retrieve from Firebase
  const orderModesList = [
    {orderModeCode: 'GB', orderModeDesc: 'Grab'},
    {orderModeCode: 'OS', orderModeDesc: 'On-Site'},
    {orderModeCode: 'FP', orderModeDesc: 'Foodpanda'},
    {orderModeCode: 'KI', orderModeDesc: 'Kiosk'},
    {orderModeCode: 'FD', orderModeDesc: 'Free Drink'},
    {orderModeCode: 'FB', orderModeDesc: 'Facebook'}
  ]

  //Retrieve from Firebase
  const menuCategories = [
    { itemCategoryCode: 'TEA', itemCategoryDesc: 'Tea', hasSize: 'Y' },
    { itemCategoryCode: 'HCD', itemCategoryDesc: 'Hot and Cold Drinks', hasSize: 'Y' },
    { itemCategoryCode: 'NCB', itemCategoryDesc: 'Non-Coffee Based Blended Beverage', hasSize: 'Y' },
    { itemCategoryCode: 'CBB', itemCategoryDesc: 'Coffee Based Blended Beverage', hasSize: 'Y' },
    { itemCategoryCode: 'COL', itemCategoryDesc: 'Coolers', hasSize: 'Y' },
    { itemCategoryCode: 'FOD', itemCategoryDesc: 'Food', hasSize: 'N' },
    { itemCategoryCode: 'PST', itemCategoryDesc: 'Pastries', hasSize: 'N' },
 ]


  //Retrieve from Firebase
  const consumeMethodsList = [
    { consumeMethodCode: 'DINE', consumeMethodDesc: 'Dine In' },
    { consumeMethodCode: 'TAKE', consumeMethodDesc: 'Take Out' },
    { consumeMethodCode: 'DELI', consumeMethodDesc: 'Delivery' },
    { consumeMethodCode: 'ONLN', consumeMethodDesc: 'Online Delivery Apps' },
    { consumeMethodCode: 'PICK', consumeMethodDesc: 'Pick-Up' }
  ]


  //Retrieve from Firebase
  const addOnsList = [
    { addOnCode: 'OAT', addOnDesc: 'Oat Milk', addOnPrice: 15 },
    { addOnCode: 'COC', addOnDesc: 'Coco Powder', addOnPrice: 50 },
    { addOnCode: 'VAN', addOnDesc: 'Vanilla', addOnPrice: 20 },
    { addOnCode: 'SUG', addOnDesc: 'Sugar', addOnPrice: 35 }

  ]

  //Retrieve from Firebase
  const employeeList = [
    { employeeId: 'EMPM001', employeeName: 'Ivan Lava' },
    { employeeId: 'EMPM002', employeeName: 'Maria Clara' },
    { employeeId: 'EMPO001', employeeName: 'John Doe' },
  ]

  //Retrieve from Firebase
  const notesList = [
    {noteId: 1, noteDesc: 'No Sugar'},
    {noteId: 2, noteDesc: 'Less Sugar'},
    {noteId: 3, noteDesc: 'No Ice'},
    {noteId: 4, noteDesc: 'Less Ice'},
    {noteId: 5, noteDesc: 'Hot'},
    {noteId: 6, noteDesc: 'Cold'}
  ]

  //In here add a listener to check if there is an update in the menu items

  /* This should be a one time load */
  //Retrieve from Firebase
  const menuItemsList = [
    {
        productName: 'Spanish Latte',
        categoryCode: 'HCD',
        productId: 'HCD001',
        image: '/path-to-image.jpg',
        sizes: [
          { size: 'S', price: 100 },
          { size: 'M', price: 105 },
          { size: 'L', price: 120 }
        ],
        fpSizes:[
            { size: 'S', price: 120 },
            { size: 'M', price: 125 },
            { size: 'L', price: 130 }
        ],
        grabSizes:[
            { size: 'S', price: 130 },
            { size: 'M', price: 135 },
            { size: 'L', price: 140 }
        ]
    },
    {
        productName: 'Hojicha Latte',
        categoryCode: 'TEA',
        productId: 'TEA001',
        image: '/path-to-image.jpg',
        sizes: [
          { size: 'M', price: 155 },
          { size: 'L', price: 170 }
        ]
    },
        {
        productName: 'Lasagna',
        categoryCode: 'FOD',
        productId: 'FOD001',
        image: '/path-to-image.jpg',
        sizes: [
          { size: 'STD', price: 209 },
        ]
    },
    {
        productName: 'Tiramisu',
        categoryCode: 'PST',
        productId: 'PST001',
        image: '/path-to-image.jpg',
        sizes: [
          { size: 'STD', price: 165 },
        ],
        fpSizes:[
            { size: 'STD', price: 180 },
        ],
        grabSizes:[
            { size: 'STD', price: 180 },
        ]
    },
    
  ]

  const handleLogout = () => {
    navigation.navigate('Login');
  };

  const handleEmployeeMode = () => {
    navigation.navigate('EmployeeAction');
  };

  const handleDiscountChange = (value) => {
    setInputValue(value);
    
    // Check in discountsList first
    const discount = discountsList.find(d => d.discountCd === value);
    if (discount) {
      setDiscountCode(discount.discountCd);
      setDiscountValue(discount.discountAmount);
      setDiscountDescription(discount.discountDesc);
      setDiscountType(discount.discountType);
      return;
    }
    
    // Check in vouchersList
    const voucher = vouchersList.find(v => v.voucherCd === value);
    if (voucher) {
      setDiscountCode(voucher.voucherCd);
      setDiscountValue(voucher.voucherAmount);
      setDiscountDescription(voucher.voucherDesc);
      setDiscountType(voucher.voucherType);
      return;
    }
    
    // If not found in either list, clear all values
    setDiscountCode('');
    setDiscountValue('');
    setDiscountDescription('');
    setDiscountType('');
  };

  // Add state for employee selection (for FD mode)
  const [selectedEmployee, setSelectedEmployee] = useState('');

  // Update handleCancelOrder to reset employee selection
  const handleCancelOrder = () => {
    setOrderDetails(null);
    setPaymentMethods(null);
    setOrderItems(null);
    setTableDetails(null);
    setQueueDetails(null);
    setDiscountDetails(null);
    setMainDetails(null);
    setOrderMode('OS');
    setConsumeMethod('');
    setCustomerName('');
    setOrderNote('');
    setTableNumber('');
    setRetekessNumber('');
    setDiscountCode('');
    setDiscountAmount('');
    setDiscountValue('');
    setDiscountDescription('');
    setDiscountType('');
    setInputValue('');
    setSelectedEmployee('');
  };

  // Add handler for employee selection (FD mode)
  const handleEmployeeSelect = (e) => {
    const employeeId = e.target.value;
    setSelectedEmployee(employeeId);
    
    const employee = employeeList.find(emp => emp.employeeId === employeeId);
    if (employee) {
      setCustomerName(`Free Drink for ${employee.employeeName}`);
      setOrderNote(employeeId);
    } else {
      setCustomerName('');
      setOrderNote('');
    }
  };

  // Helper function to get filtered consume methods based on order mode
  const getFilteredConsumeMethods = () => {
    switch(orderMode) {
      case 'GB':
      case 'FP':
        return consumeMethodsList.filter(method => 
          method.consumeMethodCode === 'ONLN' || method.consumeMethodCode === 'PICK'
        );
      case 'OS':
      case 'KI':
      case 'FD':
        return consumeMethodsList.filter(method => 
          method.consumeMethodCode === 'DINE' || method.consumeMethodCode === 'TAKE'
        );
      case 'FB':
        return consumeMethodsList.filter(method => 
          method.consumeMethodCode === 'DELI'
        );
      default:
        return consumeMethodsList;
    }
  };

  // Helper function to check if prefix is needed
  const getCustomerNamePrefix = () => {
    switch(orderMode) {
      case 'GB': return 'GF-';
      case 'FP': return 'FP-';
      case 'KI': return 'KI-';
      case 'FB': return 'FB-';
      default: return '';
    }
  };

  // Update handleCompleteOrder validation
  const handleCompleteOrder = () => {
    // Validation checks
    if (!customerName || customerName.trim() === '') {
      alert('Please enter Customer Name');
      return;
    }
    
    if (!consumeMethod || consumeMethod === '') {
      alert('Please select Consume Method');
      return;
    }

    // Generate IDs
    const mainId = generateRandomTransactionId();
    const transactionId = generateRandomTransactionId();
    const orderNo = generateOrderNumber();

    // Prepare order details
    const orderDetailsData = {
      consumeMethod: consumeMethod,
      orderDate: getCurrentDate(),
      orderMode: orderMode,
      orderNo: orderNo,
      orderNote: orderNote || '',
      orderTakenBy: 'Current User', // Replace with actual logged-in user
      orderTime: getCurrentTime()
    };

    // Prepare table details (only if values exist)
    const tableDetailsData = {
      ...(retekessNumber && { retekessNumber: retekessNumber }),
      ...(tableNumber && { tableNumber: tableNumber })
    };

    // Prepare queue details
    const queueDetailsData = {
      orderStatus: 'MAKE',
      elapsedTime: '00:00',
      timeCompleted: ''
    };

    // Prepare discount details (only if values exist)
    const discountDetailsData = {
      discountAmount: discountAmount || '0',
      ...(discountCode && { discountCode: discountCode }),
      ...(discountDescription && { discountDescription: discountDescription })
    };

    // Prepare main details
    const mainDetailsData = {
      branchCode: store.branchCode,
      customerName: customerName,
      id: mainId,
      totalAmount: totalValue.toFixed(2),
      transactionId: transactionId
    };

    // Determine payment method code based on order mode
    let paymentMethodCode = '';
    if (orderMode === 'FD') {
      paymentMethodCode = 'NEGA';
    } else if (orderMode === 'GB') {
      paymentMethodCode = 'GRAB';
    } else if (orderMode === 'FP') {
      paymentMethodCode = 'FPAN';
    }

    // Prepare payment methods
    const paymentMethodsData = [{
      id: 1,
      modeOfPayment: paymentMethodCode,
      paymentAmount: parseFloat(totalValue.toFixed(2)),
      referenceNumber: '1111111'
    }];

    // Set all data to state
    setOrderDetails(orderDetailsData);
    setOrderItems(orderItems); // Already exists
    setTableDetails(Object.keys(tableDetailsData).length > 0 ? tableDetailsData : null);
    setQueueDetails(queueDetailsData);
    setDiscountDetails(discountDetailsData);
    setMainDetails(mainDetailsData);
    setPaymentMethods(paymentMethodsData);

    // Log all the data
    console.log('=== COMPLETE ORDER DATA (FP/FD/GB) ===');
    console.log('\n--- 1. Order Details (State) ---');
    console.log(JSON.stringify(orderDetailsData, null, 2));
    
    console.log('\n--- 2. Order Items (State) ---');
    console.log(JSON.stringify(orderItems, null, 2));
    
    console.log('\n--- 3. Table Details (State) ---');
    console.log(JSON.stringify(Object.keys(tableDetailsData).length > 0 ? tableDetailsData : null, null, 2));
    
    console.log('\n--- 4. Queue Details (State) ---');
    console.log(JSON.stringify(queueDetailsData, null, 2));
    
    console.log('\n--- 5. Discount Details (State) ---');
    console.log(JSON.stringify(discountDetailsData, null, 2));
    
    console.log('\n--- 6. Main Details (State) ---');
    console.log(JSON.stringify(mainDetailsData, null, 2));
    
    console.log('\n--- 7. Payment Methods (State) ---');
    console.log(JSON.stringify(paymentMethodsData, null, 2));
    
    console.log('\n=== COMPLETE ORDER OBJECT FOR FIREBASE ===');
    const completeOrderObject = {
      orderDetails: orderDetailsData,
      orderItems: orderItems,
      tableDetails: Object.keys(tableDetailsData).length > 0 ? tableDetailsData : null,
      queueDetails: queueDetailsData,
      discountDetails: discountDetailsData,
      mainDetails: mainDetailsData,
      paymentMethods: paymentMethodsData
    };
    console.log(JSON.stringify(completeOrderObject, null, 2));
    
    console.log('\n=== SUMMARY ===');
    console.log(`Order Mode: ${orderMode}`);
    console.log(`Customer: ${customerName}`);
    console.log(`Order No: ${orderNo}`);
    console.log(`Total Amount: ₱${totalValue.toFixed(2)}`);
    console.log(`Payment Method: ${paymentMethodCode}`);
    console.log(`Transaction ID: ${transactionId}`);
    console.log(`Branch Code: ${store.branchCode}`);
    console.log(`Order Date: ${getCurrentDate()}`);
    console.log(`Order Time: ${getCurrentTime()}`);
    console.log('===========================\n');

    // For FP, FD, GB - directly process the order without payment modal
    // TODO: Send completeOrderObject to Firebase or backend here
    
    // Clear the order after processing
    alert('Order completed successfully!\nCheck console for complete order data.');
    handleCancelOrder();
  };

  // Update handleCompleteCheckout validation
  const handleCompleteCheckout = () => {
    if (!customerName || customerName.trim() === '') {
      alert('Please enter Customer Name');
      return;
    }
    
    if (!consumeMethod || consumeMethod === '') {
      alert('Please select Consume Method');
      return;
    }
    
    // Validation for OS order mode
    if (orderMode === 'OS') {
      if (!tableNumber && !retekessNumber) {
        alert('Please enter either Table Number or Retekess Number');
        return;
      }
    }
    
    // Generate IDs
    const mainId = generateRandomTransactionId();
    const transactionId = generateRandomTransactionId();
    const orderNo = generateOrderNumber();
    
    // Prepare order details
    const orderDetailsData = {
      consumeMethod: consumeMethod,
      orderDate: getCurrentDate(),
      orderMode: orderMode,
      orderNo: orderNo,
      orderNote: orderNote || '',
      orderTakenBy: 'Current User', // Replace with actual logged-in user
      orderTime: getCurrentTime()
    };
    
    // Prepare table details
    const tableDetailsData = {
      retekessNumber: retekessNumber || '',
      tableNumber: tableNumber || ''
    };
    
    // Prepare queue details
    const queueDetailsData = {
      orderStatus: 'MAKE',
      elapsedTime: '00:00',
      timeCompleted: ''
    };
    
    // Prepare discount details
    const discountDetailsData = {
      discountAmount: discountAmount || '0',
      discountCode: discountCode || '',
      discountDescription: discountDescription || ''
    };
    
    // Prepare main details
    const mainDetailsData = {
      branchCode: store.branchCode,
      customerName: customerName,
      id: mainId,
      totalAmount: totalValue.toFixed(2),
      transactionId: transactionId
    };
    
    // Set all data and open modal
    setOrderDetails(orderDetailsData);
    setTableDetails(tableDetailsData);
    setQueueDetails(queueDetailsData);
    setDiscountDetails(discountDetailsData);
    setMainDetails(mainDetailsData);
    
    // If validation passes, open checkout modal
    setIsCheckoutModalOpen(true);
  };

  // Update elapsed times every second for MAKE orders
  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTimes(prevTimes => {
        const newTimes = { ...prevTimes };
        queueItems.forEach(order => {
          if (order.orderStatus === 'MAKE' && newTimes[order.id] !== undefined) {
            newTimes[order.id] += 1;
          }
        });
        return newTimes;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [queueItems]);

  // Helper function to format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Add handler for order mode change with validation
  const handleOrderModeChange = (e) => {
    const newOrderMode = e.target.value;
    
    // Check if there are existing order items
    if (orderItems && orderItems.length > 0) {
      alert('Please cancel the current order before changing the Order Mode.');
      return;
    }
    
    setOrderMode(newOrderMode);
  };

  return (
    <div className="home-container">
      {/* Left Section - Queue, Order Mode, and Menu */}
      <div className="left-section">
        {/* Queue Section */}
        <div className="queue-section">
          <div className="queue-header">
            <h2>Queue</h2>
            <div className="header-actions">
              <button 
                className="time-entry-btn"
                onClick={() => setIsTimeEntryModalOpen(true)}
              >
                <ClockIcon className="btn-icon" />
                TIME ENTRY SCAN
              </button>
              <div className="mode-toggle">
                <button 
                  className={`mode-btn ${activeMode === 'Main' ? 'active' : ''}`}
                  onClick={() => setActiveMode('Main')}
                >
                  <HomeIcon className="btn-icon" />
                  Main
                </button>
                <button 
                  className={`mode-btn ${activeMode === 'Employee' ? 'active' : ''}`}
                  onClick={handleEmployeeMode}
                >
                  <UserGroupIcon className="btn-icon" />
                  Employee
                </button>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                <ArrowRightOnRectangleIcon className="btn-icon" />
                Logout
              </button>
            </div>
          </div>
          
          <div className="queue-tabs">
            <button 
              className={activeTab === 'MAKE' ? 'active' : ''} 
              onClick={() => setActiveTab('MAKE')}
            >
              Ongoing ({queueItems.filter(order => order.orderStatus === 'MAKE').length})
            </button>
            <button 
              className={activeTab === 'DONE' ? 'active' : ''} 
              onClick={() => setActiveTab('DONE')}
            >
              Done ({queueItems.filter(order => order.orderStatus === 'DONE').length})
            </button>
            <button 
              className={activeTab === 'VOID' ? 'active' : ''} 
              onClick={() => setActiveTab('VOID')}
            >
              Void ({queueItems.filter(order => order.orderStatus === 'VOID').length})
            </button>
          </div>

          <div className="orders-list">
            {queueItems
              .filter(order => order.orderStatus === activeTab)
              .map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-info">
                    <h3>Order #{order.id}</h3>
                    <p>{order.name}</p>
                    <span className={`status-badge ${order.color}`}>{order.orderMode}</span>
                    <p className="time-elapsed">
                      Time elapsed: {order.orderStatus === 'MAKE' && elapsedTimes[order.id] 
                        ? formatTime(elapsedTimes[order.id]) 
                        : order.time}
                    </p>
                  </div>
                  <div className="order-actions">
                    <button className="items-btn" onClick={() => handleViewItems(order)}>
                      {order.items} Items  
                      <ArrowUpRightIcon className="icon" />
                    </button>
                    {activeTab === 'MAKE' && (
                      <>
                        <button className="done-btn" onClick={() => handleDone(order.id)}>Done</button>
                        <button className="void-btn" onClick={() => handleVoid(order.id)}>Void</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Order Mode */}
        <div className="order-mode">
          <h2>Order Mode</h2>
          <select 
            value={orderMode} 
            onChange={handleOrderModeChange}
            className="order-mode-select"
            disabled={orderItems && orderItems.length > 0}
            style={{
              cursor: orderItems && orderItems.length > 0 ? 'not-allowed' : 'pointer',
              opacity: orderItems && orderItems.length > 0 ? 0.6 : 1
            }}
          >
            <option value="">Select Order Mode</option>
            {orderModesList.map((mode) => (
              <option key={mode.orderModeCode} value={mode.orderModeCode}>
                {mode.orderModeDesc}
              </option>
            ))}
          </select>
          {orderItems && orderItems.length > 0 && (
            <p style={{ 
              color: '#ef4444', 
              fontSize: '12px', 
              marginTop: '5px',
              fontStyle: 'italic' 
            }}>
              Cancel order to change mode
            </p>
          )}
        </div>

        {/* Menu Section - NO WRAPPER */}
        <div className="menu-section">
          <h2>Menu</h2>
          <div className="menu-categories">
            {menuCategories.map((category) => (
              <button 
                key={category.itemCategoryCode} 
                className={selectedCategory === category.itemCategoryCode ? 'active' : ''}
                onClick={() => setSelectedCategory(category.itemCategoryCode)}
              >
                {category.itemCategoryDesc}
              </button>
            ))}
          </div>

          <div className="products-grid">
            {menuItemsList
              .filter(product => !selectedCategory || product.categoryCode === selectedCategory)
              .map((product, index) => {
                // Determine which sizes to display based on orderMode
                let displaySizes = product.sizes; // default
                
                if (orderMode === 'FP' && product.fpSizes && product.fpSizes.length > 0) {
                  displaySizes = product.fpSizes;
                } else if (orderMode === 'GB' && product.grabSizes && product.grabSizes.length > 0) {
                  displaySizes = product.grabSizes;
                } else if (orderMode === 'FP' || orderMode === 'GB') {
                  // If orderMode is FP or GB but no corresponding sizes exist, skip this item
                  return null;
                }
                
                const productKey = product.productId;
                const selectedSize = selectedSizes[productKey]; // No default, starts as undefined
                const quantity = quantities[productKey] || 1;
                
                return (
                  <div key={index} className="product-card">
                    <img src={product.image} alt={product.productName} className="product-image" />
                    <h3>{product.productName}</h3>
                    <div className="size-options">
                      <span>Size</span>
                      <div className="sizes">
                        {displaySizes.map((size, idx) => (
                          <button 
                            key={idx} 
                            className={selectedSize && selectedSize.size === size.size ? 'active' : ''}
                            onClick={() => handleSizeSelect(productKey, size)}
                          >
                            {size.size} ₱{size.price}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="quantity-control">
                      <span>Quantity</span>
                      <div className="quantity-input">
                        <button onClick={() => handleQuantityChange(productKey, -1)}>-</button>
                        <input type="number" value={quantity} readOnly />
                        <button onClick={() => handleQuantityChange(productKey, 1)}>+</button>
                      </div>
                    </div>
                    <div className="product-actions">
                      <button 
                        className="customize-btn"
                        onClick={(e) => handleCustomize(product, displaySizes, e)}
                      >
                        Customize
                      </button>
                      <button 
                        className="quick-add-btn"
                        onClick={() => handleQuickAdd(product, displaySizes)}
                      >
                        Quick Add ⭐
                      </button>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>

      {/* Right Section - Order Details */}
      <div className="right-section">
        <div className="order-details-panel">
          <h2>Order Details</h2>
          {orderItems && orderItems.length > 0 ? (
            <>
              {orderItems.map((item) => (
                <div key={item.id} className="selected-item">
                  <img src="/path-to-image.jpg" alt={item.itemName} />
                  <div className="item-info">
                    <h3>{item.itemName}</h3>
                    <p>Size: {item.itemSize}</p>
                    <p>Quantity: {item.itemQuantity}</p>
                    <p>Price: ₱{item.itemTotalAmount}</p>
                    <p className="item-notes">Add Ons: {item.addOns}</p>
                    <p className="item-notes">Notes: {item.itemNotes}</p>
                  </div>
                </div>
              ))}

              <h2>Customer Details</h2>
              {orderMode === 'FD' ? (
                <select
                  value={selectedEmployee}
                  onChange={handleEmployeeSelect}
                  className="customer-select"
                >
                  <option value="">Select Employee</option>
                  {employeeList.map((employee) => (
                    <option key={employee.employeeId} value={employee.employeeId}>
                      {employee.employeeName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="customer-name-input">
                  {getCustomerNamePrefix() && (
                    <span className="input-prefix">{getCustomerNamePrefix()}</span>
                  )}
                  <input 
                    type="text" 
                    placeholder={getCustomerNamePrefix() ? "Customer ID/Name" : "Customer Name"}
                    value={customerName.replace(getCustomerNamePrefix(), '')}
                    onChange={(e) => setCustomerName(getCustomerNamePrefix() + e.target.value)}
                    style={getCustomerNamePrefix() ? { paddingLeft: '45px' } : {}}
                  />
                </div>
              )}
              
              {/* Show Order Notes textarea for all modes except FD */}
              {orderMode !== 'FD' && (
                <>
                  <h2>Order Notes</h2>
                  <textarea 
                    placeholder="Order Notes"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                  />
                </>
              )}

              {orderMode === 'OS' && (
                <>
                  <h2>Table Details</h2>
                  <input 
                    type="text" 
                    placeholder="Table Number (If Applicable)" 
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Retekess Number" 
                    value={retekessNumber}
                    onChange={(e) => setRetekessNumber(e.target.value)}
                  />
                </>
              )}

              <h2>Consume Method</h2>
              <select 
                value={consumeMethod} 
                onChange={(e) => setConsumeMethod(e.target.value)}
                className="consume-method-select"
              >
                <option value="">Select Consume Method</option>
                {getFilteredConsumeMethods().map((method) => (
                  <option key={method.consumeMethodCode} value={method.consumeMethodCode}>
                    {method.consumeMethodDesc}
                  </option>
                ))}
              </select>

              {orderMode !== 'FD' && (
                <>
                  <h2>Discounts/Voucher</h2>
                  {(orderMode === 'GB' || orderMode === 'FP') ? (
                    <div className="discount-amount-input">
                      <input 
                        type="number" 
                        placeholder="Discount Amount (₱)" 
                        value={discountAmount}
                        onChange={(e) => {
                          setDiscountAmount(e.target.value);
                          setDiscountType('CASH');
                          setDiscountDescription('Manual Discount');
                        }}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  ) : (
                    <div className="voucher-section">
                      <input 
                        list="discount-options"
                        type="text" 
                        placeholder="Voucher/Discount Code" 
                        value={inputValue}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                      />
                      <datalist id="discount-options">
                        {discountsList.map((discount) => (
                          <option key={discount.discountCd} value={discount.discountCd}>
                            {discount.discountDesc}
                          </option>
                        ))}
                        {vouchersList.map((voucher) => (
                          <option key={voucher.voucherCd} value={voucher.voucherCd}>
                            {voucher.voucherDesc}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  )}
                </>
              )}

              <div className="summary">
                <h2>Summary</h2>
                <div className="summary-row">
                  <span>Sub Total:</span>
                  <span>₱{subtotalValue.toFixed(2)}</span>
                </div>
                {orderMode !== 'FD' && (
                  <div className="summary-row">
                    <span>Discount:</span>
                    <span>-₱{(parseFloat(discountAmount) || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row summary-total">
                  <span>Total:</span>
                  <span>₱{totalValue.toFixed(2)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>No orders yet. Place an order to start the transaction</p>
            </div>
          )}
        </div>

        {orderItems && orderItems.length > 0 && (
          <div className="action-buttons">
            <button className="cancel-btn" onClick={handleCancelOrder}>Cancel Order</button>
            {(orderMode === 'FP' || orderMode === 'FD' || orderMode === 'GB') ? (
              <button className="checkout-btn" onClick={handleCompleteOrder}>Complete Order</button>
            ) : (
              <button className="checkout-btn" onClick={handleCompleteCheckout}>Complete Checkout</button>
            )}
          </div>
        )}
      </div>
      
      {/* Modals */}
      <OrderCheckoutModal 
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        orderDetails={orderDetails}
        orderItems={orderItems}
        tableDetails={tableDetails}
        queueDetails={queueDetails}
        discountDetails={discountDetails}
        mainDetails={mainDetails}
      />

      <CustomizationModal
        isOpen={isCustomizationModalOpen}
        onClose={() => setIsCustomizationModalOpen(false)}
        product={customizingProduct}
        selectedSize={customizingSize}
        quantity={customizingQuantity}
        addOnsList={addOnsList}
        notesList={notesList}
        onAddOrder={handleCustomizationAddOrder}
        triggerRef={{ current: customizingTrigger }}
      />

      <OrderDetailsModal
        isOpen={isOrderDetailsModalOpen}
        onClose={() => setIsOrderDetailsModalOpen(false)}
        orderData={selectedOrderDetails}
      />

      <TimeEntryModal
        isOpen={isTimeEntryModalOpen}
        onClose={() => setIsTimeEntryModalOpen(false)}
      />
    </div>
  );
};

export default HomePage;
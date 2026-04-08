import * as Print from 'expo-print';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { NativeModules, Platform } from 'react-native';
import { printer as configuredPrinter } from '../config/env';
import { firestore } from '../../firebase';

const DEFAULT_PRINTER_NAME = 'VOZY P50';
const DEFAULT_PRINTER_MAC = '5A:4A:48:1C:87:20';
let receiptLogoDataUri = '';
let receiptLogoUriFallback = '';
let bluetoothLogoSourceKey = '';
let bluetoothLogoBase64Cache = '';
let lastSuccessfulBluetoothDevice = null;
const branchDescriptionCache = {};

const getBranchDescription = async (branchCodeInput = '') => {
  const branchCode = String(branchCodeInput || '').trim();
  if (!branchCode) return '';

  if (branchDescriptionCache[branchCode]) {
    return branchDescriptionCache[branchCode];
  }

  try {
    const branchQuery = query(
      collection(firestore, 'BRANCH_DETAILS'),
      where('branchCode', '==', branchCode)
    );

    const snapshot = await getDocs(branchQuery);
    if (snapshot.empty) return '';

    const row = snapshot.docs[0]?.data() || {};
    const branchDesc = String(row.branchDesc || row.branchName || '').trim();
    if (!branchDesc) return '';

    branchDescriptionCache[branchCode] = branchDesc;
    return branchDesc;
  } catch (error) {
    console.warn('Failed to fetch branch description:', error?.message || error);
    return '';
  }
};

const normalizeLogoDataUri = (logoInput = '') => {
  if (typeof logoInput !== 'string') return '';
  const trimmed = logoInput.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:image')) {
    return trimmed;
  }

  return `data:image/png;base64,${trimmed}`;
};

const getReceiptLogoSrc = async (logoOverride = '') => {
  const overrideDataUri = normalizeLogoDataUri(logoOverride);
  if (overrideDataUri) {
    receiptLogoDataUri = overrideDataUri;
    return receiptLogoDataUri;
  }

  if (receiptLogoDataUri) return receiptLogoDataUri;
  if (receiptLogoUriFallback) return receiptLogoUriFallback;

  try {
    const logoAsset = Asset.fromModule(require('../../assets/logo_receipt_white.png'));
    if (!logoAsset.localUri) {
      await logoAsset.downloadAsync();
    }

    const logoUri = logoAsset.localUri || logoAsset.uri;
    if (!logoUri) return '';

    receiptLogoUriFallback = logoUri;

    try {
      const base64Logo = await FileSystem.readAsStringAsync(logoUri, {
        encoding: FileSystem.EncodingType.Base64
      });

      receiptLogoDataUri = `data:image/png;base64,${base64Logo}`;
      return receiptLogoDataUri;
    } catch {
      return receiptLogoUriFallback;
    }
  } catch (error) {
    console.warn('Failed to load receipt logo for printing:', error?.message || error);
    return '';
  }
};

export const preloadReceiptAssets = async (branchCode = '') => {
  try {
    await getReceiptLogoSrc();

    const normalizedBranchCode = String(branchCode || '').trim();
    if (normalizedBranchCode && !branchDescriptionCache[normalizedBranchCode]) {
      await getBranchDescription(normalizedBranchCode);
    }
  } catch (error) {
    console.warn('Receipt preload failed:', error?.message || error);
  }
};

const parseDeviceList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  if (value && typeof value === 'object') return [value];
  return [];
};

const normalizeDevice = (device = {}) => ({
  name: String(device.name || device.deviceName || device.device_name || '').trim(),
  address: String(device.address || device.mac || device.macAddress || device.id || '').trim()
});

const normalizeMacAddress = (value = '') => String(value || '').toUpperCase().replace(/[^A-F0-9]/g, '');

const isRealConfiguredValue = (value, fallback) => {
  const normalized = String(value || '').trim();
  return Boolean(normalized && normalized !== fallback);
};

const getCurrentPhilippineDate = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

const formatOrderDateAndTime = (orderDateInput = '', orderTimeInput = '') => {
  const orderDate = String(orderDateInput || '').trim();
  const orderTime = String(orderTimeInput || '').trim();

  let formattedDate = '';
  if (orderDate) {
    const [year, month, day] = orderDate.split('-').map((value) => Number(value));
    const parsedDate = new Date(year, (month || 1) - 1, day || 1);
    if (!Number.isNaN(parsedDate.getTime())) {
      formattedDate = parsedDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  }

  let formattedTime = '';
  if (orderTime) {
    const [hourRaw, minuteRaw] = orderTime.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (!Number.isNaN(hour) && !Number.isNaN(minute)) {
      const meridiem = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      formattedTime = `${hour12}:${String(minute).padStart(2, '0')} ${meridiem}`;
    }
  }

  if (formattedDate && formattedTime) return `${formattedDate} ${formattedTime}`;
  if (formattedDate) return formattedDate;
  if (formattedTime) return formattedTime;
  return '';
};

const buildReceiptText = ({
  branchName,
  customerName,
  orderItems,
  discountDescription,
  totalAmount,
  discountAmount,
  transactionId,
  baristaOnDuty,
  retekessNumber
}) => {
  const lines = [];

  lines.push('Cafe Vanleroe');
  lines.push(branchName || 'Unknown Branch');
  lines.push('------------------------------');
  lines.push(`Customer: ${customerName || 'Guest'}`);
  lines.push('------------------------------');

  orderItems.forEach((item) => {
    const qty = Number(item.itemQuantity || 0);
    const price = Number(item.itemPrice || 0);
    const total = Number(item.itemTotalAmount || 0);
    lines.push(`${item.itemName || 'Unknown Item'}`);
    lines.push(`  ${qty} x ${price.toFixed(2)} = ${total.toFixed(2)}`);
  });

  if (discountDescription) lines.push(`Discount: ${discountDescription}`);

  lines.push('------------------------------');
  lines.push(`Total: ${Number(totalAmount || 0).toFixed(2)}`);
  lines.push(`Discount Amt: ${Number(discountAmount || 0).toFixed(2)}`);
  lines.push(`Txn ID: ${transactionId || ''}`);
  lines.push(`Date: ${getCurrentPhilippineDate()}`);
  lines.push(`Barista: ${(baristaOnDuty && baristaOnDuty.name) || 'Staff'}`);

  if (retekessNumber) {
    lines.push('------------------------------');
    lines.push(`Call Number: ${retekessNumber}`);
  }

  lines.push('------------------------------');
  lines.push('Thank you for your purchase!');
  lines.push('\n\n');

  return lines.join('\r\n');
};

const extractBase64ImageData = (logoSrc = '') => {
  if (typeof logoSrc !== 'string') return '';
  const trimmed = logoSrc.trim();
  if (!trimmed) return '';

  const commaIndex = trimmed.indexOf(',');
  if (trimmed.startsWith('data:image') && commaIndex >= 0) {
    return trimmed.slice(commaIndex + 1);
  }

  const looksLikeBase64 = /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed);
  return looksLikeBase64 ? trimmed : '';
};

const writeBase64ToCacheFile = async (base64Data = '', extension = 'png') => {
  const cacheDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
  if (!cacheDir) return '';

  const fileUri = `${cacheDir}receipt-logo-input.${extension}`;
  await FileSystem.writeAsStringAsync(fileUri, base64Data, {
    encoding: FileSystem.EncodingType.Base64
  });
  return fileUri;
};

const downscaleLogoForBluetooth = async (logoSrc = '') => {
  const sourceKey = String(logoSrc || '').trim();
  if (!sourceKey) return '';

  if (sourceKey === bluetoothLogoSourceKey && bluetoothLogoBase64Cache) {
    return bluetoothLogoBase64Cache;
  }

  const originalBase64 = extractBase64ImageData(sourceKey);
  if (!originalBase64) return '';

  try {
    // Lazy import so this remains resilient even if module setup varies across builds.
    const ImageManipulator = await import('expo-image-manipulator');

    let inputUri = '';
    if (sourceKey.startsWith('data:image')) {
      const ext = sourceKey.includes('image/jpeg') || sourceKey.includes('image/jpg') ? 'jpg' : 'png';
      inputUri = await writeBase64ToCacheFile(originalBase64, ext);
    } else {
      inputUri = await writeBase64ToCacheFile(originalBase64, 'png');
    }

    if (!inputUri) {
      bluetoothLogoSourceKey = sourceKey;
      bluetoothLogoBase64Cache = originalBase64;
      return originalBase64;
    }

    const manipulated = await ImageManipulator.manipulateAsync(
      inputUri,
      [
        {
          resize: {
            width: 320
          }
        }
      ],
      {
        compress: 0.6,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true
      }
    );

    const downscaledBase64 = manipulated?.base64 || originalBase64;
    bluetoothLogoSourceKey = sourceKey;
    bluetoothLogoBase64Cache = downscaledBase64;
    return downscaledBase64;
  } catch (error) {
    console.warn('Bluetooth logo downscale failed, using original image:', error?.message || error);
    bluetoothLogoSourceKey = sourceKey;
    bluetoothLogoBase64Cache = originalBase64;
    return originalBase64;
  }
};

const tryPrintBluetoothLogo = async (BluetoothEscposPrinter, logoSrc = '') => {
  const base64Data = await downscaleLogoForBluetooth(logoSrc);
  if (!base64Data) return false;

  if (typeof BluetoothEscposPrinter?.printPic !== 'function') {
    return false;
  }

  // Thermal printers are typically 58mm/80mm. 384px is a safe default width.
  // The library has multiple method signatures across versions, so we try both.
  try {
    await BluetoothEscposPrinter.printPic(base64Data, {
      width: 384,
      left: 0,
      imageWidth: 384
    });
    if (typeof BluetoothEscposPrinter.printText === 'function') {
      await BluetoothEscposPrinter.printText('\r\n', { encoding: 'GBK', codepage: 0 });
    }
    return true;
  } catch {
    try {
      await BluetoothEscposPrinter.printPic(base64Data, 384, 0);
      if (typeof BluetoothEscposPrinter.printText === 'function') {
        await BluetoothEscposPrinter.printText('\r\n', { encoding: 'GBK', codepage: 0 });
      }
      return true;
    } catch {
      return false;
    }
  }
};

const fetchBluetoothDevices = async (BluetoothManager) => {
  const connected = [];
  const bonded = [];

  if (typeof BluetoothManager.getConnectedDeviceList === 'function') {
    connected.push(...parseDeviceList(await BluetoothManager.getConnectedDeviceList()));
  }

  if (typeof BluetoothManager.getConnectedDevices === 'function') {
    connected.push(...parseDeviceList(await BluetoothManager.getConnectedDevices()));
  }

  if (typeof BluetoothManager.getBondedDevices === 'function') {
    bonded.push(...parseDeviceList(await BluetoothManager.getBondedDevices()));
  } else if (typeof BluetoothManager.enableBluetooth === 'function') {
    bonded.push(...parseDeviceList(await BluetoothManager.enableBluetooth()));
  }

  return {
    connected: connected.map(normalizeDevice).filter((d) => d.address),
    bonded: bonded.map(normalizeDevice).filter((d) => d.address)
  };
};

const pickPrinterDevice = (connectedDevices, bondedDevices) => {
  const configuredName = String(configuredPrinter?.name || '').trim().toLowerCase();
  const configuredMac = normalizeMacAddress(configuredPrinter?.mac || '');
  const defaultName = String(DEFAULT_PRINTER_NAME || '').trim().toLowerCase();
  const defaultMac = normalizeMacAddress(DEFAULT_PRINTER_MAC || '');

  const all = [...connectedDevices, ...bondedDevices];
  if (!all.length) return null;

  const findMatch = (targetMac, targetName) => {
    return all.find((device) => {
      const deviceMac = normalizeMacAddress(device.address);
      const deviceName = String(device.name || '').trim().toLowerCase();
      const byMac = targetMac && deviceMac && deviceMac === targetMac;
      const byName = targetName && deviceName && deviceName === targetName;
      return byMac || byName;
    });
  };

  const defaultMatch = findMatch(defaultMac, defaultName);
  if (defaultMatch) return defaultMatch;

  const configuredMatch = findMatch(configuredMac, configuredName);

  if (configuredMatch) return configuredMatch;
  if (connectedDevices.length) return connectedDevices[0];
  return bondedDevices[0];
};

const printViaBluetoothIfAvailable = async (plainText, logoSrc = '') => {
  if (Platform.OS !== 'android') {
    return { success: false, reason: 'Bluetooth auto-print is only available on Android native builds' };
  }

  if (!NativeModules?.BluetoothManager || !NativeModules?.BluetoothEscposPrinter) {
    return {
      success: false,
      reason: 'Bluetooth native module not linked (use Android dev build/apk, not Expo Go)'
    };
  }

  try {
    // eslint-disable-next-line global-require
    const bluetoothLib = require('react-native-bluetooth-escpos-printer');
    const BluetoothManager = bluetoothLib?.BluetoothManager;
    const BluetoothEscposPrinter = bluetoothLib?.BluetoothEscposPrinter;

    if (!BluetoothManager || !BluetoothEscposPrinter) {
      return { success: false, reason: 'Bluetooth printer module is unavailable' };
    }

    if (lastSuccessfulBluetoothDevice?.address) {
      try {
        if (typeof BluetoothManager.connect === 'function') {
          await BluetoothManager.connect(lastSuccessfulBluetoothDevice.address);
        }
        if (typeof BluetoothEscposPrinter.printerInit === 'function') {
          await BluetoothEscposPrinter.printerInit();
        }
        await tryPrintBluetoothLogo(BluetoothEscposPrinter, logoSrc);
        if (typeof BluetoothEscposPrinter.printText === 'function') {
          await BluetoothEscposPrinter.printText(plainText, {
            encoding: 'GBK',
            codepage: 0,
            widthtimes: 1,
            heigthtimes: 1,
            fonttype: 1
          });
          return { success: true, device: lastSuccessfulBluetoothDevice };
        }
      } catch {
        lastSuccessfulBluetoothDevice = null;
      }
    }

    const { connected, bonded } = await fetchBluetoothDevices(BluetoothManager);
    const targetDevice = pickPrinterDevice(connected, bonded);

    if (!targetDevice?.address) {
      return { success: false, reason: 'No connected or bonded Bluetooth printer found' };
    }

    const isAlreadyConnected = connected.some((d) => d.address === targetDevice.address);
    if (!isAlreadyConnected && typeof BluetoothManager.connect === 'function') {
      await BluetoothManager.connect(targetDevice.address);
    }

    if (typeof BluetoothEscposPrinter.printerInit === 'function') {
      await BluetoothEscposPrinter.printerInit();
    }

    // If supported, print logo image first for Bluetooth receipt flow.
    // (HTML/PDF path is not used when Bluetooth auto-print succeeds.)
    await tryPrintBluetoothLogo(BluetoothEscposPrinter, logoSrc);

    if (typeof BluetoothEscposPrinter.printText !== 'function') {
      return { success: false, reason: 'Bluetooth printer text API is unavailable' };
    }

    await BluetoothEscposPrinter.printText(plainText, {
      encoding: 'GBK',
      codepage: 0,
      widthtimes: 1,
      heigthtimes: 1,
      fonttype: 1
    });

    lastSuccessfulBluetoothDevice = targetDevice;

    return { success: true, device: targetDevice };
  } catch (error) {
    return { success: false, reason: error?.message || 'Bluetooth print failed' };
  }
};

/**
 * Print receipt function
 * @param {Object} receiptData - The receipt data object
 * @param {string} receiptData.branchName - Branch name
 * @param {string} receiptData.branchAddress - Branch address
 * @param {string} receiptData.customerName - Customer name
 * @param {Array} receiptData.orderItems - Array of order items
 * @param {string} receiptData.discountDescription - Discount description
 * @param {number} receiptData.totalAmount - Total amount
 * @param {Array} receiptData.paymentMethods - Array of payment methods
 * @param {number} receiptData.orderChange - Order change
 * @param {number} receiptData.discountAmount - Discount amount
 * @param {string} receiptData.transactionId - Transaction ID
 * @param {Object} receiptData.baristaOnDuty - Barista on duty object {name: string}
 * @param {string} receiptData.retekessNumber - Retekess number
 */
export const printReceipt = async (receiptData) => {
  try {
    const payload = receiptData || {};
    const mainDetails = payload.mainDetails || {};
    const discountDetails = payload.discountDetails || {};
    const tableDetails = payload.tableDetails || {};
    const orderDetails = payload.orderDetails || {};
    const payloadBranchCode = String(payload.branchCode || mainDetails.branchCode || '').trim();

    const {
      branchName: payloadBranchName = '',
      branchAddress = '',
      customerName = mainDetails.customerName || 'Guest',
      orderItems = Array.isArray(payload.orderItems) ? payload.orderItems : [],
      discountDescription = discountDetails.discountDescription || discountDetails.discountDesc || '',
      totalAmount = Number(mainDetails.totalAmount || 0),
      paymentMethods = Array.isArray(payload.paymentMethods) ? payload.paymentMethods : [],
      orderChange = Number(orderDetails.orderChange || 0),
      orderPaymentTotalAmount = Number(
        orderDetails.orderPaymentTotalAmount ||
        (Array.isArray(payload.paymentMethods)
          ? payload.paymentMethods.reduce((sum, payment) => sum + Number(payment?.paymentAmount || 0), 0)
          : 0)
      ),
      orderDate = orderDetails.orderDate || '',
      orderTime = orderDetails.orderTime || '',
      discountAmount = Number(discountDetails.discountAmount || 0),
      transactionId = mainDetails.transactionId || '',
      baristaOnDuty = { name: orderDetails.orderTakenBy || 'Staff' },
      retekessNumber = tableDetails.retekessNumber || ''
    } = payload;

    const branchDesc = payloadBranchName || !payloadBranchCode
      ? ''
      : await getBranchDescription(payloadBranchCode);

    const branchName = branchDesc || payloadBranchName || payloadBranchCode || 'Unknown Branch';
    const formattedTransactionDate = formatOrderDateAndTime(orderDate, orderTime) || new Date().toLocaleDateString();

    const logoOverride =
      payload.receiptLogoBase64 ||
      payload.logoBase64 ||
      mainDetails.receiptLogoBase64 ||
      '';

    const plainTextReceipt = buildReceiptText({
      branchName,
      customerName,
      orderItems,
      discountDescription,
      totalAmount,
      discountAmount,
      transactionId,
      baristaOnDuty,
      retekessNumber
    });
    const receiptLogoSrc = await getReceiptLogoSrc(logoOverride);

    const bluetoothResult = await printViaBluetoothIfAvailable(plainTextReceipt, receiptLogoSrc);
    if (bluetoothResult.success) {
      console.log('Receipt printed successfully via Bluetooth:', bluetoothResult.device?.name || bluetoothResult.device?.address);
      return {
        success: true,
        method: 'bluetooth',
        device: bluetoothResult.device
      };
    }

    // Generate order items HTML
    const orderItemsHTML = orderItems.map(
      (item) => `
        <tr>
          <td>${item.itemName || 'Unknown Item'}</td>
          <td>${item.itemQuantity || 0}</td>
          <td>₱${(parseFloat(item.itemPrice) || 0).toFixed(2)}</td>
          <td>₱${(item.itemTotalAmount || 0).toFixed(2)}</td>
        </tr>
      `
    ).join('');

    // Generate payment methods HTML
    const paymentMethodsHTML = paymentMethods.map(
      (method) => `
        <tr>
          <td>Payment Method</td>
          <td>${method.modeOfPayment || 'Unknown Method'}</td>
          <td>₱${(method.paymentAmount || 0).toFixed(2)}</td>
        </tr>
      `
    ).join('');

    // Calculate total quantity
    const totalQuantity = orderItems.reduce((total, item) => total + (item.itemQuantity || 0), 0);

    // Generate HTML content
    const htmlContent = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              width: 80mm;
              font-size: 12px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: 80mm auto;
              margin: 3mm 0 0 0;
            }
            .table-spacing {
              border-spacing: 30px;
            }
            .receipt-container {
              width: 100%;
              max-width: 100%;
              margin: 0;
              padding: 2.5mm 0.5mm 0.5mm 0.5mm;
              box-sizing: border-box;
              border: none;
            }
            .receipt-logo {
              text-align: center;
              margin-bottom: 10px;
            }
            .receipt-logo img {
              max-width: 42mm;
              height: auto;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 1px;
              border-bottom: 1px solid #000;
              padding-bottom: 1px;
            }
            .receipt-body {
              margin: 8px 0;
            }
            .receipt-body .section {
              margin-bottom: 10px;
            }
            .receipt-footer {
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 10px;
              font-size: 12px;
            }
            .call-number {
              font-size: 20px;
              font-weight: bold;
            }
            table {
              width: 100%;
              font-size: 11px;
              border-collapse: collapse;
              table-layout: fixed;
            }
            table th, table td {
              text-align: left;
              padding: 2px;
              word-break: break-word;
            }
            hr {
              border: none;
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-logo">
              ${receiptLogoSrc ? `<img src="${receiptLogoSrc}" alt="Company Logo" />` : ''}
            </div>
            <div class="receipt-header">
              <h3>Cafe Vanleroe</h3>
              <p>${branchName}</p>
              <p>${branchAddress}</p>
            </div>
            <div class="receipt-body">
              <div class="section">
                <strong>Customer Name:</strong> ${customerName}
              </div>
              <hr/> 
              <table style="width:100%">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHTML}
                  ${discountDescription ? `
                  <tr>
                    <td colspan="4">${discountDescription}</td>
                  </tr>
                  ` : ''}
                </tbody>
              </table>
              <hr />
              <table style="width:100%">
                <tr>
                  <td>Total</td>
                  <td>
                    ${totalQuantity} 
                    ${totalQuantity === 1 ? 'item' : 'items'}
                  </td>
                  <td colspan="2">₱${totalAmount.toFixed(2)}</td>
                </tr>
                  <tr>
                  <td>Discount</td>
                  <td> </td>
                  <td colspan="3">₱${(discountAmount || 0).toFixed(2)}</td>
                </tr>
                ${paymentMethodsHTML}
                <tr>
                  <td>Total Amount Paid</td>
                  <td> </td>
                  <td colspan="3">₱${(orderPaymentTotalAmount || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>CHANGE</td>
                  <td> </td>
                  <td colspan="3">₱${(orderChange || 0).toFixed(2)}</td>
                </tr>
              </table>
              <hr />
              <div class="section">
                <strong>Transaction Id:</strong> ${transactionId}<br />
                <strong>Transaction Date:</strong> ${formattedTransactionDate}<br />
                <strong>Barista on duty:</strong> ${baristaOnDuty.name} <br />
              </div>
            </div>
            ${retekessNumber ? `
            <div class="receipt-footer">
              Pick-up your order when you're called<br />
              <p class="call-number">
              Number: ${retekessNumber}
              </p>
            </div>
            ` : ''}
            <div class="receipt-footer">
              Visit our social media<br />
              Facebook/Instagram/Tiktok: Cafe Vanleroe<br />
            </div>
            <div class="receipt-footer">
              Thank you for your purchase!<br />
              This is not an official receipt.<br />
              Please request the OR to our barista on duty.
            </div>
          </div>
        </body>
      </html>
    `;

    await Print.printAsync({ html: htmlContent });

    console.log('Receipt printed successfully via direct flow', bluetoothResult.reason ? `(${bluetoothResult.reason})` : '');
    return { success: true, method: 'direct' };
  } catch (error) {
    console.error('Error printing receipt:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Print using system print dialog
 * @param {Object} receiptData - Same as printReceipt function
 */
export const printReceiptDirect = async (receiptData) => {
  try {
    const orderDetails = receiptData?.orderDetails || {};
    const branchCode = String(
      receiptData?.branchCode ||
      receiptData?.mainDetails?.branchCode ||
      ''
    ).trim();

    const logoOverride =
      receiptData?.receiptLogoBase64 ||
      receiptData?.logoBase64 ||
      receiptData?.mainDetails?.receiptLogoBase64 ||
      '';

    const receiptLogoSrc = await getReceiptLogoSrc(logoOverride);

    const {
      branchName: payloadBranchName = '',
      branchAddress = '',
      customerName = 'Guest',
      orderItems = [],
      discountDescription = '',
      totalAmount = 0,
      paymentMethods = [],
      orderChange = Number(orderDetails.orderChange || 0),
      orderPaymentTotalAmount = Number(orderDetails.orderPaymentTotalAmount || 0),
      orderDate = orderDetails.orderDate || '',
      orderTime = orderDetails.orderTime || '',
      discountAmount = 0,
      transactionId = '',
      baristaOnDuty = { name: 'Staff' },
      retekessNumber = ''
    } = receiptData;

    const branchDesc = payloadBranchName || !branchCode
      ? ''
      : await getBranchDescription(branchCode);

    const branchName = branchDesc || payloadBranchName || branchCode || 'Unknown Branch';
    const formattedTransactionDate = formatOrderDateAndTime(orderDate, orderTime) || new Date().toLocaleDateString();

    const orderItemsHTML = orderItems.map(
      (item) => `
        <tr>
          <td>${item.itemName || 'Unknown Item'}</td>
          <td>${item.itemQuantity || 0}</td>
          <td>₱${(parseFloat(item.itemPrice) || 0).toFixed(2)}</td>
          <td>₱${(item.itemTotalAmount || 0).toFixed(2)}</td>
        </tr>
      `
    ).join('');

    const paymentMethodsHTML = paymentMethods.map(
      (method) => `
        <tr>
          <td>Payment Method</td>
          <td>${method.modeOfPayment || 'Unknown Method'}</td>
          <td>₱${(method.paymentAmount || 0).toFixed(2)}</td>
        </tr>
      `
    ).join('');

    const totalQuantity = orderItems.reduce((total, item) => total + (item.itemQuantity || 0), 0);

    const htmlContent = `
      <html>
        <head>
          <title>Receipt</title>
          <style>
            body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              width: 80mm;
              font-size: 12px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @page {
              size: 80mm auto;
              margin: 3mm 0 0 0;
            }
            .receipt-container {
              width: 100%;
              max-width: 100%;
              margin: 0;
              padding: 2.5mm 0.5mm 0.5mm 0.5mm;
              box-sizing: border-box;
              border: none;
            }
            .receipt-logo {
              text-align: center;
              margin-bottom: 10px;
            }
            .receipt-logo img {
              max-width: 42mm;
              height: auto;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 1px;
              border-bottom: 1px solid #000;
              padding-bottom: 1px;
            }
            .receipt-body {
              margin: 8px 0;
            }
            .receipt-body .section {
              margin-bottom: 10px;
            }
            .receipt-footer {
              text-align: center;
              border-top: 1px solid #000;
              padding-top: 10px;
              font-size: 12px;
            }
            .call-number {
              font-size: 20px;
              font-weight: bold;
            }
            table {
              width: 100%;
              font-size: 11px;
              border-collapse: collapse;
              table-layout: fixed;
            }
            table th, table td {
              text-align: left;
              padding: 2px;
              word-break: break-word;
            }
            hr {
              border: none;
              border-top: 1px dashed #000;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-logo">
              ${receiptLogoSrc ? `<img src="${receiptLogoSrc}" alt="Company Logo" />` : ''}
            </div>
            <div class="receipt-header">
              <h3>Cafe Vanleroe</h3>
              <p>${branchName}</p>
              <p>${branchAddress}</p>
            </div>
            <div class="receipt-body">
              <div class="section">
                <strong>Customer Name:</strong> ${customerName}
              </div>
              <hr/> 
              <table style="width:100%">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHTML}
                  ${discountDescription ? `
                  <tr>
                    <td colspan="4">${discountDescription}</td>
                  </tr>
                  ` : ''}
                </tbody>
              </table>
              <hr />
              <table style="width:100%">
                <tr>
                  <td>Total</td>
                  <td>
                    ${totalQuantity} 
                    ${totalQuantity === 1 ? 'item' : 'items'}
                  </td>
                  <td colspan="2">₱${totalAmount.toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Discount</td>
                  <td> </td>
                  <td colspan="3">₱${(discountAmount || 0).toFixed(2)}</td>
                </tr>
                ${paymentMethodsHTML}
                <tr>
                  <td>Total Amount Paid</td>
                  <td> </td>
                  <td colspan="3">₱${(orderPaymentTotalAmount || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>CHANGE</td>
                  <td> </td>
                  <td colspan="3">₱${(orderChange || 0).toFixed(2)}</td>
                </tr>
              </table>
              <hr />
              <div class="section">
                <strong>Transaction Id:</strong> ${transactionId}<br />
                <strong>Transaction Date:</strong> ${formattedTransactionDate}<br />
                <strong>Barista on duty:</strong> ${baristaOnDuty.name} <br />
              </div>
            </div>
            ${retekessNumber ? `
            <div class="receipt-footer">
              Pick-up your order when you're called<br />
              <p class="call-number">
              Number: ${retekessNumber}
              </p>
            </div>
            ` : ''}
            <div class="receipt-footer">
              Visit our social media<br />
              Facebook/Instagram/Tiktok: Cafe Vanleroe<br />
            </div>
            <div class="receipt-footer">
              Thank you for your purchase!<br />
              This is not an official receipt.<br />
              Please request the OR to our barista on duty.
            </div>
          </div>
        </body>
      </html>
    `;

    // Use system print dialog
    await Print.printAsync({ html: htmlContent });

    console.log('Receipt printed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error printing receipt:', error);
    return { success: false, error: error.message };
  }
};

export default printReceipt;
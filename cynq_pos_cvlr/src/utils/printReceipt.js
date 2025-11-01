import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';

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
    const {
      branchName = 'Unknown Branch',
      branchAddress = '',
      customerName = 'Guest',
      orderItems = [],
      discountDescription = '',
      totalAmount = 0,
      paymentMethods = [],
      orderChange = 0,
      discountAmount = 0,
      transactionId = '',
      baristaOnDuty = { name: 'Staff' },
      retekessNumber = ''
    } = receiptData;

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
              font-size: 12px;
            }
            .table-spacing {
              border-spacing: 30px;
            }
            .receipt-container {
              max-width: 300px;
              margin: 0 auto;
              padding: 20px;
              border: 1px dashed #000;
            }
            .receipt-logo {
              text-align: center;
              margin-bottom: 10px;
            }
            .receipt-logo img {
              max-width: 100px;
              height: auto;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 1px;
              border-bottom: 1px solid #000;
              padding-bottom: 1px;
            }
            .receipt-body {
              margin: 20px 0;
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
              font-size: 12px;
              border-collapse: collapse;
            }
            table th, table td {
              text-align: left;
              padding: 4px;
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
              <img src="/logo_receipt_white.png" alt="Company Logo" />
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
                ${paymentMethodsHTML}
                <tr>
                  <td>CHANGE</td>
                  <td colspan="3">₱${orderChange.toFixed(2)}</td>
                </tr>
              </table>
              <hr />
              <div class="section">
                <strong>Total Amount:</strong> ₱${(totalAmount || 0).toFixed(2)}<br />
                <strong>Total Discount:</strong> ₱${(discountAmount || 0).toFixed(2)}<br />
                <strong>Transaction Id:</strong> ${transactionId}<br />
                <strong>Transaction Date:</strong> ${new Date().toLocaleDateString()}<br />
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

    // Print using expo-print
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    // For Bluetooth printing, you can use the generated PDF with a Bluetooth printer library
    // Option 1: Share the receipt (allows user to select printer)
    await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

    // Option 2: For direct Bluetooth printing, integrate with a Bluetooth printer library
    // Example: react-native-thermal-receipt-printer or similar
    // await BluetoothPrinter.print(uri);

    console.log('Receipt printed successfully');
    return { success: true, uri };
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
    const {
      branchName = 'Unknown Branch',
      branchAddress = '',
      customerName = 'Guest',
      orderItems = [],
      discountDescription = '',
      totalAmount = 0,
      paymentMethods = [],
      orderChange = 0,
      discountAmount = 0,
      transactionId = '',
      baristaOnDuty = { name: 'Staff' },
      retekessNumber = ''
    } = receiptData;

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
              font-size: 12px;
            }
            .receipt-container {
              max-width: 300px;
              margin: 0 auto;
              padding: 20px;
              border: 1px dashed #000;
            }
            .receipt-logo {
              text-align: center;
              margin-bottom: 10px;
            }
            .receipt-logo img {
              max-width: 100px;
              height: auto;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 1px;
              border-bottom: 1px solid #000;
              padding-bottom: 1px;
            }
            .receipt-body {
              margin: 20px 0;
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
              font-size: 12px;
              border-collapse: collapse;
            }
            table th, table td {
              text-align: left;
              padding: 4px;
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
              <img src="/logo_receipt_white.png" alt="Company Logo" />
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
                ${paymentMethodsHTML}
                <tr>
                  <td>CHANGE</td>
                  <td colspan="3">₱${orderChange.toFixed(2)}</td>
                </tr>
              </table>
              <hr />
              <div class="section">
                <strong>Total Amount:</strong> ₱${(totalAmount || 0).toFixed(2)}<br />
                <strong>Total Discount:</strong> ₱${(discountAmount || 0).toFixed(2)}<br />
                <strong>Transaction Id:</strong> ${transactionId}<br />
                <strong>Transaction Date:</strong> ${new Date().toLocaleDateString()}<br />
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
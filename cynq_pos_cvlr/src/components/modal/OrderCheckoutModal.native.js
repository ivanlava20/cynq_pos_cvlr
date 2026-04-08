import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const PAYMENT_METHODS = [
  { paymentMethodCode: 'CASH', paymentMethodDesc: 'Cash' },
  { paymentMethodCode: 'MAYA', paymentMethodDesc: 'Maya' },
  { paymentMethodCode: 'GCAS', paymentMethodDesc: 'GCash' },
  { paymentMethodCode: 'CARD', paymentMethodDesc: 'Card' },
  { paymentMethodCode: 'GTYM', paymentMethodDesc: 'GoTyme' }
];

const OrderCheckoutModal = ({ isOpen, onClose, payload, onConfirm, docked = false, isSubmitting = false }) => {
  const orderTotal = useMemo(() => Number(payload?.mainDetails?.totalAmount || 0), [payload]);

  const [paymentMethods, setPaymentMethods] = useState([]);
  const [modeOfPayment, setModeOfPayment] = useState('CASH');
  const [inputAmount, setInputAmount] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setModeOfPayment('CASH');
    setInputAmount(orderTotal > 0 ? orderTotal.toFixed(2) : '');
    setReferenceNumber('');
    setPaymentMethods([]);
  }, [isOpen, orderTotal]);

  const totalPaid = paymentMethods.reduce((sum, payment) => sum + Number(payment.paymentAmount || 0), 0);
  const rawChange = totalPaid - orderTotal;
  const change = rawChange >= 0 ? Math.floor(rawChange) : rawChange;

  const handleNumberClick = (num) => {
    if (num === 10 || num === 100 || num === 1000) {
      const currentValue = Number(inputAmount || 0);
      setInputAmount((currentValue + num).toString());
      return;
    }

    setInputAmount((prev) => `${prev}${num}`);
  };

  const handleClear = () => setInputAmount('');
  const handleBackspace = () => setInputAmount((prev) => prev.slice(0, -1));

  const handleAddPayment = () => {
    const amount = Number(inputAmount || 0);
    if (!amount || amount <= 0) return;
    if (modeOfPayment !== 'CASH' && !referenceNumber.trim()) return;

    const existing = paymentMethods.find((p) => p.modeOfPayment === modeOfPayment);
    if (existing) return;

    const nextId = paymentMethods.length ? Math.max(...paymentMethods.map((p) => p.id)) + 1 : 1;

    const newPayment = {
      id: nextId,
      modeOfPayment,
      paymentAmount: amount,
      referenceNumber: modeOfPayment === 'CASH' ? '' : referenceNumber.trim()
    };

    setPaymentMethods((prev) => [...prev, newPayment]);
    setReferenceNumber('');
    setInputAmount('');
  };

  const handleRemovePayment = (id) => {
    setPaymentMethods((prev) => prev.filter((payment) => payment.id !== id));
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;

    if (!paymentMethods.length) {
      const fallbackPayments = [
        {
          id: 1,
          modeOfPayment: 'CASH',
          paymentAmount: orderTotal,
          referenceNumber: ''
        }
      ];

      await onConfirm?.([
        ...fallbackPayments
      ], true, {
        orderChange: 0,
        orderPaymentTotalAmount: orderTotal
      });
      return;
    }

    await onConfirm?.(paymentMethods, true, {
      orderChange: change,
      orderPaymentTotalAmount: totalPaid
    });
  };

  const content = (
    <View style={[styles.card, docked && styles.dockedCard]}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} disabled={isSubmitting}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment</Text>
      </View>

      <ScrollView contentContainerStyle={styles.contentWrap}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>Total</Text>
            <Text style={styles.summaryAmount}>₱{orderTotal.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment Methods</Text>
          {paymentMethods.length ? (
            <>
              {paymentMethods.map((payment) => {
                const methodDesc = PAYMENT_METHODS.find((m) => m.paymentMethodCode === payment.modeOfPayment)?.paymentMethodDesc || payment.modeOfPayment;
                return (
                  <View key={payment.id} style={styles.summaryRow}>
                    <Text style={styles.summaryText}>{methodDesc}</Text>
                    <View style={styles.inlineRow}>
                      <Text style={styles.negativeAmount}>-₱{Number(payment.paymentAmount || 0).toFixed(2)}</Text>
                      <TouchableOpacity onPress={() => handleRemovePayment(payment.id)}>
                        <Text style={styles.removeText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>{change >= 0 ? 'Change' : 'Remaining'}</Text>
                <Text style={change >= 0 ? styles.positiveAmount : styles.negativeAmount}>₱{Math.abs(change).toFixed(2)}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>No payments added yet</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment Method</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodRow}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.paymentMethodCode}
                style={[styles.methodChip, modeOfPayment === method.paymentMethodCode && styles.methodChipActive]}
                onPress={() => setModeOfPayment(method.paymentMethodCode)}
              >
                <Text style={[styles.methodText, modeOfPayment === method.paymentMethodCode && styles.methodTextActive]}>{method.paymentMethodDesc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {modeOfPayment !== 'CASH' ? (
            <TextInput
              style={styles.refField}
              placeholder="Reference Number"
              value={referenceNumber}
              onChangeText={setReferenceNumber}
            />
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Input Amount</Text>
          <View style={styles.amountDisplayRow}>
            <Text style={styles.amountLabel}>₱</Text>
            <Text style={styles.amountValue}>{inputAmount || '0'}</Text>
          </View>
          <View style={styles.keypadGrid}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity key={num} style={styles.keypadBtn} onPress={() => handleNumberClick(num)}>
                <Text style={styles.keypadBtnText}>{num}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.keypadBtn} onPress={handleClear}>
              <Text style={styles.keypadBtnText}>C</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keypadBtn} onPress={() => handleNumberClick(0)}>
              <Text style={styles.keypadBtnText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.keypadBtn} onPress={handleBackspace}>
              <Text style={styles.keypadBtnText}>⌫</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickAmountRow}>
            {[10, 100, 1000].map((num) => (
              <TouchableOpacity key={num} style={styles.quickAmountBtn} onPress={() => handleNumberClick(num)}>
                <Text style={styles.quickAmountText}>+{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.applyBtn} onPress={handleAddPayment}>
            <Text style={styles.btnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[styles.confirmBtn, isSubmitting && styles.confirmBtnDisabled]}
        onPress={handleConfirm}
        disabled={isSubmitting}
      >
        <Text style={styles.btnText}>{isSubmitting ? 'Processing...' : 'Complete and Print Receipt'}</Text>
      </TouchableOpacity>
    </View>
  );

  if (docked) {
    if (!isOpen) return null;
    return <View style={styles.dockedOverlay}>{content}</View>;
  }

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>{content}</View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  dockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fffbf5',
    zIndex: 30,
    borderRadius: 16,
    overflow: 'hidden'
  },
  card: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fffdf8',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f59e0b33'
  },
  dockedCard: {
    borderRadius: 0,
    borderWidth: 0,
    borderColor: 'transparent'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111'
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111'
  },
  contentWrap: { paddingBottom: 12 },
  section: {
    borderWidth: 1,
    borderColor: '#f59e0b33',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 10,
    marginBottom: 10
  },
  sectionLabel: {
    fontWeight: '800',
    color: '#111111',
    marginBottom: 8
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  summaryText: { color: '#111111' },
  summaryAmount: { color: '#111111', fontWeight: '800' },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyText: { color: '#6b7280' },
  positiveAmount: { color: '#16a34a', fontWeight: '800' },
  negativeAmount: { color: '#dc2626', fontWeight: '700' },
  methodRow: {
    marginBottom: 2
  },
  methodChip: {
    borderWidth: 1,
    borderColor: '#11111133',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    backgroundColor: '#ffffff'
  },
  methodChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b'
  },
  methodText: {
    color: '#111111',
    fontWeight: '600'
  },
  methodTextActive: {
    color: '#ffffff'
  },
  refField: {
    borderWidth: 1,
    borderColor: '#11111133',
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#fffdf9'
  },
  amountDisplayRow: {
    borderWidth: 1,
    borderColor: '#11111133',
    borderRadius: 11,
    backgroundColor: '#fffdf9',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  amountLabel: {
    color: '#111111',
    fontWeight: '800',
    marginRight: 6
  },
  amountValue: {
    color: '#111111',
    fontWeight: '800',
    fontSize: 16
  },
  keypadGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  keypadBtn: {
    width: '31%',
    borderRadius: 11,
    paddingVertical: 12,
    backgroundColor: '#fffdf9',
    borderWidth: 1,
    borderColor: '#11111122',
    alignItems: 'center'
  },
  keypadBtnText: {
    color: '#111111',
    fontWeight: '800'
  },
  quickAmountRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8
  },
  quickAmountBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#111111'
  },
  quickAmountText: {
    color: '#ffffff',
    fontWeight: '700'
  },
  applyBtn: {
    marginTop: 6,
    borderRadius: 11,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#111111'
  },
  removeText: { color: '#dc2626', fontWeight: '700', fontSize: 18 },
  confirmBtn: {
    marginTop: 2,
    borderRadius: 11,
    paddingVertical: 11,
    backgroundColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#e78f00',
    alignItems: 'center'
  },
  confirmBtnDisabled: {
    backgroundColor: '#fbbf24',
    borderColor: '#fbbf24',
    opacity: 0.7
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});

export default OrderCheckoutModal;

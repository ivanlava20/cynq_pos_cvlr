import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchOrderDetails } from '../../processes/fetchOrderDetails';

const OrderDetailsModal = ({ isOpen, onClose, orderData, onDone, onVoid }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fullOrderData, setFullOrderData] = useState(null);

  useEffect(() => {
    if (!isOpen || !orderData) return;

    let cancelled = false;

    const loadDetails = async () => {
      setLoading(true);
      setError('');

      const result = await fetchOrderDetails(orderData.orderNo, orderData.orderDate, orderData.branchCode);
      if (cancelled) return;

      if (!result.success) {
        setFullOrderData(null);
        setError(result.message || 'Failed to load order details');
      } else {
        setFullOrderData(result.data || null);
      }

      setLoading(false);
    };

    loadDetails();

    return () => {
      cancelled = true;
    };
  }, [isOpen, orderData]);

  const orderStatus = useMemo(() => fullOrderData?.queueDetails?.orderStatus || orderData?.orderStatus || '', [fullOrderData, orderData]);
  const showActions = orderStatus === 'MAKE';

  const handleDonePress = async () => {
    if (!onDone || !orderData?.id) return;
    const success = await onDone(orderData.id);
    if (success) onClose?.();
  };

  const handleVoidPress = async () => {
    if (!onVoid || !orderData?.id) return;
    const success = await onVoid(orderData.id);
    if (success) onClose?.();
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Order Details</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerWrap}>
              <ActivityIndicator size="large" color="#f59e0b" />
              <Text style={styles.infoText}>Loading order items...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerWrap}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLine}>Order No: {orderData?.orderNo || '-'}</Text>
                <Text style={styles.summaryLine}>Customer: {fullOrderData?.mainDetails?.customerName || '-'}</Text>
                <Text style={styles.summaryLine}>Mode: {fullOrderData?.orderMode || '-'}</Text>
                <Text style={styles.summaryLine}>Status: {orderStatus || '-'}</Text>
              </View>

              <ScrollView style={styles.itemsList} contentContainerStyle={{ paddingBottom: 8 }}>
                {(fullOrderData?.orderItems || []).map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <Text style={styles.itemTitle}>{item.itemName}</Text>
                    <Text style={styles.itemMeta}>Size: {item.itemSize || '-'}</Text>
                    <Text style={styles.itemMeta}>Qty: {item.itemQuantity || 0}</Text>
                    <Text style={styles.itemMeta}>Price: ₱{Number(item.itemTotalAmount || 0).toFixed(2)}</Text>
                    <Text style={styles.itemMeta}>Add Ons: {item.addOns || 'None'}</Text>
                    <Text style={styles.itemMeta}>Notes: {item.itemNotes || 'NA'}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.backBtn} onPress={onClose}>
                  <Text style={styles.btnText}>Back</Text>
                </TouchableOpacity>
                {showActions ? (
                  <>
                    <TouchableOpacity style={styles.doneBtn} onPress={handleDonePress}>
                      <Text style={styles.btnText}>Done</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.voidBtn} onPress={handleVoidPress}>
                      <Text style={styles.btnText}>Void</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            </>
          )}
        </View>
      </View>
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
  card: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '84%',
    backgroundColor: '#fffdf8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f59e0b33',
    padding: 14
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111111'
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center'
  },
  closeBtnText: {
    color: '#ffffff',
    fontWeight: '800'
  },
  centerWrap: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoText: {
    marginTop: 8,
    color: '#4b5563'
  },
  errorText: {
    color: '#dc2626',
    fontWeight: '700',
    textAlign: 'center'
  },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#f59e0b33',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 10,
    marginBottom: 10
  },
  summaryLine: {
    color: '#111111',
    marginBottom: 4,
    fontWeight: '600'
  },
  itemsList: {
    flexGrow: 0,
    maxHeight: 380
  },
  itemCard: {
    borderWidth: 1,
    borderColor: '#1111111f',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#ffffff'
  },
  itemTitle: {
    fontWeight: '800',
    color: '#111111',
    marginBottom: 4
  },
  itemMeta: {
    color: '#374151',
    marginTop: 2
  },
  footerRow: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8
  },
  backBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    backgroundColor: '#111111',
    alignItems: 'center'
  },
  doneBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    backgroundColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#e78f00',
    alignItems: 'center'
  },
  voidBtn: {
    flex: 1,
    borderRadius: 11,
    paddingVertical: 11,
    backgroundColor: '#111111',
    alignItems: 'center'
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});

export default OrderDetailsModal;

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { fetchChecklistItems } from '../../processes/fetchChecklistItems';

const DisplayCheckListDetailsModal = ({ isOpen, onClose, checklistitemCategory }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [checklistType, setChecklistType] = useState('checkBox');
  const [checklistItems, setChecklistItems] = useState([]);

  useEffect(() => {
    if (!isOpen || !checklistitemCategory) {
      if (!isOpen) {
        setChecklistItems([]);
        setChecklistType('checkBox');
        setErrorMessage('');
      }
      return;
    }

    let cancelled = false;

    const loadChecklistItems = async () => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const result = await fetchChecklistItems(checklistitemCategory);
        if (cancelled) return;

        setChecklistType(String(result?.checklistType || 'checkBox'));
        setChecklistItems(Array.isArray(result?.checklistItems) ? result.checklistItems : []);
      } catch (error) {
        if (cancelled) return;
        setChecklistItems([]);
        setErrorMessage(error?.message || 'Failed to load checklist items');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadChecklistItems();

    return () => {
      cancelled = true;
    };
  }, [isOpen, checklistitemCategory]);

  const updateChecklistDone = (index, value) => {
    setChecklistItems((prev) => prev.map((item, itemIndex) => (
      itemIndex === index
        ? { ...item, checklistDone: value ? 'YES' : 'NO' }
        : item
    )));
  };

  const renderCheckBoxRows = () => {
    return checklistItems.map((item, index) => {
      const isGoodCondition = String(item.checklistDone || '').toUpperCase() === 'YES';
      const itemName = item.checklistItemDescription || item.checklistItem || '-';

      return (
        <View key={`${item.checklistItemId || itemName}-${index}`} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.itemCol]} numberOfLines={2}>{itemName}</Text>
          <TouchableOpacity
            style={[styles.statusInputButton, styles.statusCol]}
            onPress={() => updateChecklistDone(index, true)}
            activeOpacity={0.75}
          >
            <Text style={styles.statusInputText}>{isGoodCondition ? '◉' : '◯'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusInputButton, styles.statusCol]}
            onPress={() => updateChecklistDone(index, false)}
            activeOpacity={0.75}
          >
            <Text style={styles.statusInputText}>{isGoodCondition ? '◯' : '◉'}</Text>
          </TouchableOpacity>
        </View>
      );
    });
  };

  const renderRadioRows = () => {
    return checklistItems.map((item, index) => {
      const isChecked = String(item.checklistDone || '').toUpperCase() === 'YES';
      const itemName = item.checklistItemDescription || item.checklistItem || '-';

      return (
        <View key={`${item.checklistItemId || itemName}-${index}`} style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.itemCol]} numberOfLines={2}>{itemName}</Text>
          <TouchableOpacity
            style={[styles.statusInputButton, styles.statusCol]}
            onPress={() => updateChecklistDone(index, !isChecked)}
            activeOpacity={0.75}
          >
            <Text style={styles.statusInputText}>{isChecked ? '☑' : '☐'}</Text>
          </TouchableOpacity>
        </View>
      );
    });
  };

  const renderTable = () => {
    if (checklistType === 'checkBox') {
      return (
        <>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.itemCol]}>Checklist Item</Text>
            <Text style={[styles.tableHeaderCell, styles.statusCol]}>Good Condition</Text>
            <Text style={[styles.tableHeaderCell, styles.statusCol]}>Broken</Text>
          </View>
          {renderCheckBoxRows()}
        </>
      );
    }

    if (checklistType === 'radio') {
      return (
        <>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.itemCol]}>Checklist Item</Text>
            <Text style={[styles.tableHeaderCell, styles.statusCol]}>Checked</Text>
          </View>
          {renderRadioRows()}
        </>
      );
    }

    return <Text style={styles.infoText}>Special checklist logic will be added next.</Text>;
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Checklist Details</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.label}>Category</Text>
            <Text style={styles.value}>{checklistitemCategory || '-'}</Text>

            {isLoading ? (
              <View style={styles.centerWrap}>
                <ActivityIndicator color="#f59e0b" />
                <Text style={styles.infoText}>Loading checklist items...</Text>
              </View>
            ) : errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : !checklistItems.length && checklistType !== 'special' ? (
              <Text style={styles.infoText}>No checklist items found.</Text>
            ) : (
              <ScrollView style={styles.tableWrap} contentContainerStyle={styles.tableContent}>
                {renderTable()}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  card: {
    width: '100%',
    maxWidth: 560,
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
  body: {
    borderWidth: 1,
    borderColor: '#1111111f',
    borderRadius: 12,
    backgroundColor: '#fffdf9',
    padding: 12,
    marginBottom: 12,
    maxHeight: 420
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18
  },
  tableWrap: {
    marginTop: 10,
    maxHeight: 320
  },
  tableContent: {
    paddingBottom: 4
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#fff3d6',
    borderWidth: 1,
    borderColor: '#f59e0b55',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    marginBottom: 6
  },
  tableHeaderCell: {
    color: '#111111',
    fontWeight: '800',
    fontSize: 12
  },
  tableRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#1111111f',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 6
  },
  tableCell: {
    color: '#111111',
    fontWeight: '600',
    fontSize: 12
  },
  itemCol: {
    flex: 1
  },
  statusCol: {
    width: 86,
    textAlign: 'center',
    fontWeight: '800'
  },
  statusInputButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24
  },
  statusInputText: {
    color: '#111111',
    fontWeight: '800',
    fontSize: 16
  },
  label: {
    color: '#6b7280',
    fontWeight: '700',
    fontSize: 12
  },
  value: {
    color: '#111111',
    fontWeight: '800',
    fontSize: 16,
    marginTop: 3
  },
  infoText: {
    marginTop: 10,
    color: '#374151',
    fontSize: 13
  },
  errorText: {
    marginTop: 10,
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700'
  },
  backBtn: {
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderWidth: 1,
    borderColor: '#e78f00'
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  }
});

export default DisplayCheckListDetailsModal;

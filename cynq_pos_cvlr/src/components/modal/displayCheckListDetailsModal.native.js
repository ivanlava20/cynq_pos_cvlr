import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const DisplayCheckListDetailsModal = ({ isOpen, onClose, checklistitemCategory }) => {
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
            <Text style={styles.infoText}>Details content will be added on the next step.</Text>
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
    marginBottom: 12
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

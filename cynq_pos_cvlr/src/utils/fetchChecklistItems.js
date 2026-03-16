import { collection, getDocs, query, where } from 'firebase/firestore';
import { firestore } from '../../firebase.js';
import { store } from '../config/env';

const getCurrentPhilippineDate = () => {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Manila'
  });
};

export const fetchChecklistItems = async (branchCode = store.branchCode) => {
  try {
    const dateUpdated = getCurrentPhilippineDate();

    const dailyDataQuery = query(
      collection(firestore, 'CHECKLIST_DAILY_DATA'),
      where('branchCode', '==', branchCode),
      where('dateUpdated', '==', dateUpdated)
    );

    const dailyDataSnapshot = await getDocs(dailyDataQuery);

    if (!dailyDataSnapshot.empty) {
      const itemsSnapshot = await getDocs(query(collection(firestore, 'CHECKLIST_ITEMS')));
      const checklistItemsMap = new Map();
      const checklistItemLookup = new Map();

      itemsSnapshot.forEach((doc) => {
        const data = doc.data();
        const itemId = data.checklistItemId || '';
        if (!itemId) return;

        checklistItemLookup.set(itemId, {
          checklistItem: data.checklistItem || '',
          checklistitemCategory: data.checklistitemCategory || ''
        });
      });

      dailyDataSnapshot.forEach((doc) => {
        const data = doc.data();
        const itemId = data.checklistItemId || '';
        if (!itemId) return;

        const itemFromMaster = checklistItemLookup.get(itemId);

        checklistItemsMap.set(itemId, {
          checklistitemCategory: data.checklistitemCategory || itemFromMaster?.checklistitemCategory || '',
          checklistItemId: itemId,
          checklistItem: data.checklistItem || itemFromMaster?.checklistItem || '',
          checklistDone: data.checklistDone || '',
          employeeAdded: data.employeeAdded || '',
          employeeEvaluated: data.employeeEvaluated || '',
          branchCode: data.branchCode || branchCode,
          dateUpdated: data.dateUpdated || dateUpdated
        });
      });

      itemsSnapshot.forEach((doc) => {
        const data = doc.data();
        const itemId = data.checklistItemId || '';

        if (!itemId || checklistItemsMap.has(itemId)) {
          return;
        }

        checklistItemsMap.set(itemId, {
          checklistitemCategory: data.checklistitemCategory || '',
          checklistItemId: itemId,
          checklistItem: data.checklistItem || '',
          checklistDone: '',
          employeeAdded: '',
          employeeEvaluated: '',
          branchCode,
          dateUpdated
        });
      });

      const checklistItems = Array.from(checklistItemsMap.values());

      checklistItems.sort((a, b) => {
        if (a.checklistitemCategory !== b.checklistitemCategory) {
          return a.checklistitemCategory.localeCompare(b.checklistitemCategory);
        }
        return a.checklistItemId.localeCompare(b.checklistItemId);
      });

      const groupedByCategory = checklistItems.reduce((acc, item) => {
        const category = item.checklistitemCategory;

        if (!acc[category]) {
          acc[category] = [];
        }

        acc[category].push(item);

        return acc;
      }, {});

      return {
        success: true,
        data: checklistItems,
        groupedData: groupedByCategory,
        source: 'CHECKLIST_DAILY_DATA+CHECKLIST_ITEMS',
        summary: {
          totalItems: checklistItems.length,
          categories: Object.keys(groupedByCategory).length,
          itemsByCategory: Object.keys(groupedByCategory).reduce((acc, cat) => {
            acc[cat] = groupedByCategory[cat].length;
            return acc;
          }, {})
        },
        message: 'Checklist items fetched successfully from daily data with missing items filled from checklist master'
      };
    }

    const checklistQuery = query(collection(firestore, 'CHECKLIST_ITEMS'));
    const querySnapshot = await getDocs(checklistQuery);

    if (querySnapshot.empty) {
      return {
        success: true,
        data: [],
        groupedData: {},
        message: 'No checklist items found'
      };
    }

    const checklistItems = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      checklistItems.push({
        checklistitemCategory: data.checklistitemCategory || '',
        checklistItemId: data.checklistItemId || '',
        checklistItem: data.checklistItem || ''
      });
    });

    checklistItems.sort((a, b) => {
      if (a.checklistitemCategory !== b.checklistitemCategory) {
        return a.checklistitemCategory.localeCompare(b.checklistitemCategory);
      }
      return a.checklistItemId.localeCompare(b.checklistItemId);
    });

    const groupedByCategory = checklistItems.reduce((acc, item) => {
      const category = item.checklistitemCategory;
      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push(item);
      return acc;
    }, {});

    return {
      success: true,
      data: checklistItems,
      groupedData: groupedByCategory,
      source: 'CHECKLIST_ITEMS',
      summary: {
        totalItems: checklistItems.length,
        categories: Object.keys(groupedByCategory).length,
        itemsByCategory: Object.keys(groupedByCategory).reduce((acc, cat) => {
          acc[cat] = groupedByCategory[cat].length;
          return acc;
        }, {})
      },
      message: 'Checklist items fetched successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      groupedData: {},
      error: error.message,
      message: error.message || 'Failed to fetch checklist items'
    };
  }
};

export const fetchChecklistItemsByCategory = async (category) => {
  try {
    const checklistQuery = query(collection(firestore, 'CHECKLIST_ITEMS'));
    const querySnapshot = await getDocs(checklistQuery);

    const checklistItems = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();

      if (data.checklistitemCategory === category) {
        checklistItems.push({
          checklistitemCategory: data.checklistitemCategory || '',
          checklistItemId: data.checklistItemId || '',
          checklistItem: data.checklistItem || ''
        });
      }
    });

    checklistItems.sort((a, b) => a.checklistItemId.localeCompare(b.checklistItemId));

    return {
      success: true,
      data: checklistItems,
      category,
      count: checklistItems.length,
      message: `Fetched ${checklistItems.length} items for ${category}`
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      category,
      count: 0,
      message: error.message || 'Failed to fetch checklist items'
    };
  }
};

export const fetchChecklistCategories = async () => {
  try {
    const checklistQuery = query(collection(firestore, 'CHECKLIST_ITEMS'));
    const querySnapshot = await getDocs(checklistQuery);

    const categories = new Set();
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.checklistitemCategory) {
        categories.add(data.checklistitemCategory);
      }
    });

    const categoryArray = Array.from(categories).sort();

    return {
      success: true,
      data: categoryArray,
      count: categoryArray.length,
      message: `Found ${categoryArray.length} categories`
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      count: 0,
      message: error.message || 'Failed to fetch categories'
    };
  }
};

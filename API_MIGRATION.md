# API Migration Guide

## Overview

The codebase now has a **service layer** that abstracts all data operations. This makes switching from localStorage to a REST API straightforward.

## Current Architecture

```
Components → useApi() hook → services/api.ts → AppContext (localStorage)
```

## Future Architecture (REST API)

```
Components → useApi() hook → services/api.ts → Backend API
                  ↓ (no changes needed)
```

## Migration Steps

### Step 1: Set up your backend API

Your API should provide these endpoints:

```
GET    /api/properties
POST   /api/properties
PATCH  /api/properties/:id
DELETE /api/properties/:id

GET    /api/units
POST   /api/units
PATCH  /api/units/:id
DELETE /api/units/:id

GET    /api/tenants
POST   /api/tenants
PATCH  /api/tenants/:id
DELETE /api/tenants/:id
POST   /api/tenants/transfer

GET    /api/payments
POST   /api/payments

GET    /api/landlords/:id
PATCH  /api/landlords/:id
```

### Step 2: Update `src/services/api.ts`

Replace the localStorage implementations with actual API calls. Example:

**Before (current):**
```typescript
export const createProperty = async (
  property: Property,
  existingProperties: Property[]
): Promise<Property> => {
  getUpdateState()({
    properties: [...existingProperties, property],
  });
  return property;
};
```

**After (with REST API):**
```typescript
export const createProperty = async (
  property: Property,
  existingProperties: Property[] // Can remove this parameter
): Promise<Property> => {
  const response = await fetch('/api/properties', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}` 
    },
    body: JSON.stringify(property)
  });
  
  if (!response.ok) {
    throw new Error('Failed to create property');
  }
  
  const created = await response.json();
  
  // Optimistic update: refresh state after API call
  getUpdateState()({
    properties: [...existingProperties, created],
  });
  
  return created;
};
```

### Step 3: Update AppContext to fetch initial data

**Current:**
```typescript
const [state, setState] = useState<AppState>(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : initialMockData;
});
```

**After:**
```typescript
const [state, setState] = useState<AppState>(initialMockData);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchData = async () => {
    try {
      const [landlords, properties, units, tenants, payments] = await Promise.all([
        fetch('/api/landlords').then(r => r.json()),
        fetch('/api/properties').then(r => r.json()),
        fetch('/api/units').then(r => r.json()),
        fetch('/api/tenants').then(r => r.json()),
        fetch('/api/payments').then(r => r.json()),
      ]);
      
      setState({
        landlords,
        properties,
        units,
        tenants,
        payments,
        currentUser: null,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchData();
}, []);
```

### Step 4: Add loading states to components (optional)

If you want to show loading spinners:

```typescript
export const LandlordDashboard: React.FC = () => {
  const api = useApi();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleMarkAsPaid = async () => {
    setIsLoading(true);
    try {
      await api.createPayment(newPayment);
      showToast('Payment marked as paid');
    } catch (error) {
      showToast('Failed to save payment', 'error');
    } finally {
      setIsLoading(false);
    }
  };
};
```

## Using the API Service

### ✅ Good: Use the `useApi()` hook

```typescript
import { useApi } from '../../hooks/useApi';

const api = useApi();

// Create
await api.createProperty(newProperty);
await api.createPayment(newPayment);

// Update
await api.updateUnit(unitId, { rentAmount: 2000 });
await api.updateTenant(tenantId, { autopayEnabled: true });

// Delete
await api.deleteProperty(propertyId);
await api.deleteTenant(tenantId);
```

### ❌ Avoid: Direct `updateState()` calls

```typescript
// Don't do this anymore:
updateState({ properties: [...properties, newProperty] });

// Do this instead:
await api.createProperty(newProperty);
```

## Benefits

1. **No component changes needed** - Components already use `useApi()` hook
2. **Type safety** - All operations are typed with TypeScript
3. **Centralized logic** - All API calls in one place
4. **Easy testing** - Mock the service layer instead of localStorage
5. **Optimistic updates** - Can add optimistic UI updates easily
6. **Error handling** - Centralized error handling and retry logic

## Example Component Migration

**Before:**
```typescript
const { properties, updateState } = useApp();

const handleAdd = () => {
  updateState({
    properties: [...properties, newProperty],
  });
};
```

**After:**
```typescript
const api = useApi();

const handleAdd = async () => {
  await api.createProperty(newProperty);
};
```

## Notes

- The service layer is already implemented and working with localStorage
- Components like `LandlordDashboard` are already using the new pattern
- To migrate other components, replace `updateState()` calls with `useApi()` calls
- When you're ready for the backend, just swap implementations in `services/api.ts`
- Components won't need any changes during the API migration

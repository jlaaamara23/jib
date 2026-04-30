// Dev: Vite proxies `/api` → backend (see vite.config.js).
// Production: prefer VITE_API_URL; if unset, use deployed backend URL.
const DEFAULT_PROD_API_URL = 'https://multi-stores-backend-1.onrender.com/api';
const isLocalDevHost = typeof window !== 'undefined'
  && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE = (import.meta.env.VITE_API_URL && String(import.meta.env.VITE_API_URL).trim())
  ? String(import.meta.env.VITE_API_URL).trim().replace(/\/$/, '')
  : (isLocalDevHost ? '/api' : DEFAULT_PROD_API_URL);

function apiOrigin() {
  if (API_BASE.startsWith('http://') || API_BASE.startsWith('https://')) {
    return API_BASE.replace(/\/api$/, '');
  }
  if (typeof window !== 'undefined') {
    // In production, relative API base can still happen from env mismatch.
    // Use known backend origin for uploaded assets instead of frontend origin.
    if (!isLocalDevHost) return DEFAULT_PROD_API_URL.replace(/\/api$/, '');
    return window.location.origin;
  }
  return '';
}

function toAbsoluteAssetUrl(url) {
  const value = typeof url === 'string' ? url.trim() : '';
  if (!value) return '';
  if (value.startsWith('data:')) return value;
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value);
      const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (isLocalhost && parsed.pathname.startsWith('/uploads/')) {
        return `${apiOrigin()}${parsed.pathname}`;
      }
      if (typeof window !== 'undefined' && parsed.hostname === window.location.hostname && parsed.pathname.startsWith('/uploads/')) {
        return `${apiOrigin()}${parsed.pathname}`;
      }
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
        return parsed.toString();
      }
      return parsed.toString();
    } catch {
      return value;
    }
  }
  if (value.startsWith('/')) return `${apiOrigin()}${value}`;
  return value;
}

function normalizeProductAssets(product) {
  if (!product || typeof product !== 'object') return product;
  const imageUrls = Array.isArray(product.imageUrls)
    ? product.imageUrls.map(toAbsoluteAssetUrl).filter(Boolean)
    : [];
  const colorVariants = Array.isArray(product.colorVariants)
    ? product.colorVariants.map((variant) => ({
        ...variant,
        imageUrls: Array.isArray(variant?.imageUrls)
          ? variant.imageUrls.map(toAbsoluteAssetUrl).filter(Boolean)
          : [],
      }))
    : product.colorVariants;
  return {
    ...product,
    imageUrls,
    colorVariants,
  };
}

function getToken() {
  return localStorage.getItem('token');
}

function clearAuthToken() {
  localStorage.removeItem('token');
}

function headers(includeAuth = true) {
  const h = { 'Content-Type': 'application/json' };
  if (includeAuth) {
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getStores() {
  const res = await fetch(`${API_BASE}/stores`, { headers: headers(false) });
  if (!res.ok) throw new Error('Failed to load stores');
  const data = await res.json();
  return Array.isArray(data)
    ? data.map((store) => ({ ...store, iconUrl: toAbsoluteAssetUrl(store?.iconUrl) || '' }))
    : [];
}

export async function getStoreBySlug(slug) {
  const res = await fetch(`${API_BASE}/stores/${encodeURIComponent(slug)}`, { headers: headers(false) });
  if (!res.ok) throw new Error('Store not found');
  const data = await res.json();
  return { ...data, iconUrl: toAbsoluteAssetUrl(data?.iconUrl) || '' };
}

export async function getStoreById(id) {
  const res = await fetch(`${API_BASE}/stores/id/${id}`, { headers: headers(false) });
  if (!res.ok) throw new Error('Store not found');
  const data = await res.json();
  return { ...data, iconUrl: toAbsoluteAssetUrl(data?.iconUrl) || '' };
}

export async function getProducts(storeId, categoryId = null) {
  let url = `${API_BASE}/stores/${storeId}/products`;
  if (categoryId) url += `?categoryId=${categoryId}`;
  const res = await fetch(url, { headers: headers(false) });
  if (!res.ok) throw new Error('Failed to load products');
  const data = await res.json();
  return Array.isArray(data) ? data.map(normalizeProductAssets) : [];
}

export async function getProductById(id) {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}`, { headers: headers(false) });
  if (!res.ok) throw new Error('Product not found');
  const data = await res.json();
  return normalizeProductAssets(data);
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: headers(false),
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Login failed');
  }
  return res.json();
}

export async function register(email, password, role = 'CUSTOMER', phone = '') {
  const body = { email, password, role, phone: (phone || '').trim() }
  let res;
  try {
    res = await fetchWithTimeout(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: headers(false),
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new Error('Registration timed out. Please try again.')
    }
    throw err
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Registration failed');
  }
  return res.json();
}

export async function verifyEmail(token) {
  const res = await fetch(`${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`, { headers: headers(false) });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Verification failed');
  }
  return res.json();
}

export async function resendVerificationEmail(email) {
  const res = await fetch(`${API_BASE}/auth/resend-verification`, {
    method: 'POST',
    headers: headers(false),
    body: JSON.stringify({ email: (email || '').trim() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to resend');
  return data;
}

export async function createStore(name, category, iconUrl = '') {
  const body = { name, category };
  if (iconUrl && iconUrl.trim()) body.iconUrl = iconUrl.trim();
  const res = await fetch(`${API_BASE}/stores`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      clearAuthToken();
      throw new Error(data.error || 'Session expired or forbidden. Please log in again.');
    }
    throw new Error(data.error || data.message || 'Failed to create store');
  }
  const data = await res.json();
  return { ...data, iconUrl: toAbsoluteAssetUrl(data?.iconUrl) || '' };
}

export async function updateStore(id, name, category, iconUrl = '') {
  const body = { name, category };
  if (iconUrl && iconUrl.trim()) body.iconUrl = iconUrl.trim();
  const res = await fetch(`${API_BASE}/stores/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update store');
  const data = await res.json();
  return { ...data, iconUrl: toAbsoluteAssetUrl(data?.iconUrl) || '' };
}

export async function deleteStore(id) {
  const res = await fetch(`${API_BASE}/stores/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) throw new Error('Failed to delete store');
}

export async function addProduct(data) {
  const res = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      clearAuthToken();
      throw new Error(body.error || 'Session expired or forbidden. Please log in again.');
    }
    throw new Error(body.error || 'Failed to add product');
  }
  const body = await res.json();
  return normalizeProductAssets(body);
}

export async function updateProduct(id, data) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      clearAuthToken();
      throw new Error(body.error || 'Session expired or forbidden. Please log in again.');
    }
    throw new Error(body.error || body.message || 'Failed to update product');
  }
  const body = await res.json();
  return normalizeProductAssets(body);
}

export async function deleteProduct(id) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) {
    let message = ''
    try {
      const data = await res.json()
      message = data?.error || ''
    } catch {
      message = await res.text().catch(() => '')
    }
    if (!message) {
      if (res.status === 409) {
        message = 'Cannot delete this product because it is used in previous orders. Remove its image or set stock to 0 instead.'
      } else if (res.status === 401 || res.status === 403) {
        message = 'Session expired or forbidden. Please log in again.'
      } else {
        message = 'Failed to delete product'
      }
    }
    throw new Error(message);
  }
}

export async function createOrder(storeId, items) {
  const res = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ storeId, items }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      clearAuthToken();
      throw new Error(data.error || 'Session expired. Please log in again.');
    }
    throw new Error(data.error || 'Failed to create order');
  }
  return res.json();
}

export async function getMyOrders() {
  const res = await fetch(`${API_BASE}/orders/my`, { headers: headers() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load orders');
  }
  return res.json();
}

export async function getAllOrdersForAdmin() {
  const res = await fetch(`${API_BASE}/orders/admin/all`, { headers: headers() });
  if (res.status === 403) {
    // Fallback for users whose role changed or stale role state in the client.
    return getMyOrders();
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to load all orders');
  }
  return res.json();
}

export async function deleteOrder(orderId) {
  const res = await fetch(`${API_BASE}/orders/${orderId}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok) {
    let message = ''
    try {
      const data = await res.json()
      message = data?.error || ''
    } catch {
      message = await res.text().catch(() => '')
    }
    throw new Error(message || 'Failed to delete order');
  }
}

export async function createPaymentIntent(amount, currency = 'ils', orderId = null) {
  const res = await fetch(`${API_BASE}/payments/create-intent`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ amount, currency, orderId }),
  });
  if (!res.ok) throw new Error('Failed to create payment');
  return res.json();
}

export async function confirmPayment(paymentIntentId, orderIds) {
  const res = await fetch(`${API_BASE}/payments/confirm`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ paymentIntentId, orderIds }),
  });
  if (!res.ok) throw new Error('Failed to confirm payment');
}

export async function getProfile(authToken = null) {
  const token = authToken || getToken();
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/auth/me`, { headers: h });
  if (!res.ok) throw new Error('Not authenticated');
  return res.json();
}

/** Upload a file; returns { url } for the uploaded image. */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  const token = getToken();
  const h = {};
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    headers: h,
    body: formData,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) {
      clearAuthToken();
      throw new Error(data.error || 'Session expired or forbidden. Please log in again.');
    }
    throw new Error(data.error || 'Upload failed');
  }
  const data = await res.json();
  return toAbsoluteAssetUrl(data.url);
}

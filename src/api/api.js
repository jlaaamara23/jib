const API_BASE = '/api';

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

export async function getStores() {
  const res = await fetch(`${API_BASE}/stores`, { headers: headers(false) });
  if (!res.ok) throw new Error('Failed to load stores');
  return res.json();
}

export async function getStoreBySlug(slug) {
  const res = await fetch(`${API_BASE}/stores/${encodeURIComponent(slug)}`, { headers: headers(false) });
  if (!res.ok) throw new Error('Store not found');
  return res.json();
}

export async function getStoreById(id) {
  const res = await fetch(`${API_BASE}/stores/id/${id}`, { headers: headers(false) });
  if (!res.ok) throw new Error('Store not found');
  return res.json();
}

export async function getProducts(storeId, categoryId = null) {
  let url = `${API_BASE}/stores/${storeId}/products`;
  if (categoryId) url += `?categoryId=${categoryId}`;
  const res = await fetch(url, { headers: headers(false) });
  if (!res.ok) throw new Error('Failed to load products');
  return res.json();
}

export async function getProductById(id) {
  const res = await fetch(`${API_BASE}/products/${encodeURIComponent(id)}`, { headers: headers(false) });
  if (!res.ok) throw new Error('Product not found');
  return res.json();
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
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: headers(false),
    body: JSON.stringify(body),
  });
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
  return res.json();
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
  return res.json();
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
  return res.json();
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
  return res.json();
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

export async function getProfile() {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: headers() });
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
  return data.url;
}

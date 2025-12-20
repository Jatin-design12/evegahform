const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

async function apiFetch(path, options = {}) {
  const url = API_BASE ? `${API_BASE}${path}` : path;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error || `Request failed: ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export async function listPaymentDues(employeeUid) {
  const query = new URLSearchParams({ employeeUid }).toString();
  return apiFetch(`/api/payment-dues?${query}`);
}

export async function getPaymentDueSummary(employeeUid) {
  const query = new URLSearchParams({ employeeUid }).toString();
  return apiFetch(`/api/payment-dues/summary?${query}`);
}

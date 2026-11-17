/**
 * M-Pesa API service using centralized apiClient.
 * Safaricom credentials remain strictly on backend.
 */
import apiClient from '../config/api';

export const mpesaService = {
  /**
   * Initiate M-Pesa STK push.
   * contact_id is provided so backend retrieves the verified phone number from DB.
   */
  async initiateStkPush({ contact_id, amount }) {
    const response = await apiClient.post('/api/mpesa/stkpush', {
      contact_id,
      amount: Number(amount)
    });
    return response.data;
  },

  /**
   * Check status of a transaction by checkout_request_id.
   */
  async getTransactionStatus(checkoutRequestId) {
    const response = await apiClient.get(`/api/mpesa/transactions/${checkoutRequestId}`);
    return response.data;
  },

  /**
   * Fetch paginated transactions list with status filter and search.
   */
  async getTransactions(params = {}) {
    const response = await apiClient.get('/api/mpesa/transactions', { params });
    return response.data;
  },

  /**
   * Fetch dashboard statistics (total contacts, payments, recent activity).
   */
  async getDashboardStats() {
    const response = await apiClient.get('/api/mpesa/dashboard/stats');
    return response.data;
  }
};

export default mpesaService;

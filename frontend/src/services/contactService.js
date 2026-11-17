/**
 * Contacts API service using the centralized apiClient.
 */
import apiClient from '../config/api';

export const contactService = {
  /**
   * Fetch paginated contacts with search and sorting.
   */
  async getContacts(params = {}) {
    const response = await apiClient.get('/api/contacts', { params });
    return response.data;
  },

  /**
   * Fetch single contact details with recent transactions.
   */
  async getContactById(id) {
    const response = await apiClient.get(`/api/contacts/${id}`);
    return response.data;
  },

  /**
   * Create a contact manually.
   */
  async createContact(data) {
    const response = await apiClient.post('/api/contacts', data);
    return response.data;
  },

  /**
   * Update an existing contact.
   */
  async updateContact(id, data) {
    const response = await apiClient.put(`/api/contacts/${id}`, data);
    return response.data;
  },

  /**
   * Delete a contact by ID.
   */
  async deleteContact(id) {
    const response = await apiClient.delete(`/api/contacts/${id}`);
    return response.data;
  },

  /**
   * Send CSV file for server preview validation without persisting.
   */
  async previewCsv(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/contacts/preview-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * Import contacts by uploading CSV file.
   */
  async importCsv(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/api/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * Import contacts by sending validated JSON payload.
   */
  async importJson(contacts) {
    const response = await apiClient.post('/api/contacts/import', { contacts });
    return response.data;
  }
};

export default contactService;

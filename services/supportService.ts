import {
  CreateFeatureRequestRequest,
  CreateSupportTicketRequest,
  FeatureRequestResponse,
  SupportTicketResponse,
} from '../types/api';
import { apiClient } from './apiClient';

class SupportService {
  async createSupportTicket(
    request: CreateSupportTicketRequest
  ): Promise<SupportTicketResponse> {
    const response = await apiClient.post<SupportTicketResponse>('/support/tickets', request);
    return response.data;
  }

  async createFeatureRequest(
    request: CreateFeatureRequestRequest
  ): Promise<FeatureRequestResponse> {
    const response = await apiClient.post<FeatureRequestResponse>('/support/feature-requests', request);
    return response.data;
  }
}

export const supportService = new SupportService();
export default supportService;

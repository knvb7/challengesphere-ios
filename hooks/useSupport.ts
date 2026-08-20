import { useMutation } from '@tanstack/react-query';
import { supportService } from '../services/supportService';
import { CreateFeatureRequestRequest, CreateSupportTicketRequest } from '../types/api';

export const useCreateSupportTicket = () => {
  return useMutation({
    mutationFn: (request: CreateSupportTicketRequest) =>
      supportService.createSupportTicket(request),
  });
};

export const useCreateFeatureRequest = () => {
  return useMutation({
    mutationFn: (request: CreateFeatureRequestRequest) =>
      supportService.createFeatureRequest(request),
  });
};

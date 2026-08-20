import { apiClient } from './apiClient';

export type ContentReportTargetType = 'SUBMISSION' | 'COMMENT' | 'CHALLENGE';
export type ContentReportReason =
  | 'CHILD_SAFETY'
  | 'HARASSMENT'
  | 'HATE'
  | 'NUDITY'
  | 'SELF_HARM'
  | 'SPAM'
  | 'VIOLENCE'
  | 'OTHER';

export interface ContentReportResponse {
  success: boolean;
  reportId: number;
  status: 'OPEN';
  message: string;
}

class ContentReportService {
  async report(
    targetType: ContentReportTargetType,
    targetId: number,
    reason: ContentReportReason,
    details?: string,
  ): Promise<ContentReportResponse> {
    const response = await apiClient.post<ContentReportResponse>('/content-reports', {
      targetType,
      targetId,
      reason,
      details: details?.trim() || undefined,
    });
    return response.data;
  }
}

export const contentReportService = new ContentReportService();

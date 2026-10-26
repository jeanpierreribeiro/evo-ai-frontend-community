import { schedulingApi } from './schedulingApi';
import type {
  Booking,
  EventType,
  Schedule,
  AvailableSlot,
  PublicEventData,
} from '@/types/scheduling';

export interface GetSlotsParams {
  userId?: string;
  username?: string;
  eventTypeId?: string;
  eventSlug?: string;
  date: string; // YYYY-MM-DD
  timeZone?: string;
}

export interface GetBookingsParams {
  userId?: string;
  status?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface CreateBookingData {
  userId: string;
  eventTypeId?: string;
  title: string;
  description?: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  attendeeNotes?: string;
  metadata?: Record<string, unknown>;
}

export const schedulingService = {
  // Sync current user to scheduling microservice
  async syncUser(userData: { id: string; email: string; name: string; username?: string }) {
    const { data } = await schedulingApi.post('/users/sync', userData);
    return data;
  },

  // Slots
  async getSlots(params: GetSlotsParams): Promise<{ date: string; timeZone: string; slots: AvailableSlot[] }> {
    const { data } = await schedulingApi.get('/slots', { params });
    return data;
  },

  // Bookings
  async getBookings(params?: GetBookingsParams): Promise<{ total: number; limit: number; offset: number; data: Booking[] }> {
    const { data } = await schedulingApi.get('/bookings', { params });
    return data;
  },

  async getBooking(id: string): Promise<Booking> {
    const { data } = await schedulingApi.get(`/bookings/${id}`);
    return data;
  },

  async createBooking(bookingData: CreateBookingData): Promise<Booking> {
    const { data } = await schedulingApi.post('/bookings', bookingData);
    return data;
  },

  async cancelBooking(id: string, cancellationReason?: string): Promise<Booking> {
    const { data } = await schedulingApi.patch(`/bookings/${id}`, {
      status: 'CANCELLED',
      cancellationReason,
    });
    return data;
  },

  async rescheduleBooking(id: string, startTime: string, endTime: string): Promise<Booking> {
    const { data } = await schedulingApi.patch(`/bookings/${id}`, {
      startTime,
      endTime,
    });
    return data;
  },

  // Schedules & Availability
  async getUserSchedule(userId: string): Promise<Schedule> {
    const { data } = await schedulingApi.get(`/schedules/${userId}`);
    return data;
  },

  async saveUserSchedule(
    userId: string,
    scheduleData: {
      name?: string;
      timeZone?: string;
      availabilities: Array<{
        days: number[];
        startTime: string;
        endTime: string;
        date?: string | null;
      }>;
    }
  ): Promise<Schedule> {
    const { data } = await schedulingApi.put(`/schedules/${userId}`, scheduleData);
    return data;
  },

  // Event Types
  async getEventTypes(userId?: string): Promise<EventType[]> {
    const { data } = await schedulingApi.get('/event-types', { params: { userId } });
    return data;
  },

  async createEventType(eventTypeData: Partial<EventType> & { userId: string; title: string; slug: string; length: number }): Promise<EventType> {
    const { data } = await schedulingApi.post('/event-types', eventTypeData);
    return data;
  },

  async updateEventType(id: string, updateData: Partial<EventType>): Promise<EventType> {
    const { data } = await schedulingApi.patch(`/event-types/${id}`, updateData);
    return data;
  },

  async deleteEventType(id: string): Promise<{ success: boolean }> {
    const { data } = await schedulingApi.delete(`/event-types/${id}`);
    return data;
  },

  // Public Booking
  async getPublicEvent(username: string, eventSlug: string): Promise<PublicEventData> {
    const { data } = await schedulingApi.get(`/public/${username}/${eventSlug}`);
    return data;
  },

  async getPublicProfile(username: string) {
    const { data } = await schedulingApi.get(`/public/${username}`);
    return data;
  },
};

export default schedulingService;

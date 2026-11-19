export type BookingStatus = 'ACCEPTED' | 'CANCELLED' | 'REJECTED' | 'PENDING';

export type SummaryStatus = 'PENDING' | 'DONE' | 'FAILED';

export interface MeetingTopics {
  topic: string;
  participants: string[];
  keyPoints: string[];
  decisions: string[];
  learnings: string[];
  factsAndFigures: string[];
  nextSteps: string[];
  mentionedEntities: string[];
}

export interface MeetingSummary {
  id: string;
  bookingId: string;
  status: SummaryStatus;
  fullSummaryUrl?: string | null;
  transcriptUrl?: string | null;
  topics?: MeetingTopics | null;
  topicsVersion: number;
  rawTranscript?: string | null;
  errorMessage?: string | null;
  generatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiStatusResponse {
  enabled: boolean;
  host: string;
  model: string;
}

export interface Booking {
  id: string;
  uid: string;
  userId: string;
  eventTypeId?: string | null;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string | null;
  attendeeNotes?: string | null;
  cancellationReason?: string | null;
  metadata?: Record<string, unknown> | null;
  eventType?: EventType | null;
  hasSummary?: boolean;
  summary?: MeetingSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventType {
  id: string;
  userId: string;
  scheduleId?: string | null;
  title: string;
  slug: string;
  description?: string | null;
  length: number;
  beforeBuffer: number;
  afterBuffer: number;
  minimumNotice: number;
  slotInterval?: number | null;
  isActive: boolean;
  color?: string | null;
  locations?: any;
  _count?: {
    bookings: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Availability {
  id?: string;
  days: number[]; // 0 = Dom, 1 = Seg, ... 6 = Sab
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  date?: string | null;
}

export interface Schedule {
  id: string;
  name: string;
  timeZone: string;
  isDefault: boolean;
  availabilities: Availability[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailableSlot {
  time: string;
  startTime: string;
  endTime: string;
  formattedTime: string;
}

export interface PublicEventData {
  host: {
    id: string;
    name: string;
    username: string;
    timeZone: string;
    avatarUrl?: string | null;
  };
  event: EventType;
}

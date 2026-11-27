// Shared Travelian domain models and permission catalog.

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'agency_owner' | 'agency_staff' | 'customer' | 'qa' | 'internal_support';
export type AgencyStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type BookingType = 'b2c' | 'b2b';
export type TransactionType = 'credit' | 'debit';
export type WalletMethod = 'card' | '1link' | 'bank_transfer' | 'manual' | 'booking' | 'refund';
export type WalletStatus = 'pending' | 'approved' | 'rejected' | 'reversed' | 'cancelled';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  agencyId?: string;
  parentAgencyId?: string;
  designation?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  moduleAccess?: string[];
}

export interface Agency {
  agencyId: string;
  agencyName: string;
  email: string;
  phone: string;
  status: AgencyStatus;
  commissionRate: number;
  walletBalance: number;
  contactPerson: string;
  city: string;
  createdAt: string;
  totalBookings: number;
  address?: string;
  licenseNo?: string;
  parentAgencyId?: string;
  agencyType?: 'main' | 'sub';
  ownerUserId?: string;
}

export interface UmrahPackage {
  packageId: string;
  name: string;
  description: string;
  basePrice: number;
  duration: string;
  hotel: string;
  city: string;
  status: 'active' | 'inactive';
  includes: string[];
  category: 'umrah';
  image?: string;
  packageType?: string;
  makkahHotel?: string;
  makkahHotelInfo?: string;
  madinahHotel?: string;
  madinahHotelInfo?: string;
  roomSharing?: string;
  departureCity?: string;
  transportIncluded?: boolean;
  visaIncluded?: boolean;
  ticketIncluded?: boolean;
  mealsIncluded?: boolean;
  terms?: string;
  seatsLabel?: string;
  childPrice?: number;
  infantPrice?: number;
  flightDates?: {
    outboundDate: string;
    outboundRoute: string;
    returnDate?: string;
    returnRoute?: string;
  }[];
  hotelOptions?: {
    label: string;
    makkahHotel: string;
    makkahInfo?: string;
    madinahHotel: string;
    madinahInfo?: string;
    prices: {
      sharing?: number;
      quad?: number;
      triple?: number;
      double?: number;
    };
  }[];
  travelDates?: string;
  hotelsText?: string;
  packageIncludesText?: string;
  pricingText?: string;
  itineraryText?: string;
  agentDiscount?: string;
  urgencyText?: string;
  contactNumbers?: string;
  childInfantNote?: string;
  exclusions?: string;
  processingTime?: string;
  validity?: string;
  stayDuration?: string;
  requiredDocuments?: string[];
  embassyFee?: number;
  serviceFee?: number;
  expiresAt?: string;
  archivedAt?: string;
  deletedAt?: string;
}

export interface Booking {
  bookingId: string;
  packageId: string;
  packageName: string;
  customerName: string;
  customerEmail: string;
  agencyId?: string;
  agencyName?: string;
  type: BookingType;
  status: BookingStatus;
  paymentType: 'stripe' | 'wallet' | 'bank_transfer';
  totalAmount: number;
  commission: number;
  travelers: number;
  departureDate: string;
  createdAt: string;
}

export interface WalletTransaction {
  transactionId: string;
  agencyId: string;
  agencyName: string;
  type: TransactionType;
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export interface WalletLedgerEntry {
  ledgerId: string;
  agencyId: string;
  agencyName: string;
  type: TransactionType;
  amount: number;
  method: WalletMethod;
  status: Exclude<WalletStatus, 'pending'>;
  reference: string;
  description: string;
  balanceAfter: number;
  createdBy: string;
  approvedBy?: string;
  depositRequestId?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface WalletDepositRequest {
  depositId: string;
  agencyId: string;
  agencyName: string;
  amount: number;
  method: Extract<WalletMethod, 'card' | '1link' | 'bank_transfer'>;
  status: WalletStatus;
  reference: string;
  providerReference?: string;
  transferDate?: string;
  proofUrl?: string;
  notes?: string;
  requestedBy: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface PaymentWebhookEvent {
  eventId: string;
  provider: 'card' | '1link';
  providerReference: string;
  depositRequestId: string;
  status: 'processed' | 'duplicate' | 'failed';
  receivedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'wallet' | 'agency' | 'system';
  read: boolean;
  createdAt: string;
}

export interface Hotel {
  hotelId: string;
  name: string;
  city: string;
  country: string;
  starRating: number;
  pricePerNight: number;
  rooms: number;
  amenities: string[];
  status: 'active' | 'inactive';
  image?: string;
}

export interface Flight {
  flightId: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  originAirport?: string;
  destinationAirport?: string;
  departureTime: string;
  arrivalTime: string;
  departureTimestamp?: string;
  arrivalTimestamp?: string;
  price: number;
  currency?: string;
  seats?: number;
  status: 'scheduled' | 'delayed' | 'cancelled';
  class: 'economy' | 'business' | 'first';
  duration?: string;
  stops?: number;
  baggage?: string;
  meal?: string;
  segments?: FlightItinerarySegment[];
  layovers?: FlightLayover[];
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  returnDepartureTimestamp?: string;
  returnArrivalTimestamp?: string;
}

export interface FlightItinerarySegment {
  id?: string | null;
  carrier?: string | null;
  airline?: string | null;
  /** A codeshare: the airline that actually flies it, when it isn't `carrier` (the airline it is sold under). */
  operatingCarrier?: string | null;
  operatingAirline?: string | null;
  flightNumber?: string | null;
  origin?: string | null;
  destination?: string | null;
  departureAirport?: string | null;
  arrivalAirport?: string | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  departureTimestamp?: string | null;
  arrivalTimestamp?: string | null;
  departureTerminal?: string | null;
  arrivalTerminal?: string | null;
  duration?: string | null;
  equipment?: string | null;
  /** A group return fare's flights say which journey they belong to (#175); live flights leave it out. */
  direction?: "outbound" | "return";
}

export interface FlightLayover {
  location?: string | null;
  arrivalTime?: string | null;
  departureTime?: string | null;
  duration?: string | null;
  nextFlightNumber?: string | null;
}

export interface Coupon {
  couponId: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrder: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  status: 'active' | 'expired' | 'inactive';
  applicableTo: 'all' | 'umrah';
}

export interface BlogPost {
  postId: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  status: 'published' | 'draft';
  publishedAt: string;
  tags: string[];
  image?: string;
}

export interface TravelTicket {
  ticketId: string;
  bookingId: string;
  passengerName: string;
  type: 'flight' | 'bus' | 'train';
  origin: string;
  destination: string;
  departureDate: string;
  seatNumber: string;
  status: 'issued' | 'cancelled' | 'used' | 'pending';
  price: number;
  ticketNumber: string;
  pnr?: string;
  airline?: string;
  flightNumber?: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  passengerType?: 'Adult' | 'Child' | 'Infant';
  dateOfBirth?: string;
  passportNumber?: string;
  passportExpiry?: string;
  originAirport?: string;
  destinationAirport?: string;
  originCity?: string;
  destinationCity?: string;
  arrivalDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  terminal?: string;
  cabinClass?: string;
  baseFare?: number;
  tax?: number;
  checkinBaggageKg?: number;
  cabinBaggageKg?: number;
  notes?: string;
  invoiceNumber?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerId?: string;
  cognitoSub?: string;
  cognitoEmail?: string;
  source?: 'admin_manual' | 'checkout' | 'agency_portal';
  issuedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface CustomerProfile {
  customerId: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  gender?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  passportExpiry?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type BookingRequestType = 'umrah' | 'tour' | 'visa' | 'study_visa' | 'visit_visa' | 'hotel' | 'service' | 'package' | 'group' | 'manual_flight' | 'whatsapp_inquiry';
export type BookingRequestStatus = 'new' | 'contacted' | 'in_progress' | 'waiting_for_documents' | 'payment_pending' | 'confirmed' | 'cancelled_lost' | 'issued' | 'pending' | 'expired' | 'refund' | 'cancel';

export interface BookingRequestFlightDetails {
  originCode?: string;
  originCity?: string;
  destinationCode?: string;
  destinationCity?: string;
  tripType?: 'One-way' | 'Round-trip' | 'Multi-city' | string;
  airline?: string;
  flightNumber?: string;
  duration?: string;
  baggage?: string;
  cabinClass?: string;
  departureAt?: string;
  arrivalAt?: string;
  passengers?: number;
  seats?: number;
}

export interface BookingRequestTraveler {
  travelerId: string;
  customerId?: string;
  title?: string;
  firstName: string;
  lastName: string;
  passengerType: 'adult' | 'child' | 'infant';
  dateOfBirth?: string;
  identityDocumentType?: 'passport' | 'id_card';
  identityDocumentNumber?: string;
  passportOrIdCardIssuanceDate?: string;
  identityDocumentExpiry?: string;
  ticketNumber?: string;
}

export interface BookingRequest {
  requestId: string;
  type: BookingRequestType;
  /** Immutable airline-issued booking record locator. */
  readonly pnr?: string;
  flightDetails?: BookingRequestFlightDetails;
  /** The booking contact may be a traveler or may book on behalf of others. */
  bookerIsTraveler?: boolean;
  travelers?: BookingRequestTraveler[];
  /** Internal supplier/provider reference used by admin filtering. */
  provider?: string;
  packageId?: string;
  packageName?: string;
  customerName: string;
  phone: string;
  email?: string;
  selectedOption?: string;
  status: BookingRequestStatus;
  notes?: string;
  assignedStaff?: string;
  notificationStatus?: 'pending' | 'sent' | 'failed';
  notificationError?: string;
  amount?: number;
  commission?: number;
  paymentStatus?: 'paid' | 'unpaid';
  /** Supplier-provided deadline after which the booking can no longer be completed. */
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationSettings {
  adminNotificationEmail: string;
  adminNotificationPhone: string;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  whatsappNotificationsEnabled: boolean;
  journeyReminderEnabled: boolean;
  journeyReminderHoursBefore: number;
  journeyReminderTemplate: string;
  updatedAt?: string;
}

export interface NotificationDeliveryLog {
  logId: string;
  purpose: string;
  relatedId?: string;
  channel: string;
  recipient?: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  createdAt: string;
}

export interface ModulePermission {
  moduleId: string;
  moduleName: string;
  description: string;
  icon: string;
}

// Users

// Agencies

// Packages



// Bookings

// Transactions

// Notifications

// Hotels

// Flights

// Coupons

// Blog Posts

// Travel Tickets

// Module Permissions
export const availableModules: ModulePermission[] = [
  { moduleId: 'dashboard', moduleName: 'Dashboard', description: 'View system dashboard and analytics', icon: 'LayoutDashboard' },
  { moduleId: 'agencies', moduleName: 'Agencies', description: 'Manage travel agencies', icon: 'Building2' },
  { moduleId: 'packages', moduleName: 'Umrah Packages', description: 'Manage Umrah packages', icon: 'Package' },
  { moduleId: 'bookings', moduleName: 'Bookings', description: 'Manage all bookings', icon: 'CalendarCheck' },
  { moduleId: 'tickets', moduleName: 'Travel Tickets', description: 'Issue and manage travel tickets', icon: 'Ticket' },
  { moduleId: 'wallet', moduleName: 'Wallet', description: 'Manage agency wallets', icon: 'Wallet' },
  { moduleId: 'hotels', moduleName: 'Hotels', description: 'Manage hotel listings', icon: 'Hotel' },
  { moduleId: 'flights', moduleName: 'Flights', description: 'Manage flight inventory', icon: 'Plane' },
  { moduleId: 'users', moduleName: 'Users', description: 'Manage system users', icon: 'Users' },
  { moduleId: 'coupons', moduleName: 'Coupons & Deals', description: 'Manage promotional offers', icon: 'Tag' },
  { moduleId: 'blog', moduleName: 'Blog', description: 'Manage blog posts', icon: 'PenTool' },
  { moduleId: 'documents', moduleName: 'Documents', description: 'Manage uploaded documents', icon: 'FileText' },
  { moduleId: 'notifications', moduleName: 'Notifications', description: 'System notifications', icon: 'Bell' },
  { moduleId: 'settings', moduleName: 'Settings', description: 'System settings', icon: 'Settings' },
  { moduleId: 'rbac', moduleName: 'Access Control', description: 'Manage role-based access', icon: 'Shield' },
];


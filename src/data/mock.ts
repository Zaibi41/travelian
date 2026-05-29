// Mock data for Travelian Admin Panel

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
  category: 'umrah' | 'tour' | 'visa';
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
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency?: string;
  seats: number;
  status: 'scheduled' | 'delayed' | 'cancelled';
  class: 'economy' | 'business' | 'first';
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
  applicableTo: 'all' | 'umrah' | 'tour' | 'visa';
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
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  baseFare?: number;
  tax?: number;
  checkinBaggageKg?: number;
  cabinBaggageKg?: number;
  notes?: string;
  invoiceNumber?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
}

export interface ModulePermission {
  moduleId: string;
  moduleName: string;
  description: string;
  icon: string;
}

// ─── Users ───
export const mockUsers: User[] = [
  { userId: 'u1', name: 'Ahmed Khan', email: 'ahmed@travelian.com', role: 'super_admin', status: 'active', createdAt: '2024-01-15', moduleAccess: ['all'] },
  { userId: 'u2', name: 'Sara Ali', email: 'sara@travelian.com', role: 'admin', status: 'active', createdAt: '2024-02-10', moduleAccess: ['dashboard', 'bookings', 'packages', 'agencies', 'users'] },
  { userId: 'u3', name: 'Omar Farooq', email: 'omar@travelian.com', role: 'staff', status: 'active', createdAt: '2024-03-05', moduleAccess: ['dashboard', 'bookings'] },
  { userId: 'u4', name: 'Fatima Zahra', email: 'fatima@alhijaz.com', role: 'agency_owner', agencyId: 'a1', status: 'active', createdAt: '2024-04-01', designation: 'Agency Owner' },
  { userId: 'u5', name: 'Hassan Raza', email: 'hassan@alhijaz.com', role: 'agency_staff', agencyId: 'a1', status: 'active', createdAt: '2024-04-15', designation: 'Ticketing Officer' },
  { userId: 'u6', name: 'Zainab Malik', email: 'zainab@safartours.com', role: 'agency_owner', agencyId: 'a2', status: 'active', createdAt: '2024-05-01', designation: 'Agency Owner' },
  { userId: 'u7', name: 'Bilal Ahmed', email: 'bilal@noortravel.com', role: 'agency_owner', agencyId: 'a3', status: 'active', createdAt: '2024-06-15', designation: 'Agency Owner' },
  { userId: 'u8', name: 'Amna Qureshi', email: 'amna@travelian.com', role: 'staff', status: 'inactive', createdAt: '2024-07-01', moduleAccess: ['dashboard'] },
  { userId: 'u9', name: 'Adeel Raza', email: 'adeel@alhijaz.com', role: 'agency_staff', agencyId: 'a6', parentAgencyId: 'a1', status: 'active', createdAt: '2024-08-12', designation: 'Sub Agency Manager' },
];

// ─── Agencies ───
export const mockAgencies: Agency[] = [
  { agencyId: 'a1', agencyName: 'Al Hijaz Tours', email: 'info@alhijaz.com', phone: '+92 324 4440014', status: 'active', commissionRate: 12, walletBalance: 45000, contactPerson: 'Fatima Zahra', city: 'Lahore', createdAt: '2024-04-01', totalBookings: 34, address: 'Johar Town, Lahore', licenseNo: 'TRV-2024-001', agencyType: 'main', ownerUserId: 'u4' },
  { agencyId: 'a2', agencyName: 'Safar Tours', email: 'info@safartours.com', phone: '+92-321-7654321', status: 'active', commissionRate: 10, walletBalance: 78500, contactPerson: 'Zainab Malik', city: 'Karachi', createdAt: '2024-05-01', totalBookings: 56, address: '45 Clifton Block 5, Karachi', licenseNo: 'TRV-2024-002', agencyType: 'main', ownerUserId: 'u6' },
  { agencyId: 'a3', agencyName: 'Noor Travel Agency', email: 'noor@noortravel.com', phone: '+92-333-9876543', status: 'pending', commissionRate: 8, walletBalance: 0, contactPerson: 'Bilal Ahmed', city: 'Islamabad', createdAt: '2024-06-15', totalBookings: 0, address: 'F-7 Markaz, Islamabad', licenseNo: 'TRV-2024-003', agencyType: 'main', ownerUserId: 'u7' },
  { agencyId: 'a4', agencyName: 'Madinah Express', email: 'contact@madinah-express.com', phone: '+92-345-1122334', status: 'suspended', commissionRate: 15, walletBalance: 12000, contactPerson: 'Asad Iqbal', city: 'Faisalabad', createdAt: '2024-03-20', totalBookings: 12, address: 'D Ground, Faisalabad', licenseNo: 'TRV-2024-004', agencyType: 'main' },
  { agencyId: 'a5', agencyName: 'Barakah Travels', email: 'hello@barakah.pk', phone: '+92-311-5566778', status: 'active', commissionRate: 11, walletBalance: 125000, contactPerson: 'Mariam Siddiqui', city: 'Rawalpindi', createdAt: '2024-02-10', totalBookings: 89, address: 'Saddar Road, Rawalpindi', licenseNo: 'TRV-2024-005', agencyType: 'main' },
  { agencyId: 'a6', agencyName: 'Al Hijaz Johar Branch', email: 'johar@alhijaz.com', phone: '+92-300-1100220', status: 'active', commissionRate: 8, walletBalance: 15000, contactPerson: 'Adeel Raza', city: 'Lahore', createdAt: '2024-08-12', totalBookings: 9, address: 'Johar Town, Lahore', licenseNo: 'TRV-2024-001-B1', parentAgencyId: 'a1', agencyType: 'sub', ownerUserId: 'u9' },
];

// ─── Packages ───
export const mockPackages: UmrahPackage[] = [
  { packageId: 'p1', name: 'Economy Umrah', description: '7-night economy Umrah package with 3-star hotel accommodation', basePrice: 1200, duration: '7 nights', hotel: 'Al Madinah Hotel', city: 'Makkah & Madinah', status: 'active', includes: ['Flights', 'Hotel', 'Visa', 'Transport'], category: 'umrah', image: 'https://images.unsplash.com/photo-1565330770968-0240c0046ce3?w=900&h=580&fit=crop&q=80' },
  { packageId: 'p2', name: 'Standard Umrah', description: '10-night standard Umrah package with 4-star hotel', basePrice: 2200, duration: '10 nights', hotel: 'Hilton Suites Makkah', city: 'Makkah & Madinah', status: 'active', includes: ['Flights', 'Hotel', 'Visa', 'Transport', 'Meals', 'Guide'], category: 'umrah', image: 'https://images.unsplash.com/photo-1565552645632-d725f8bfc19a?w=900&h=580&fit=crop&q=80' },
  { packageId: 'p3', name: 'Premium Umrah', description: '14-night luxury Umrah package with 5-star hotel near Haram', basePrice: 4500, duration: '14 nights', hotel: 'Swissotel Al Maqam', city: 'Makkah & Madinah', status: 'active', includes: ['Flights', 'Hotel', 'Visa', 'VIP Transport', 'Meals', 'Private Guide', 'Ziyarat'], category: 'umrah', image: 'https://images.unsplash.com/photo-1580418827493-f2b22c0a76cb?w=900&h=580&fit=crop&q=80' },
  { packageId: 'p4', name: 'Ramadan Special', description: 'Special Ramadan Umrah package for the last 10 days', basePrice: 3800, duration: '12 nights', hotel: 'Pullman Zamzam', city: 'Makkah & Madinah', status: 'active', includes: ['Flights', 'Hotel', 'Visa', 'Transport', 'Iftar', 'Guide'], category: 'umrah', image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=900&h=580&fit=crop&q=80' },
  { packageId: 'p5', name: 'Family Umrah', description: 'Family-friendly Umrah package with spacious rooms', basePrice: 1800, duration: '10 nights', hotel: 'Movenpick Hotel', city: 'Makkah & Madinah', status: 'inactive', includes: ['Flights', 'Hotel', 'Visa', 'Transport', 'Kids Program'], category: 'umrah', image: 'https://images.unsplash.com/photo-1542816417-0983c9c9ad53?w=900&h=580&fit=crop&q=80' },
];

export const mockTourPackages: UmrahPackage[] = [
  { packageId: 't1', name: 'Turkey Explorer', description: '8-day guided tour of Istanbul, Cappadocia, and Pamukkale', basePrice: 1500, duration: '8 days', hotel: 'Grand Hyatt Istanbul', city: 'Istanbul & Cappadocia', status: 'active', includes: ['Flights', 'Hotel', 'Guided Tours', 'Breakfast', 'Transport'], category: 'tour', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=900&h=580&fit=crop&q=80' },
  { packageId: 't2', name: 'Dubai Luxury', description: '5-day luxury Dubai experience with desert safari', basePrice: 2800, duration: '5 days', hotel: 'Atlantis The Palm', city: 'Dubai', status: 'active', includes: ['Flights', 'Hotel', 'Desert Safari', 'City Tour', 'Meals'], category: 'tour', image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=900&h=580&fit=crop&q=80' },
  { packageId: 't3', name: 'Malaysia Adventure', description: '7-day Malaysia tour covering KL, Langkawi, and Penang', basePrice: 1100, duration: '7 days', hotel: 'Shangri-La KL', city: 'Kuala Lumpur & Langkawi', status: 'active', includes: ['Flights', 'Hotel', 'Tours', 'Transport'], category: 'tour', image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=900&h=580&fit=crop&q=80' },
  { packageId: 't4', name: 'Egypt Heritage', description: '10-day historical tour of Cairo, Luxor, and Aswan', basePrice: 1900, duration: '10 days', hotel: 'Marriott Mena House', city: 'Cairo & Luxor', status: 'inactive', includes: ['Flights', 'Hotel', 'Guide', 'Nile Cruise', 'Meals'], category: 'tour', image: 'https://images.unsplash.com/photo-1572252009286-268acec5ca0a?w=900&h=580&fit=crop&q=80' },
];

export const mockVisaPackages: UmrahPackage[] = [
  { packageId: 'v1', name: 'Saudi Visit Visa', description: 'Saudi Arabia tourist/visit visa processing', basePrice: 150, duration: '30 days', hotel: 'N/A', city: 'Saudi Arabia', status: 'active', includes: ['Visa Processing', 'Documentation', 'Support'], category: 'visa' },
  { packageId: 'v2', name: 'UAE Tourist Visa', description: 'UAE tourist visa with fast processing', basePrice: 120, duration: '30 days', hotel: 'N/A', city: 'UAE', status: 'active', includes: ['Visa Processing', 'Documentation', 'Travel Insurance'], category: 'visa' },
  { packageId: 'v3', name: 'Turkey E-Visa', description: 'Turkish e-visa assistance and processing', basePrice: 80, duration: '90 days', hotel: 'N/A', city: 'Turkey', status: 'active', includes: ['E-Visa Processing', 'Documentation'], category: 'visa' },
  { packageId: 'v4', name: 'Malaysia Visa', description: 'Malaysian visa processing for Pakistani nationals', basePrice: 100, duration: '30 days', hotel: 'N/A', city: 'Malaysia', status: 'active', includes: ['Visa Processing', 'Documentation', 'Support'], category: 'visa' },
];

// ─── Bookings ───
export const mockBookings: Booking[] = [
  { bookingId: 'b1', packageId: 'p2', packageName: 'Standard Umrah', customerName: 'Ali Raza', customerEmail: 'ali@gmail.com', type: 'b2c', status: 'confirmed', paymentType: 'stripe', totalAmount: 2200, commission: 0, travelers: 1, departureDate: '2025-04-15', createdAt: '2025-03-01' },
  { bookingId: 'b2', packageId: 'p3', packageName: 'Premium Umrah', customerName: 'Aisha Begum', customerEmail: 'aisha@gmail.com', agencyId: 'a1', agencyName: 'Al Hijaz Tours', type: 'b2b', status: 'confirmed', paymentType: 'wallet', totalAmount: 4500, commission: 540, travelers: 2, departureDate: '2025-05-01', createdAt: '2025-03-10' },
  { bookingId: 'b3', packageId: 'p1', packageName: 'Economy Umrah', customerName: 'Usman Sheikh', customerEmail: 'usman@yahoo.com', agencyId: 'a2', agencyName: 'Safar Tours', type: 'b2b', status: 'pending', paymentType: 'wallet', totalAmount: 1200, commission: 120, travelers: 3, departureDate: '2025-06-01', createdAt: '2025-03-15' },
  { bookingId: 'b4', packageId: 'p4', packageName: 'Ramadan Special', customerName: 'Khadija Noor', customerEmail: 'khadija@hotmail.com', type: 'b2c', status: 'completed', paymentType: 'stripe', totalAmount: 3800, commission: 0, travelers: 1, departureDate: '2025-03-20', createdAt: '2025-02-28' },
  { bookingId: 'b5', packageId: 'p2', packageName: 'Standard Umrah', customerName: 'Imran Hussain', customerEmail: 'imran@gmail.com', agencyId: 'a5', agencyName: 'Barakah Travels', type: 'b2b', status: 'cancelled', paymentType: 'wallet', totalAmount: 2200, commission: 242, travelers: 1, departureDate: '2025-05-15', createdAt: '2025-03-05' },
  { bookingId: 'b6', packageId: 'p1', packageName: 'Economy Umrah', customerName: 'Rabia Anwar', customerEmail: 'rabia@gmail.com', type: 'b2c', status: 'confirmed', paymentType: 'bank_transfer', totalAmount: 1200, commission: 0, travelers: 4, departureDate: '2025-07-01', createdAt: '2025-03-20' },
];

// ─── Transactions ───
export const mockTransactions: WalletTransaction[] = [
  { transactionId: 't1', agencyId: 'a1', agencyName: 'Al Hijaz Tours', type: 'credit', amount: 50000, description: 'Manual top-up', balanceAfter: 50000, createdAt: '2025-03-01' },
  { transactionId: 't2', agencyId: 'a1', agencyName: 'Al Hijaz Tours', type: 'debit', amount: 4500, description: 'Booking #b2 - Premium Umrah', balanceAfter: 45500, createdAt: '2025-03-10' },
  { transactionId: 't3', agencyId: 'a1', agencyName: 'Al Hijaz Tours', type: 'credit', amount: 540, description: 'Commission - Booking #b2', balanceAfter: 46040, createdAt: '2025-03-10' },
  { transactionId: 't4', agencyId: 'a2', agencyName: 'Safar Tours', type: 'credit', amount: 100000, description: 'Bank transfer top-up', balanceAfter: 100000, createdAt: '2025-02-15' },
  { transactionId: 't5', agencyId: 'a2', agencyName: 'Safar Tours', type: 'debit', amount: 3600, description: 'Booking #b3 - Economy Umrah (3 pax)', balanceAfter: 96400, createdAt: '2025-03-15' },
  { transactionId: 't6', agencyId: 'a5', agencyName: 'Barakah Travels', type: 'credit', amount: 150000, description: 'Stripe payment top-up', balanceAfter: 150000, createdAt: '2025-01-20' },
  { transactionId: 't7', agencyId: 'a5', agencyName: 'Barakah Travels', type: 'debit', amount: 2200, description: 'Booking #b5 - Standard Umrah', balanceAfter: 147800, createdAt: '2025-03-05' },
  { transactionId: 't8', agencyId: 'a5', agencyName: 'Barakah Travels', type: 'credit', amount: 2200, description: 'Refund - Booking #b5 cancelled', balanceAfter: 150000, createdAt: '2025-03-06' },
];

// ─── Notifications ───
export const mockNotifications: Notification[] = [
  { id: 'n1', title: 'New Agency Registration', message: 'Noor Travel Agency has submitted a registration request', type: 'agency', read: false, createdAt: '2025-03-28T10:30:00' },
  { id: 'n2', title: 'Booking Confirmed', message: 'Booking #b1 for Ali Raza has been confirmed', type: 'booking', read: false, createdAt: '2025-03-28T09:15:00' },
  { id: 'n3', title: 'Wallet Top-up', message: 'Barakah Travels added PKR 150,000 to their wallet', type: 'wallet', read: true, createdAt: '2025-03-27T16:00:00' },
  { id: 'n4', title: 'Payment Received', message: 'Stripe payment of $3,800 received for booking #b4', type: 'booking', read: true, createdAt: '2025-03-27T14:30:00' },
  { id: 'n5', title: 'System Update', message: 'Scheduled maintenance on April 1st from 2-4 AM', type: 'system', read: false, createdAt: '2025-03-26T11:00:00' },
];

// ─── Hotels ───
export const mockHotels: Hotel[] = [
  { hotelId: 'h1', name: 'Swissotel Al Maqam', city: 'Makkah', country: 'Saudi Arabia', starRating: 5, pricePerNight: 350, rooms: 1500, amenities: ['WiFi', 'Pool', 'Gym', 'Spa', 'Restaurant', 'Room Service'], status: 'active', image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=600&fit=crop&q=80' },
  { hotelId: 'h2', name: 'Hilton Suites Makkah', city: 'Makkah', country: 'Saudi Arabia', starRating: 4, pricePerNight: 220, rooms: 800, amenities: ['WiFi', 'Restaurant', 'Room Service', 'Laundry'], status: 'active', image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&h=600&fit=crop&q=80' },
  { hotelId: 'h3', name: 'Al Madinah Hotel', city: 'Madinah', country: 'Saudi Arabia', starRating: 3, pricePerNight: 120, rooms: 400, amenities: ['WiFi', 'Restaurant', 'Parking'], status: 'active', image: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&h=600&fit=crop&q=80' },
  { hotelId: 'h4', name: 'Pullman Zamzam', city: 'Makkah', country: 'Saudi Arabia', starRating: 5, pricePerNight: 400, rooms: 1200, amenities: ['WiFi', 'Pool', 'Gym', 'Spa', 'Multiple Restaurants', 'Concierge'], status: 'active', image: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&h=600&fit=crop&q=80' },
  { hotelId: 'h5', name: 'Movenpick Hotel', city: 'Madinah', country: 'Saudi Arabia', starRating: 4, pricePerNight: 180, rooms: 600, amenities: ['WiFi', 'Restaurant', 'Pool', 'Gym'], status: 'inactive', image: 'https://images.unsplash.com/photo-1445019980599-0354988e8f8a?w=800&h=600&fit=crop&q=80' },
  { hotelId: 'h6', name: 'Grand Hyatt Istanbul', city: 'Istanbul', country: 'Turkey', starRating: 5, pricePerNight: 280, rooms: 950, amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant', 'Bar', 'Gym'], status: 'active', image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=600&fit=crop&q=80' },
];

// ─── Flights ───
export const mockFlights: Flight[] = [
  { flightId: 'f1', airline: 'Saudi Airlines', flightNumber: 'SV-702', origin: 'Lahore (LHE)', destination: 'Jeddah (JED)', departureTime: '2025-04-15 08:00', arrivalTime: '2025-04-15 12:30', price: 450, seats: 280, status: 'scheduled', class: 'economy' },
  { flightId: 'f2', airline: 'PIA', flightNumber: 'PK-743', origin: 'Islamabad (ISB)', destination: 'Madinah (MED)', departureTime: '2025-04-16 22:00', arrivalTime: '2025-04-17 02:00', price: 380, seats: 300, status: 'scheduled', class: 'economy' },
  { flightId: 'f3', airline: 'Emirates', flightNumber: 'EK-623', origin: 'Karachi (KHI)', destination: 'Dubai (DXB)', departureTime: '2025-04-18 14:00', arrivalTime: '2025-04-18 16:30', price: 520, seats: 350, status: 'scheduled', class: 'business' },
  { flightId: 'f4', airline: 'Turkish Airlines', flightNumber: 'TK-715', origin: 'Lahore (LHE)', destination: 'Istanbul (IST)', departureTime: '2025-04-20 01:00', arrivalTime: '2025-04-20 07:00', price: 600, seats: 250, status: 'delayed', class: 'economy' },
  { flightId: 'f5', airline: 'Saudi Airlines', flightNumber: 'SV-704', origin: 'Karachi (KHI)', destination: 'Jeddah (JED)', departureTime: '2025-05-01 10:00', arrivalTime: '2025-05-01 14:30', price: 470, seats: 280, status: 'scheduled', class: 'economy' },
];

// ─── Coupons ───
export const mockCoupons: Coupon[] = [
  { couponId: 'c1', code: 'UMRAH10', description: '10% off on all Umrah packages', discountType: 'percentage', discountValue: 10, minOrder: 1000, maxUses: 100, usedCount: 34, validFrom: '2026-01-01', validUntil: '2026-12-31', status: 'active', applicableTo: 'umrah' },
  { couponId: 'c2', code: 'WELCOME50', description: '$50 off on first booking', discountType: 'fixed', discountValue: 50, minOrder: 500, maxUses: 200, usedCount: 89, validFrom: '2026-01-01', validUntil: '2026-12-31', status: 'active', applicableTo: 'all' },
  { couponId: 'c3', code: 'RAMADAN15', description: '15% off on Ramadan packages', discountType: 'percentage', discountValue: 15, minOrder: 2000, maxUses: 50, usedCount: 50, validFrom: '2025-02-01', validUntil: '2025-03-31', status: 'expired', applicableTo: 'umrah' },
  { couponId: 'c4', code: 'TOUR20', description: '20% off on all tour packages', discountType: 'percentage', discountValue: 20, minOrder: 800, maxUses: 75, usedCount: 12, validFrom: '2026-01-01', validUntil: '2026-09-30', status: 'active', applicableTo: 'tour' },
  { couponId: 'c5', code: 'VISA25', description: '$25 off on visa processing', discountType: 'fixed', discountValue: 25, minOrder: 100, maxUses: 500, usedCount: 145, validFrom: '2026-01-01', validUntil: '2026-12-31', status: 'active', applicableTo: 'visa' },
];

// ─── Blog Posts ───
export const mockBlogPosts: BlogPost[] = [
  { postId: 'bp1', title: 'Complete Umrah Guide 2026', slug: 'complete-umrah-guide-2026', excerpt: 'Everything you need to know about performing Umrah in 2026', content: 'Full article content here...', author: 'Ahmed Khan', category: 'Umrah', status: 'published', publishedAt: '2026-04-12', tags: ['umrah', 'guide', 'saudi'], image: 'https://images.unsplash.com/photo-1565330770968-0240c0046ce3?w=800&h=520&fit=crop&q=80' },
  { postId: 'bp2', title: 'Top 10 Hotels Near Haram', slug: 'top-10-hotels-near-haram', excerpt: 'Our curated list of the best hotels within walking distance of Masjid al-Haram', content: 'Full article content here...', author: 'Sara Ali', category: 'Hotels', status: 'published', publishedAt: '2026-03-22', tags: ['hotels', 'makkah', 'haram'], image: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&h=520&fit=crop&q=80' },
  { postId: 'bp3', title: 'Visa Requirements for Saudi Arabia', slug: 'visa-requirements-saudi', excerpt: 'Updated visa requirements and process for Pakistani travelers', content: 'Full article content here...', author: 'Ahmed Khan', category: 'Visa', status: 'published', publishedAt: '2026-02-18', tags: ['visa', 'saudi', 'requirements'], image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&h=520&fit=crop&q=80' },
  { postId: 'bp4', title: 'Best Time to Visit Turkey', slug: 'best-time-visit-turkey', excerpt: 'Planning a trip to Turkey? Here is the ideal timing for different activities', content: 'Full article content here...', author: 'Sara Ali', category: 'Tours', status: 'draft', publishedAt: '', tags: ['turkey', 'tours', 'travel-tips'], image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&h=520&fit=crop&q=80' },
];

// ─── Travel Tickets ───
export const mockTickets: TravelTicket[] = [
  { ticketId: 'tk1', bookingId: 'b1', passengerName: 'Ali Raza', type: 'flight', origin: 'Lahore', destination: 'Jeddah', departureDate: '2025-04-15', seatNumber: '24A', status: 'issued', price: 450, ticketNumber: 'SV-702-24A' },
  { ticketId: 'tk2', bookingId: 'b2', passengerName: 'Aisha Begum', type: 'flight', origin: 'Islamabad', destination: 'Madinah', departureDate: '2025-05-01', seatNumber: '12B', status: 'issued', price: 380, ticketNumber: 'PK-743-12B' },
  { ticketId: 'tk3', bookingId: 'b2', passengerName: 'Aisha Begum', type: 'bus', origin: 'Madinah', destination: 'Makkah', departureDate: '2025-05-04', seatNumber: '5', status: 'pending', price: 30, ticketNumber: 'BUS-MM-005' },
  { ticketId: 'tk4', bookingId: 'b3', passengerName: 'Usman Sheikh', type: 'flight', origin: 'Karachi', destination: 'Jeddah', departureDate: '2025-06-01', seatNumber: '18C', status: 'pending', price: 470, ticketNumber: 'SV-704-18C' },
  { ticketId: 'tk5', bookingId: 'b4', passengerName: 'Khadija Noor', type: 'flight', origin: 'Lahore', destination: 'Jeddah', departureDate: '2025-03-20', seatNumber: '8A', status: 'used', price: 450, ticketNumber: 'SV-702-8A' },
  { ticketId: 'tk6', bookingId: 'b5', passengerName: 'Imran Hussain', type: 'flight', origin: 'Islamabad', destination: 'Jeddah', departureDate: '2025-05-15', seatNumber: '15D', status: 'cancelled', price: 400, ticketNumber: 'PK-745-15D' },
];

// ─── Module Permissions ───
export const availableModules: ModulePermission[] = [
  { moduleId: 'dashboard', moduleName: 'Dashboard', description: 'View system dashboard and analytics', icon: 'LayoutDashboard' },
  { moduleId: 'agencies', moduleName: 'Agencies', description: 'Manage travel agencies', icon: 'Building2' },
  { moduleId: 'packages', moduleName: 'Umrah Packages', description: 'Manage Umrah packages', icon: 'Package' },
  { moduleId: 'tours', moduleName: 'Tour Packages', description: 'Manage tour packages', icon: 'Map' },
  { moduleId: 'visa', moduleName: 'Visa Packages', description: 'Manage visa services', icon: 'FileCheck' },
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

// ─── Dashboard Stats ───
export const dashboardStats = {
  totalBookings: 156,
  totalRevenue: 342500,
  activeAgencies: 3,
  pendingApprovals: 1,
  monthlyBookings: [
    { month: 'Oct', bookings: 12, revenue: 28000 },
    { month: 'Nov', bookings: 18, revenue: 42000 },
    { month: 'Dec', bookings: 25, revenue: 58000 },
    { month: 'Jan', bookings: 30, revenue: 72000 },
    { month: 'Feb', bookings: 35, revenue: 78000 },
    { month: 'Mar', bookings: 36, revenue: 64500 },
  ],
  bookingsByType: [
    { name: 'B2C (Direct)', value: 65 },
    { name: 'B2B (Agency)', value: 91 },
  ],
  recentActivity: [
    { action: 'New booking', detail: 'Ali Raza booked Standard Umrah', time: '2 hours ago' },
    { action: 'Agency approved', detail: 'Barakah Travels activated', time: '5 hours ago' },
    { action: 'Wallet top-up', detail: 'Safar Tours added PKR 100,000', time: '1 day ago' },
    { action: 'Package updated', detail: 'Ramadan Special price changed', time: '2 days ago' },
  ],
};

export const agencyDashboardStats = {
  walletBalance: 45000,
  totalBookings: 34,
  commissionEarned: 4200,
  pendingBookings: 3,
  monthlyBookings: [
    { month: 'Oct', bookings: 3, revenue: 5400 },
    { month: 'Nov', bookings: 5, revenue: 9200 },
    { month: 'Dec', bookings: 7, revenue: 14000 },
    { month: 'Jan', bookings: 6, revenue: 11400 },
    { month: 'Feb', bookings: 8, revenue: 16500 },
    { month: 'Mar', bookings: 5, revenue: 10200 },
  ],
};

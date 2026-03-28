// Mock data for Travelian Admin Panel

export type UserRole = 'super_admin' | 'admin' | 'staff' | 'agency_owner' | 'agency_staff';
export type AgencyStatus = 'pending' | 'active' | 'suspended' | 'rejected';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type BookingType = 'b2c' | 'b2b';
export type TransactionType = 'credit' | 'debit';

export interface User {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  agencyId?: string;
  status: 'active' | 'inactive';
  createdAt: string;
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

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'booking' | 'wallet' | 'agency' | 'system';
  read: boolean;
  createdAt: string;
}

export const mockUsers: User[] = [
  { userId: 'u1', name: 'Ahmed Khan', email: 'ahmed@travelian.com', role: 'super_admin', status: 'active', createdAt: '2024-01-15' },
  { userId: 'u2', name: 'Sara Ali', email: 'sara@travelian.com', role: 'admin', status: 'active', createdAt: '2024-02-10' },
  { userId: 'u3', name: 'Omar Farooq', email: 'omar@travelian.com', role: 'staff', status: 'active', createdAt: '2024-03-05' },
  { userId: 'u4', name: 'Fatima Zahra', email: 'fatima@alhijaz.com', role: 'agency_owner', agencyId: 'a1', status: 'active', createdAt: '2024-04-01' },
  { userId: 'u5', name: 'Hassan Raza', email: 'hassan@alhijaz.com', role: 'agency_staff', agencyId: 'a1', status: 'active', createdAt: '2024-04-15' },
  { userId: 'u6', name: 'Zainab Malik', email: 'zainab@safartours.com', role: 'agency_owner', agencyId: 'a2', status: 'active', createdAt: '2024-05-01' },
];

export const mockAgencies: Agency[] = [
  { agencyId: 'a1', agencyName: 'Al Hijaz Tours', email: 'info@alhijaz.com', phone: '+92-300-1234567', status: 'active', commissionRate: 12, walletBalance: 45000, contactPerson: 'Fatima Zahra', city: 'Lahore', createdAt: '2024-04-01', totalBookings: 34 },
  { agencyId: 'a2', agencyName: 'Safar Tours', email: 'info@safartours.com', phone: '+92-321-7654321', status: 'active', commissionRate: 10, walletBalance: 78500, contactPerson: 'Zainab Malik', city: 'Karachi', createdAt: '2024-05-01', totalBookings: 56 },
  { agencyId: 'a3', agencyName: 'Noor Travel Agency', email: 'noor@noortravel.com', phone: '+92-333-9876543', status: 'pending', commissionRate: 8, walletBalance: 0, contactPerson: 'Bilal Ahmed', city: 'Islamabad', createdAt: '2024-06-15', totalBookings: 0 },
  { agencyId: 'a4', agencyName: 'Madinah Express', email: 'contact@madinah-express.com', phone: '+92-345-1122334', status: 'suspended', commissionRate: 15, walletBalance: 12000, contactPerson: 'Asad Iqbal', city: 'Faisalabad', createdAt: '2024-03-20', totalBookings: 12 },
  { agencyId: 'a5', agencyName: 'Barakah Travels', email: 'hello@barakah.pk', phone: '+92-311-5566778', status: 'active', commissionRate: 11, walletBalance: 125000, contactPerson: 'Mariam Siddiqui', city: 'Rawalpindi', createdAt: '2024-02-10', totalBookings: 89 },
];

export const mockPackages: UmrahPackage[] = [
  { packageId: 'p1', name: 'Economy Umrah', description: '7-night economy Umrah package with 3-star hotel accommodation', basePrice: 1200, duration: '7 nights', hotel: 'Al Madinah Hotel', city: 'Makkah & Madinah', status: 'active', includes: ['Flights', 'Hotel', 'Visa', 'Transport'] },
  { packageId: 'p2', name: 'Standard Umrah', description: '10-night standard Umrah package with 4-star hotel', basePrice: 2200, duration: '10 nights', hotel: 'Hilton Suites Makkah', city: 'Makkah & Madinah', status: 'active', includes: ['Flights', 'Hotel', 'Visa', 'Transport', 'Meals', 'Guide'] },
  { packageId: 'p3', name: 'Premium Umrah', description: '14-night luxury Umrah package with 5-star hotel near Haram', basePrice: 4500, duration: '14 nights', hotel: 'Swissotel Al Maqam', city: 'Makkah & Madinah', status: 'active', includes: ['Flights', 'Hotel', 'Visa', 'VIP Transport', 'Meals', 'Private Guide', 'Ziyarat'] },
  { packageId: 'p4', name: 'Ramadan Special', description: 'Special Ramadan Umrah package for the last 10 days', basePrice: 3800, duration: '12 nights', hotel: 'Pullman Zamzam', city: 'Makkah & Madinah', status: 'active', includes: ['Flights', 'Hotel', 'Visa', 'Transport', 'Iftar', 'Guide'] },
  { packageId: 'p5', name: 'Family Umrah', description: 'Family-friendly Umrah package with spacious rooms', basePrice: 1800, duration: '10 nights', hotel: 'Movenpick Hotel', city: 'Makkah & Madinah', status: 'inactive', includes: ['Flights', 'Hotel', 'Visa', 'Transport', 'Kids Program'] },
];

export const mockBookings: Booking[] = [
  { bookingId: 'b1', packageId: 'p2', packageName: 'Standard Umrah', customerName: 'Ali Raza', customerEmail: 'ali@gmail.com', type: 'b2c', status: 'confirmed', paymentType: 'stripe', totalAmount: 2200, commission: 0, travelers: 1, departureDate: '2025-04-15', createdAt: '2025-03-01' },
  { bookingId: 'b2', packageId: 'p3', packageName: 'Premium Umrah', customerName: 'Aisha Begum', customerEmail: 'aisha@gmail.com', agencyId: 'a1', agencyName: 'Al Hijaz Tours', type: 'b2b', status: 'confirmed', paymentType: 'wallet', totalAmount: 4500, commission: 540, travelers: 2, departureDate: '2025-05-01', createdAt: '2025-03-10' },
  { bookingId: 'b3', packageId: 'p1', packageName: 'Economy Umrah', customerName: 'Usman Sheikh', customerEmail: 'usman@yahoo.com', agencyId: 'a2', agencyName: 'Safar Tours', type: 'b2b', status: 'pending', paymentType: 'wallet', totalAmount: 1200, commission: 120, travelers: 3, departureDate: '2025-06-01', createdAt: '2025-03-15' },
  { bookingId: 'b4', packageId: 'p4', packageName: 'Ramadan Special', customerName: 'Khadija Noor', customerEmail: 'khadija@hotmail.com', type: 'b2c', status: 'completed', paymentType: 'stripe', totalAmount: 3800, commission: 0, travelers: 1, departureDate: '2025-03-20', createdAt: '2025-02-28' },
  { bookingId: 'b5', packageId: 'p2', packageName: 'Standard Umrah', customerName: 'Imran Hussain', customerEmail: 'imran@gmail.com', agencyId: 'a5', agencyName: 'Barakah Travels', type: 'b2b', status: 'cancelled', paymentType: 'wallet', totalAmount: 2200, commission: 242, travelers: 1, departureDate: '2025-05-15', createdAt: '2025-03-05' },
  { bookingId: 'b6', packageId: 'p1', packageName: 'Economy Umrah', customerName: 'Rabia Anwar', customerEmail: 'rabia@gmail.com', type: 'b2c', status: 'confirmed', paymentType: 'bank_transfer', totalAmount: 1200, commission: 0, travelers: 4, departureDate: '2025-07-01', createdAt: '2025-03-20' },
];

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

export const mockNotifications: Notification[] = [
  { id: 'n1', title: 'New Agency Registration', message: 'Noor Travel Agency has submitted a registration request', type: 'agency', read: false, createdAt: '2025-03-28T10:30:00' },
  { id: 'n2', title: 'Booking Confirmed', message: 'Booking #b1 for Ali Raza has been confirmed', type: 'booking', read: false, createdAt: '2025-03-28T09:15:00' },
  { id: 'n3', title: 'Wallet Top-up', message: 'Barakah Travels added PKR 150,000 to their wallet', type: 'wallet', read: true, createdAt: '2025-03-27T16:00:00' },
  { id: 'n4', title: 'Payment Received', message: 'Stripe payment of $3,800 received for booking #b4', type: 'booking', read: true, createdAt: '2025-03-27T14:30:00' },
  { id: 'n5', title: 'System Update', message: 'Scheduled maintenance on April 1st from 2-4 AM', type: 'system', read: false, createdAt: '2025-03-26T11:00:00' },
];

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

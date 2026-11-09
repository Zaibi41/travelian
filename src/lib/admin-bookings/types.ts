// Admin Bookings types, generated from the gateway OpenAPI schema
// (src/lib/gateway/schema.d.ts; regenerate with `npm run api:types`).

import type { components, operations } from "@/lib/gateway/schema";

type Schemas = components["schemas"];

export type BookingList = Schemas["BookingList"];
export type BookingListItem = Schemas["BookingListItem"];
export type BookingListCards = Schemas["BookingListCards"];
export type BookingDetail = Schemas["BookingDetail"];
export type BookingMoney = Schemas["BookingMoney"];
export type BookingStatuses = Schemas["BookingStatuses"];

type ListParams = NonNullable<operations["list_bookings_v1_admin_bookings_get"]["parameters"]["query"]>;
export type BookingListParams = ListParams;
export type BookingStatus = NonNullable<ListParams["booking_status"]>;
export type PaymentStatus = NonNullable<ListParams["payment_status"]>;
export type IssuanceStatus = NonNullable<ListParams["issuance_status"]>;
export type BookingPeriod = NonNullable<ListParams["period"]>;
export type BookingProduct = NonNullable<ListParams["product"]>;
export type BookingCard = NonNullable<ListParams["card"]>;

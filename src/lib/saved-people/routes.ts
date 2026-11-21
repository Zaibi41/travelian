// Customers & Travelers URLs. Each tab is its own path; the search stays in ?q= across tabs.

export interface CustomersTab {
  slug: "" | "travelers" | "communications";
  label: string;
}

export const CUSTOMERS_TABS: CustomersTab[] = [
  { slug: "", label: "Customers" },
  { slug: "travelers", label: "Travelers" },
  { slug: "communications", label: "Communications" },
];

export function customersTabPath(tab: CustomersTab, q = "") {
  const path = tab.slug ? `/admin/customers/${tab.slug}` : "/admin/customers";
  return q.trim() ? `${path}?${new URLSearchParams({ q: q.trim() }).toString()}` : path;
}

export const personPath = (personId: string) => `/admin/customers/people/${encodeURIComponent(personId)}`;

export type OrderRow = {
  orderId: string;
  customer: string;
  region: "North" | "South" | "East" | "West";
  category: string;
  product: string;
  quantity: number;
  unitPrice: number;
  orderDate: string;
  status: "completed" | "refunded" | "pending";
};

export const DEMO_SCHEMA_DESCRIPTION =
  "orders(order_id text primary key, customer text, region text, category text, " +
  "product text, quantity integer, unit_price numeric, order_date date, status text)";

export const DEMO_ORDERS: OrderRow[] = [
  { orderId: "ORD-1001", customer: "Alice Chen", region: "West", category: "Electronics", product: "Wireless Mouse", quantity: 2, unitPrice: 24.99, orderDate: "2026-01-08", status: "completed" },
  { orderId: "ORD-1002", customer: "Marcus Lee", region: "East", category: "Home", product: "Desk Lamp", quantity: 1, unitPrice: 34.5, orderDate: "2026-01-14", status: "completed" },
  { orderId: "ORD-1003", customer: "Priya Nair", region: "North", category: "Electronics", product: "USB-C Hub", quantity: 3, unitPrice: 19.99, orderDate: "2026-01-19", status: "completed" },
  { orderId: "ORD-1004", customer: "Diego Ruiz", region: "South", category: "Apparel", product: "Rain Jacket", quantity: 1, unitPrice: 89.0, orderDate: "2026-01-22", status: "refunded" },
  { orderId: "ORD-1005", customer: "Alice Chen", region: "West", category: "Home", product: "Ceramic Mug Set", quantity: 2, unitPrice: 22.0, orderDate: "2026-02-02", status: "completed" },
  { orderId: "ORD-1006", customer: "Sofia Petrova", region: "East", category: "Electronics", product: "Bluetooth Speaker", quantity: 1, unitPrice: 59.99, orderDate: "2026-02-05", status: "completed" },
  { orderId: "ORD-1007", customer: "James Okafor", region: "North", category: "Apparel", product: "Wool Sweater", quantity: 2, unitPrice: 64.0, orderDate: "2026-02-11", status: "completed" },
  { orderId: "ORD-1008", customer: "Marcus Lee", region: "East", category: "Electronics", product: "Wireless Mouse", quantity: 1, unitPrice: 24.99, orderDate: "2026-02-17", status: "pending" },
  { orderId: "ORD-1009", customer: "Priya Nair", region: "North", category: "Home", product: "Desk Lamp", quantity: 1, unitPrice: 34.5, orderDate: "2026-02-23", status: "completed" },
  { orderId: "ORD-1010", customer: "Diego Ruiz", region: "South", category: "Electronics", product: "USB-C Hub", quantity: 4, unitPrice: 19.99, orderDate: "2026-03-01", status: "completed" },
  { orderId: "ORD-1011", customer: "Noor Haddad", region: "West", category: "Apparel", product: "Rain Jacket", quantity: 1, unitPrice: 89.0, orderDate: "2026-03-06", status: "completed" },
  { orderId: "ORD-1012", customer: "Sofia Petrova", region: "East", category: "Home", product: "Ceramic Mug Set", quantity: 3, unitPrice: 22.0, orderDate: "2026-03-09", status: "completed" },
  { orderId: "ORD-1013", customer: "James Okafor", region: "North", category: "Electronics", product: "Bluetooth Speaker", quantity: 1, unitPrice: 59.99, orderDate: "2026-03-15", status: "refunded" },
  { orderId: "ORD-1014", customer: "Alice Chen", region: "West", category: "Electronics", product: "USB-C Hub", quantity: 2, unitPrice: 19.99, orderDate: "2026-03-20", status: "completed" },
  { orderId: "ORD-1015", customer: "Noor Haddad", region: "West", category: "Home", product: "Desk Lamp", quantity: 1, unitPrice: 34.5, orderDate: "2026-03-25", status: "completed" },
  { orderId: "ORD-1016", customer: "Diego Ruiz", region: "South", category: "Apparel", product: "Wool Sweater", quantity: 1, unitPrice: 64.0, orderDate: "2026-04-02", status: "completed" },
  { orderId: "ORD-1017", customer: "Marcus Lee", region: "East", category: "Apparel", product: "Rain Jacket", quantity: 1, unitPrice: 89.0, orderDate: "2026-04-08", status: "completed" },
  { orderId: "ORD-1018", customer: "Priya Nair", region: "North", category: "Home", product: "Ceramic Mug Set", quantity: 2, unitPrice: 22.0, orderDate: "2026-04-14", status: "completed" },
  { orderId: "ORD-1019", customer: "Sofia Petrova", region: "East", category: "Electronics", product: "Wireless Mouse", quantity: 3, unitPrice: 24.99, orderDate: "2026-04-19", status: "completed" },
  { orderId: "ORD-1020", customer: "James Okafor", region: "North", category: "Apparel", product: "Rain Jacket", quantity: 1, unitPrice: 89.0, orderDate: "2026-04-25", status: "pending" },
  { orderId: "ORD-1021", customer: "Noor Haddad", region: "West", category: "Electronics", product: "Bluetooth Speaker", quantity: 2, unitPrice: 59.99, orderDate: "2026-05-03", status: "completed" },
  { orderId: "ORD-1022", customer: "Diego Ruiz", region: "South", category: "Home", product: "Desk Lamp", quantity: 1, unitPrice: 34.5, orderDate: "2026-05-09", status: "completed" },
  { orderId: "ORD-1023", customer: "Alice Chen", region: "West", category: "Apparel", product: "Wool Sweater", quantity: 1, unitPrice: 64.0, orderDate: "2026-05-14", status: "completed" },
  { orderId: "ORD-1024", customer: "Marcus Lee", region: "East", category: "Home", product: "Ceramic Mug Set", quantity: 2, unitPrice: 22.0, orderDate: "2026-05-20", status: "completed" },
];

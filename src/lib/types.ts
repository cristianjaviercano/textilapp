export type Product = {
  id: string;
  reference: string;
  description: string;
  family: string;
  process: string;
  consecutive: number;
  operation: string;
  machine: string;
  sam: number; // SAM-MINUTOS
};

export type OrderItem = {
  reference: string; // product reference
  quantity: number;
};

export type ProductionOrder = {
  id: string;
  clientName: string;
  deliveryDate: string;
  priority: number; // 1-5
  items: OrderItem[];
};

export type Task = {
  id: string; // e.g., `${order.id}-${product.reference}-${operation.id}`
  orderId: string;
  productDescription: string; // prenda
  operation: string;
  totalSam: number; // samRequeridoTotal
};

export type Operative = {
  id: string; // e.g., "Operative 1"
  availableTime: number; // tiempoDisponible
};

export type Assignment = {
  operativeId: string;
  taskId: string;
  assignedSam: number;
};

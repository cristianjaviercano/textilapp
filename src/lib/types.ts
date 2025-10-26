export type Product = {
  id: string;
  referencia: string;
  descripcion: string;
  familia: string;
  proceso: string;
  consecutivo: number;
  operacion: string;
  maquina: string;
  sam: number; // SAM-MINUTOS
};

export type OrderItem = {
  referencia: string; // product reference
  cantidad: number;
};

export type ProductStats = {
  descripcion: string;
  totalSam: number;
  loteSize: number;
  unitsPerHour: number;
  unitsPerDay: number;
};

export type AssignmentData = Record<string, Record<string, number>>;

export type ProductionOrder = {
  id: string;
  nombreCliente: string;
  fechaEntrega: string;
  prioridad: number; // 1-5
  items: OrderItem[];
  stats?: ProductStats[];
  assignments?: AssignmentData;
};

export type Task = {
  id: string; // e.g., `${order.id}-${product.referencia}-${operation.id}`
  orderId: string;
  productDescription: string; // prenda
  operation: string;
  unitSam: number;
  consecutivo: number;
  maquina: string;
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

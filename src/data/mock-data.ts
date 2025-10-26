import type { Product, ProductionOrder } from '@/lib/types';

export const mockProducts: Product[] = [];

export const mockOrders: ProductionOrder[] = [
  { id: 'ORD-001', nombreCliente: 'Fashion Co.', fechaEntrega: '2024-08-15', prioridad: 2, items: [{ referencia: '14921', cantidad: 100 }] },
  { id: 'ORD-002', nombreCliente: 'Gigante Minorista', fechaEntrega: '2024-08-20', prioridad: 1, items: [{ referencia: '16534', cantidad: 50 }] },
  { id: 'ORD-003', nombreCliente: 'Tienda Boutique', fechaEntrega: '2024-08-18', prioridad: 3, items: [{ referencia: '18673', cantidad: 75 }, { referencia: '13456', cantidad: 25 }] },
];

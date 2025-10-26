import type { Product, ProductionOrder } from '@/lib/types';

export const mockProducts: Product[] = [
  { id: 'p1', reference: 'REF001', description: 'T-Shirt', family: 'Tops', process: 'P01', consecutive: 1, operation: 'Cut Fabric', machine: 'Cutter', sam: 5.5 },
  { id: 'p2', reference: 'REF001', description: 'T-Shirt', family: 'Tops', process: 'P01', consecutive: 2, operation: 'Sew Sleeves', machine: 'Sewing M1', sam: 8.2 },
  { id: 'p3', reference: 'REF001', description: 'T-Shirt', family: 'Tops', process: 'P01', consecutive: 3, operation: 'Attach Collar', machine: 'Sewing M2', sam: 4.1 },
  { id: 'p4', reference: 'REF002', description: 'Jeans', family: 'Bottoms', process: 'P02', consecutive: 1, operation: 'Cut Denim', machine: 'Cutter', sam: 7.0 },
  { id: 'p5', reference: 'REF002', description: 'Jeans', family: 'Bottoms', process: 'P02', consecutive: 2, operation: 'Sew Legs', machine: 'Heavy-Duty S1', sam: 15.3 },
  { id: 'p6', reference: 'REF002', description: 'Jeans', family: 'Bottoms', process: 'P02', consecutive: 3, operation: 'Add Pockets', machine: 'Heavy-Duty S2', sam: 12.8 },
  { id: 'p7', reference: 'REF003', description: 'Polo Shirt', family: 'Tops', process: 'P03', consecutive: 1, operation: 'Cut Fabric', machine: 'Cutter', sam: 6.0 },
  { id: 'p8', reference: 'REF003', description: 'Polo Shirt', family: 'Tops', process: 'P03', consecutive: 2, operation: 'Sew Body', machine: 'Sewing M1', sam: 9.5 },
];

export const mockOrders: ProductionOrder[] = [
  { id: 'ORD-001', clientName: 'Fashion Co.', deliveryDate: '2024-08-15', priority: 2, items: [{ reference: 'REF001', quantity: 100 }] },
  { id: 'ORD-002', clientName: 'Retail Giant', deliveryDate: '2024-08-20', priority: 1, items: [{ reference: 'REF002', quantity: 50 }] },
  { id: 'ORD-003', clientName: 'Boutique Store', deliveryDate: '2024-08-18', priority: 3, items: [{ reference: 'REF003', quantity: 75 }, { reference: 'REF001', quantity: 25 }] },
];

import type { Product, ProductionOrder } from '@/lib/types';

export const mockProducts: Product[] = [
  { id: 'p1', referencia: 'REF001', descripcion: 'Camiseta', familia: 'Prendas Superiores', proceso: 'P01', consecutivo: 1, operacion: 'Cortar Tela', maquina: 'Cortadora', sam: 5.5 },
  { id: 'p2', referencia: 'REF001', descripcion: 'Camiseta', familia: 'Prendas Superiores', proceso: 'P01', consecutivo: 2, operacion: 'Coser Mangas', maquina: 'Máquina de Coser M1', sam: 8.2 },
  { id: 'p3', referencia: 'REF001', descripcion: 'Camiseta', familia: 'Prendas Superiores', proceso: 'P01', consecutivo: 3, operacion: 'Unir Cuello', maquina: 'Máquina de Coser M2', sam: 4.1 },
  { id: 'p4', referencia: 'REF002', descripcion: 'Jeans', familia: 'Prendas Inferiores', proceso: 'P02', consecutivo: 1, operacion: 'Cortar Denim', maquina: 'Cortadora', sam: 7.0 },
  { id: 'p5', referencia: 'REF002', descripcion: 'Jeans', familia: 'Prendas Inferiores', proceso: 'P02', consecutivo: 2, operacion: 'Coser Piernas', maquina: 'Máquina Pesada S1', sam: 15.3 },
  { id: 'p6', referencia: 'REF002', descripcion: 'Jeans', familia: 'Prendas Inferiores', proceso: 'P02', consecutivo: 3, operacion: 'Añadir Bolsillos', maquina: 'Máquina Pesada S2', sam: 12.8 },
  { id: 'p7', referencia: 'REF003', descripcion: 'Polo', familia: 'Prendas Superiores', proceso: 'P03', consecutivo: 1, operacion: 'Cortar Tela', maquina: 'Cortadora', sam: 6.0 },
  { id: 'p8', referencia: 'REF003', descripcion: 'Polo', familia: 'Prendas Superiores', proceso: 'P03', consecutivo: 2, operacion: 'Coser Cuerpo', maquina: 'Máquina de Coser M1', sam: 9.5 },
];

export const mockOrders: ProductionOrder[] = [
  { id: 'ORD-001', nombreCliente: 'Fashion Co.', fechaEntrega: '2024-08-15', prioridad: 2, items: [{ referencia: 'REF001', cantidad: 100 }] },
  { id: 'ORD-002', nombreCliente: 'Gigante Minorista', fechaEntrega: '2024-08-20', prioridad: 1, items: [{ referencia: 'REF002', cantidad: 50 }] },
  { id: 'ORD-003', nombreCliente: 'Tienda Boutique', fechaEntrega: '2024-08-18', prioridad: 3, items: [{ referencia: 'REF003', cantidad: 75 }, { referencia: 'REF001', cantidad: 25 }] },
];

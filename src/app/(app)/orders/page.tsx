"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { mockOrders, mockProducts } from "@/data/mock-data";
import type { ProductionOrder, OrderItem } from "@/lib/types";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const initialOrderState: Omit<ProductionOrder, "id"> = {
  nombreCliente: "",
  fechaEntrega: "",
  prioridad: 3,
  items: [],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>(mockOrders);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Partial<ProductionOrder> | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ProductionOrder | null>(null);
  
  const productReferences = useMemo(() => {
    const refs = mockProducts.map(p => p.referencia);
    return [...new Set(refs)];
  }, []);

  const isEditing = currentOrder && currentOrder.id;

  const handleOpenDialog = (order?: ProductionOrder) => {
    setCurrentOrder(order || initialOrderState);
    setIsDialogOpen(true);
  };
  
  const handleAddItem = () => {
    if (currentOrder && currentOrder.items) {
      const newItem: OrderItem = { referencia: '', cantidad: 1 };
      setCurrentOrder({ ...currentOrder, items: [...currentOrder.items, newItem] });
    }
  };

  const handleRemoveItem = (index: number) => {
    if (currentOrder && currentOrder.items) {
      const newItems = [...currentOrder.items];
      newItems.splice(index, 1);
      setCurrentOrder({ ...currentOrder, items: newItems });
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    if (currentOrder && currentOrder.items) {
      const newItems = [...currentOrder.items];
      (newItems[index] as any)[field] = value;
      setCurrentOrder({ ...currentOrder, items: newItems });
    }
  };

  const handleSaveChanges = () => {
    if (!currentOrder) return;
    if (isEditing) {
      setOrders(orders.map((o) => (o.id === currentOrder.id ? (currentOrder as ProductionOrder) : o)));
    } else {
      const newOrder: ProductionOrder = { ...currentOrder, id: `ORD-${Date.now()}` } as ProductionOrder;
      setOrders([newOrder, ...orders]);
    }
    setIsDialogOpen(false);
    setCurrentOrder(null);
  };
  
  const handleOpenAlert = (order: ProductionOrder) => {
    setOrderToDelete(order);
    setIsAlertOpen(true);
  };

  const handleDeleteOrder = () => {
    if (orderToDelete) {
      setOrders(orders.filter((o) => o.id !== orderToDelete.id));
      setIsAlertOpen(false);
      setOrderToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Órdenes de Producción</h1>
          <p className="text-muted-foreground">Crear y gestionar órdenes de clientes.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2" />
          Añadir Orden
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Orden</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Fecha Entrega</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.nombreCliente}</TableCell>
                <TableCell>{order.items.reduce((acc, item) => acc + item.cantidad, 0)}</TableCell>
                <TableCell>{order.fechaEntrega}</TableCell>
                <TableCell><Badge variant="secondary">{order.prioridad}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(order)}><Pencil className="mr-2 h-4 w-4"/> Editar</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAlert(order)} className="text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4"/> Borrar</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Orden" : "Añadir Nueva Orden"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Nombre Cliente</Label><Input value={currentOrder?.nombreCliente || ''} onChange={(e) => setCurrentOrder({...currentOrder, nombreCliente: e.target.value })} /></div>
            <div className="space-y-2"><Label>Fecha Entrega</Label><Input type="date" value={currentOrder?.fechaEntrega || ''} onChange={(e) => setCurrentOrder({...currentOrder, fechaEntrega: e.target.value })} /></div>
            <div className="space-y-2"><Label>Prioridad</Label><Input type="number" min="1" max="5" value={currentOrder?.prioridad || 3} onChange={(e) => setCurrentOrder({...currentOrder, prioridad: parseInt(e.target.value) })} /></div>
          </div>
          <div>
            <h3 className="mb-2 font-medium">Items de la Orden</h3>
            <div className="space-y-2">
              {currentOrder?.items?.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select value={item.referencia} onValueChange={(value) => handleItemChange(index, 'referencia', value)}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar Producto" /></SelectTrigger>
                    <SelectContent>
                      {productReferences.map(ref => <SelectItem key={ref} value={ref}>{ref}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" min="1" placeholder="Cant" className="w-24" value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value))} />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Item</Button>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esto eliminará permanentemente la orden <span className="font-bold">{orderToDelete?.id}</span>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

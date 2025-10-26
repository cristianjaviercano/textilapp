"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { mockProducts } from "@/data/mock-data";
import type { ProductionOrder, OrderItem } from "@/lib/types";
import { PlusCircle, MoreHorizontal, Pencil, Trash2, X, Save, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { saveOrdersData } from "./actions";
import initialOrders from "@/data/orders.json";

const initialOrderState: Omit<ProductionOrder, "id"> = {
  nombreCliente: "",
  fechaEntrega: "",
  prioridad: 3,
  items: [],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>(initialOrders);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Partial<ProductionOrder> | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ProductionOrder | null>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const productReferences = useMemo(() => {
    const refs = mockProducts.map(p => p.referencia);
    return [...new Set(refs)];
  }, []);

  const flattenedOrders = useMemo(() => {
    return orders.flatMap(order => 
      order.items.map(item => {
        const product = mockProducts.find(p => p.referencia === item.referencia);
        return {
          ...order,
          ...item,
          orderId: order.id,
          descripcion: product ? product.descripcion : 'N/A',
        };
      })
    );
  }, [orders]);

  const isEditing = currentOrder && currentOrder.id;

  const handleOpenDialog = (order?: ProductionOrder) => {
    setCurrentOrder(order ? { ...order, items: [...order.items] } : { ...initialOrderState, items: [{ referencia: '', cantidad: 1 }] });
    setIsDialogOpen(true);
  };
  
  const handleAddItem = () => {
    if (currentOrder && currentOrder.items) {
      const newItem: OrderItem = { referencia: '', cantidad: 1 };
      setCurrentOrder({ ...currentOrder, items: [...currentOrder.items, newItem] });
    }
  };

  const handleRemoveItem = (index: number) => {
    if (currentOrder && currentOrder.items && currentOrder.items.length > 1) {
      const newItems = [...currentOrder.items];
      newItems.splice(index, 1);
      setCurrentOrder({ ...currentOrder, items: newItems });
    } else {
        toast({
            variant: "destructive",
            title: "Acción no permitida",
            description: "Una orden debe tener al menos un item.",
        });
    }
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    if (currentOrder && currentOrder.items) {
      const newItems = [...currentOrder.items];
      const updatedItem = { ...newItems[index], [field]: value };
      newItems[index] = updatedItem as OrderItem;
      setCurrentOrder({ ...currentOrder, items: newItems });
    }
  };

  const handleSaveDialogChanges = () => {
    if (!currentOrder || !currentOrder.nombreCliente || !currentOrder.fechaEntrega || !currentOrder.items?.every(item => item.referencia && item.cantidad > 0)) {
        toast({
            variant: "destructive",
            title: "Campos incompletos",
            description: "Por favor, complete todos los campos de la orden y sus items.",
        });
        return;
    }
    
    if (isEditing) {
      setOrders(orders.map((o) => (o.id === currentOrder.id ? (currentOrder as ProductionOrder) : o)));
       toast({ title: "Orden Actualizada", description: `La orden ${currentOrder.id} ha sido actualizada.` });
    } else {
      const newOrder: ProductionOrder = { ...currentOrder, id: `ORD-${Date.now()}` } as ProductionOrder;
      setOrders([newOrder, ...orders]);
      toast({ title: "Orden Creada", description: `La nueva orden ${newOrder.id} ha sido creada.` });
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
      toast({ title: "Orden Eliminada", description: `La orden ${orderToDelete.id} ha sido eliminada.` });
    }
  };
  
  const handleSaveAllOrders = () => {
    startTransition(async () => {
      const result = await saveOrdersData(orders);
      if (result.success) {
        toast({
          title: "Órdenes Guardadas",
          description: "La base de datos de órdenes ha sido actualizada.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error al guardar",
          description: result.error,
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Órdenes de Producción</h1>
          <p className="text-muted-foreground">Crear y gestionar órdenes de clientes.</p>
        </div>
        <div className="flex gap-2">
            <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2" />
                Añadir Orden
            </Button>
            <Button onClick={handleSaveAllOrders} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                Guardar Órdenes
            </Button>
        </div>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Orden</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Fecha Entrega</TableHead>
              <TableHead>Prioridad</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedOrders.map((item, index) => (
              <TableRow key={`${item.orderId}-${index}`}>
                <TableCell className="font-medium">{item.orderId}</TableCell>
                <TableCell>{item.nombreCliente}</TableCell>
                <TableCell>{item.referencia}</TableCell>
                <TableCell>{item.descripcion}</TableCell>
                <TableCell className="text-right">{item.cantidad}</TableCell>
                <TableCell>{item.fechaEntrega}</TableCell>
                <TableCell><Badge variant={item.prioridad === 1 ? "destructive" : "secondary"}>{item.prioridad}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(orders.find(o => o.id === item.orderId))}>
                        <Pencil className="mr-2 h-4 w-4"/> Editar Orden
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAlert(orders.find(o => o.id === item.orderId)!)} className="text-red-500 focus:text-red-500">
                        <Trash2 className="mr-2 h-4 w-4"/> Borrar Orden
                      </DropdownMenuItem>
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
            <div className="space-y-2"><Label htmlFor="customer-name">Nombre Cliente</Label><Input id="customer-name" value={currentOrder?.nombreCliente || ''} onChange={(e) => setCurrentOrder({...currentOrder, nombreCliente: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="delivery-date">Fecha Entrega</Label><Input id="delivery-date" type="date" value={currentOrder?.fechaEntrega || ''} onChange={(e) => setCurrentOrder({...currentOrder, fechaEntrega: e.target.value })} /></div>
            <div className="space-y-2"><Label htmlFor="priority">Prioridad</Label><Input id="priority" type="number" min="1" max="5" value={currentOrder?.prioridad || 3} onChange={(e) => setCurrentOrder({...currentOrder, prioridad: parseInt(e.target.value) })} /></div>
          </div>
          <div>
            <h3 className="mb-2 font-medium">Items de la Orden</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {currentOrder?.items?.map((item, index) => (
                <div key={index} className="flex items-center gap-2 p-2 border rounded-md">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor={`item-ref-${index}`}>Referencia</Label>
                     <Select value={item.referencia} onValueChange={(value) => handleItemChange(index, 'referencia', value)}>
                        <SelectTrigger id={`item-ref-${index}`}><SelectValue placeholder="Seleccionar Producto" /></SelectTrigger>
                        <SelectContent>
                          {productReferences.length > 0 ? (
                            productReferences.map(ref => <SelectItem key={ref} value={ref}>{ref}</SelectItem>)
                          ) : (
                            <SelectItem value="-" disabled>No hay productos en el BOM</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                  </div>
                   <div className="space-y-1">
                    <Label htmlFor={`item-qty-${index}`}>Cantidad</Label>
                    <Input id={`item-qty-${index}`} type="number" min="1" placeholder="Cant" className="w-24" value={item.cantidad} onChange={(e) => handleItemChange(index, 'cantidad', parseInt(e.target.value) || 1)} />
                   </div>
                  <Button variant="ghost" size="icon" className="self-end" onClick={() => handleRemoveItem(index)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4"/>Añadir Item</Button>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveDialogChanges}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esto eliminará permanentemente la orden <span className="font-bold">{orderToDelete?.id}</span> y todos sus items. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Borrar Orden</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

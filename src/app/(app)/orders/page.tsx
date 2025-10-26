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
  clientName: "",
  deliveryDate: "",
  priority: 3,
  items: [],
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<ProductionOrder[]>(mockOrders);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Partial<ProductionOrder> | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ProductionOrder | null>(null);
  
  const productReferences = useMemo(() => {
    const refs = mockProducts.map(p => p.reference);
    return [...new Set(refs)];
  }, []);

  const isEditing = currentOrder && currentOrder.id;

  const handleOpenDialog = (order?: ProductionOrder) => {
    setCurrentOrder(order || initialOrderState);
    setIsDialogOpen(true);
  };
  
  const handleAddItem = () => {
    if (currentOrder && currentOrder.items) {
      const newItem: OrderItem = { reference: '', quantity: 1 };
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
          <h1 className="text-3xl font-bold font-headline">Production Orders</h1>
          <p className="text-muted-foreground">Create and manage customer orders.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <PlusCircle className="mr-2" />
          Add Order
        </Button>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Delivery Date</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.id}</TableCell>
                <TableCell>{order.clientName}</TableCell>
                <TableCell>{order.items.reduce((acc, item) => acc + item.quantity, 0)}</TableCell>
                <TableCell>{order.deliveryDate}</TableCell>
                <TableCell><Badge variant="secondary">{order.priority}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(order)}><Pencil className="mr-2 h-4 w-4"/> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAlert(order)} className="text-red-500 focus:text-red-500"><Trash2 className="mr-2 h-4 w-4"/> Delete</DropdownMenuItem>
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
            <DialogTitle>{isEditing ? "Edit Order" : "Add New Order"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2"><Label>Client Name</Label><Input value={currentOrder?.clientName || ''} onChange={(e) => setCurrentOrder({...currentOrder, clientName: e.target.value })} /></div>
            <div className="space-y-2"><Label>Delivery Date</Label><Input type="date" value={currentOrder?.deliveryDate || ''} onChange={(e) => setCurrentOrder({...currentOrder, deliveryDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>Priority</Label><Input type="number" min="1" max="5" value={currentOrder?.priority || 3} onChange={(e) => setCurrentOrder({...currentOrder, priority: parseInt(e.target.value) })} /></div>
          </div>
          <div>
            <h3 className="mb-2 font-medium">Order Items</h3>
            <div className="space-y-2">
              {currentOrder?.items?.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select value={item.reference} onValueChange={(value) => handleItemChange(index, 'reference', value)}>
                    <SelectTrigger><SelectValue placeholder="Select Product" /></SelectTrigger>
                    <SelectContent>
                      {productReferences.map(ref => <SelectItem key={ref} value={ref}>{ref}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" min="1" placeholder="Qty" className="w-24" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))} />
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}><X className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={handleAddItem}><PlusCircle className="mr-2 h-4 w-4"/>Add Item</Button>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete order <span className="font-bold">{orderToDelete?.id}</span>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

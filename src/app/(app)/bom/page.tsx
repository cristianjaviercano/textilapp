"use client";

import React, { useState } from "react";
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
import { mockProducts } from "@/data/mock-data";
import type { Product } from "@/lib/types";
import { PlusCircle, FileUp, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const initialProductState: Omit<Product, "id"> = {
  referencia: "",
  descripcion: "",
  familia: "",
  proceso: "",
  consecutivo: 0,
  operacion: "",
  maquina: "",
  sam: 0,
};

export default function BomPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isEditing = currentProduct && currentProduct.id;

  const handleOpenDialog = (product?: Product) => {
    setCurrentProduct(product || initialProductState);
    setIsDialogOpen(true);
  };

  const handleSaveChanges = () => {
    if (!currentProduct) return;

    if (isEditing) {
      setProducts(
        products.map((p) =>
          p.id === currentProduct.id ? (currentProduct as Product) : p
        )
      );
    } else {
      const newProduct: Product = {
        ...currentProduct,
        id: `p${Date.now()}`,
      } as Product;
      setProducts([newProduct, ...products]);
    }
    setIsDialogOpen(false);
    setCurrentProduct(null);
  };

  const handleOpenAlert = (product: Product) => {
    setProductToDelete(product);
    setIsAlertOpen(true);
  };

  const handleDeleteProduct = () => {
    if (productToDelete) {
      setProducts(products.filter((p) => p.id !== productToDelete.id));
      setIsAlertOpen(false);
      setProductToDelete(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you would parse the CSV here.
      // For now, we just log it.
      console.log("CSV file selected:", file.name);
      alert(`Carga de CSV: ${file.name} seleccionado. La lógica de análisis se implementaría aquí.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Gestión de BOM</h1>
          <p className="text-muted-foreground">
            Ver, agregar y gestionar operaciones de productos.
          </p>
        </div>
        <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="mr-2" />
                Cargar CSV
            </Button>
            <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2" />
                Añadir Operación
            </Button>
        </div>
      </div>
      
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referencia</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Máquina</TableHead>
              <TableHead className="text-right">SAM (min)</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.referencia}</TableCell>
                <TableCell>{product.descripcion}</TableCell>
                <TableCell>{product.operacion}</TableCell>
                <TableCell>{product.maquina}</TableCell>
                <TableCell className="text-right">{product.sam.toFixed(2)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(product)}>
                        <Pencil className="mr-2 h-4 w-4"/> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAlert(product)} className="text-red-500 focus:text-red-500">
                        <Trash2 className="mr-2 h-4 w-4"/> Borrar
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar Operación" : "Añadir Nueva Operación"}</DialogTitle>
            <DialogDescription>
              Rellene los detalles de la operación del producto.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia</Label>
              <Input id="referencia" value={currentProduct?.referencia || ''} onChange={(e) => setCurrentProduct({...currentProduct, referencia: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" value={currentProduct?.descripcion || ''} onChange={(e) => setCurrentProduct({...currentProduct, descripcion: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="familia">Familia</Label>
              <Input id="familia" value={currentProduct?.familia || ''} onChange={(e) => setCurrentProduct({...currentProduct, familia: e.target.value })} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="proceso">Proceso</Label>
              <Input id="proceso" value={currentProduct?.proceso || ''} onChange={(e) => setCurrentProduct({...currentProduct, proceso: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operacion">Operación</Label>
              <Input id="operacion" value={currentProduct?.operacion || ''} onChange={(e) => setCurrentProduct({...currentProduct, operacion: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maquina">Máquina</Label>
              <Input id="maquina" value={currentProduct?.maquina || ''} onChange={(e) => setCurrentProduct({...currentProduct, maquina: e.target.value })} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="consecutivo">Consecutivo</Label>
              <Input id="consecutivo" type="number" value={currentProduct?.consecutivo || 0} onChange={(e) => setCurrentProduct({...currentProduct, consecutivo: parseInt(e.target.value, 10) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sam">SAM (min)</Label>
              <Input id="sam" type="number" value={currentProduct?.sam || 0} onChange={(e) => setCurrentProduct({...currentProduct, sam: parseFloat(e.target.value) })} />
            </div>
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
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la operación para <span className="font-bold">{productToDelete?.referencia} - {productToDelete?.operacion}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Borrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

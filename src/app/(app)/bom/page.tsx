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
  reference: "",
  description: "",
  family: "",
  process: "",
  consecutive: 0,
  operation: "",
  machine: "",
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
      alert(`CSV Loading: ${file.name} selected. Parsing logic would be implemented here.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">BOM Management</h1>
          <p className="text-muted-foreground">
            View, add, and manage product operations.
          </p>
        </div>
        <div className="flex gap-2">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="mr-2" />
                Load CSV
            </Button>
            <Button onClick={() => handleOpenDialog()}>
                <PlusCircle className="mr-2" />
                Add Operation
            </Button>
        </div>
      </div>
      
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Operation</TableHead>
              <TableHead>Machine</TableHead>
              <TableHead className="text-right">SAM (min)</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.reference}</TableCell>
                <TableCell>{product.description}</TableCell>
                <TableCell>{product.operation}</TableCell>
                <TableCell>{product.machine}</TableCell>
                <TableCell className="text-right">{product.sam.toFixed(2)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(product)}>
                        <Pencil className="mr-2 h-4 w-4"/> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleOpenAlert(product)} className="text-red-500 focus:text-red-500">
                        <Trash2 className="mr-2 h-4 w-4"/> Delete
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
            <DialogTitle>{isEditing ? "Edit Operation" : "Add New Operation"}</DialogTitle>
            <DialogDescription>
              Fill in the details for the product operation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" value={currentProduct?.reference || ''} onChange={(e) => setCurrentProduct({...currentProduct, reference: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" value={currentProduct?.description || ''} onChange={(e) => setCurrentProduct({...currentProduct, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="family">Family</Label>
              <Input id="family" value={currentProduct?.family || ''} onChange={(e) => setCurrentProduct({...currentProduct, family: e.target.value })} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="process">Process</Label>
              <Input id="process" value={currentProduct?.process || ''} onChange={(e) => setCurrentProduct({...currentProduct, process: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="operation">Operation</Label>
              <Input id="operation" value={currentProduct?.operation || ''} onChange={(e) => setCurrentProduct({...currentProduct, operation: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="machine">Machine</Label>
              <Input id="machine" value={currentProduct?.machine || ''} onChange={(e) => setCurrentProduct({...currentProduct, machine: e.target.value })} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="consecutive">Consecutive</Label>
              <Input id="consecutive" type="number" value={currentProduct?.consecutive || 0} onChange={(e) => setCurrentProduct({...currentProduct, consecutive: parseInt(e.target.value, 10) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sam">SAM (min)</Label>
              <Input id="sam" type="number" value={currentProduct?.sam || 0} onChange={(e) => setCurrentProduct({...currentProduct, sam: parseFloat(e.target.value) })} />
            </div>
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
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the operation for <span className="font-bold">{productToDelete?.reference} - {productToDelete?.operation}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

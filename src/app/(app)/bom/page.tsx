"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { mockProducts } from "@/data/mock-data";
import type { Product } from "@/lib/types";
import { PlusCircle, FileUp, Save, Trash2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { saveBomData } from "./actions";

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
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [editingRows, setEditingRows] = useState<Record<string, boolean>>({});
  const [editedData, setEditedData] = useState<Record<string, Partial<Product>>>({});
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
          const newProducts = parseCSV(text);
          setProducts(prev => [...newProducts, ...prev]);
          toast({
            title: "Éxito",
            description: `${newProducts.length} nuevos productos cargados desde el CSV.`,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Error desconocido";
          toast({
            variant: "destructive",
            title: "Error al procesar el archivo",
            description: errorMessage,
          });
        }
      };
      reader.readAsText(file, 'UTF-8');
    }
    if(fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  const parseCSV = (csvText: string): Product[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(';').map(h => h.trim());
    const expectedHeaders = ['REFERENCIA','DESCRIPCION','FAMILIA','PROCESO','CONSECUTIVO','OPERACIÓN','MAQUINA','SAM-MINUTOS'];
    
    if(headers.length !== expectedHeaders.length || !expectedHeaders.every((h, i) => h === headers[i])) {
        throw new Error("Las cabeceras del CSV no coinciden con el formato esperado.");
    }
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(';');
      return {
        id: `csv-${Date.now()}-${index}`,
        referencia: values[0]?.trim() || "",
        descripcion: values[1]?.trim() || "",
        familia: values[2]?.trim() || "",
        proceso: values[3]?.trim() || "",
        consecutivo: parseInt(values[4]?.trim() || "0", 10),
        operacion: values[5]?.trim() || "",
        maquina: values[6]?.trim() || "",
        sam: parseFloat((values[7]?.trim() || "0").replace(',', '.')),
      };
    });
  }

  const handleAddRow = () => {
    const newProduct: Product = {
      id: `new-${Date.now()}`,
      ...initialProductState
    };
    setProducts([newProduct, ...products]);
    setEditingRows(prev => ({ ...prev, [newProduct.id]: true }));
  };

  const handleToggleEdit = (id: string) => {
    if (editingRows[id]) {
      // If saving
      handleSaveRowChanges(id);
    } else {
      // If starting to edit
      setEditingRows(prev => ({ ...prev, [id]: true }));
      setEditedData(prev => ({ ...prev, [id]: products.find(p => p.id === id) || {} }));
    }
  };

  const handleCancelEdit = (id: string) => {
     setEditingRows(prev => {
      const newEditingRows = { ...prev };
      delete newEditingRows[id];
      return newEditingRows;
    });
    setEditedData(prev => {
      const newEditedData = { ...prev };
      delete newEditedData[id];
      return newEditedData;
    });
     if (id.startsWith('new-')) {
      setProducts(products.filter(p => p.id !== id));
    }
  }

  const handleFieldChange = (id: string, field: keyof Omit<Product, 'id'>, value: string | number) => {
    setEditedData(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSaveRowChanges = (id: string) => {
    const changes = editedData[id];
    if (!changes) return;

    setProducts(products.map(p => p.id === id ? { ...p, ...changes } : p));
    
    setEditingRows(prev => {
      const newEditingRows = { ...prev };
      delete newEditingRows[id];
      return newEditingRows;
    });
    setEditedData(prev => {
      const newEditedData = { ...prev };
      delete newEditedData[id];
      return newEditedData;
    });
    toast({ title: "Guardado", description: "Los cambios en la fila se han guardado localmente. Haga clic en Guardar BOM para persistir." });
  };
  
  const handleSaveAllBom = () => {
    startTransition(async () => {
        const result = await saveBomData(products);
        if (result.success) {
            toast({
                title: "BOM Guardado",
                description: "La base de datos del BOM ha sido actualizada.",
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

  const handleOpenAlert = (id: string) => {
    setProductToDelete(id);
    setIsAlertOpen(true);
  };

  const handleDeleteProduct = () => {
    if (productToDelete) {
      setProducts(products.filter((p) => p.id !== productToDelete));
      setIsAlertOpen(false);
      setProductToDelete(null);
      toast({ title: "Eliminado", description: "La operación ha sido eliminada." });
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedRows(prev => ({ ...prev, [id]: checked }));
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelectedRows: Record<string, boolean> = {};
    if (checked) {
      products.forEach(p => newSelectedRows[p.id] = true);
    }
    setSelectedRows(newSelectedRows);
  };

  const handleDeleteSelected = () => {
    const idsToDelete = Object.keys(selectedRows).filter(id => selectedRows[id]);
    if (idsToDelete.length > 0) {
       setProducts(products.filter(p => !idsToDelete.includes(p.id)));
       setSelectedRows({});
       toast({ title: `${idsToDelete.length} operaciones eliminadas.`});
    }
  };

  const isAllSelected = useMemo(() => products.length > 0 && products.every(p => selectedRows[p.id]), [products, selectedRows]);
  const isAnySelected = useMemo(() => Object.values(selectedRows).some(v => v), [selectedRows]);

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
            {isAnySelected && (
              <Button variant="destructive" onClick={handleDeleteSelected}>
                  <Trash2 className="mr-2" />
                  Borrar ({Object.values(selectedRows).filter(Boolean).length})
              </Button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <FileUp className="mr-2" />
                Cargar CSV
            </Button>
            <Button onClick={handleAddRow}>
                <PlusCircle className="mr-2" />
                Añadir Operación
            </Button>
            <Button onClick={handleSaveAllBom} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                Guardar BOM
            </Button>
        </div>
      </div>
      
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                  <Checkbox onCheckedChange={handleSelectAll} checked={isAllSelected} />
              </TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Máquina</TableHead>
              <TableHead className="text-right">SAM (min)</TableHead>
              <TableHead className="w-36 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
                const isEditing = editingRows[product.id];
                const currentData = isEditing ? editedData[product.id] : product;
                return (
                  <TableRow key={product.id} data-state={selectedRows[product.id] ? "selected" : ""}>
                    <TableCell>
                      <Checkbox onCheckedChange={(checked) => handleSelectRow(product.id, !!checked)} checked={selectedRows[product.id] || false} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {isEditing ? <Input value={currentData?.referencia || ''} onChange={e => handleFieldChange(product.id, 'referencia', e.target.value)} className="h-8"/> : product.referencia}
                    </TableCell>
                    <TableCell>
                      {isEditing ? <Input value={currentData?.descripcion || ''} onChange={e => handleFieldChange(product.id, 'descripcion', e.target.value)} className="h-8"/> : product.descripcion}
                    </TableCell>
                    <TableCell>
                      {isEditing ? <Input value={currentData?.operacion || ''} onChange={e => handleFieldChange(product.id, 'operacion', e.target.value)} className="h-8"/> : product.operacion}
                    </TableCell>
                    <TableCell>
                      {isEditing ? <Input value={currentData?.maquina || ''} onChange={e => handleFieldChange(product.id, 'maquina', e.target.value)} className="h-8"/> : product.maquina}
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? <Input type="number" value={currentData?.sam || 0} onChange={e => handleFieldChange(product.id, 'sam', parseFloat(e.target.value))} className="h-8 text-right"/> : product.sam.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                        <div className="flex gap-1 justify-center">
                            {isEditing ? (
                                <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700" onClick={() => handleSaveRowChanges(product.id)}>
                                        <Save className="h-4 w-4"/>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleCancelEdit(product.id)}>
                                        <XCircle className="h-4 w-4"/>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="outline" size="sm" className="h-8" onClick={() => handleToggleEdit(product.id)}>
                                        Editar
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleOpenAlert(product.id)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </>
                            )}
                        </div>
                    </TableCell>
                  </TableRow>
                )
            })}
          </TableBody>
        </Table>
      </div>
      
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente la operación.
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

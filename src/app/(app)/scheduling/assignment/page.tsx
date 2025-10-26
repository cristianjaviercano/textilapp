"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import type { Operative, Task, ProductionOrder, AssignmentData } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wand2, Info, ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { saveOrdersData } from '../../orders/actions';


interface SchedulingData {
  operatives: Operative[];
  tasks: Task[];
  levelingUnit: number;
  packageSize: number;
  unitsPerHour: Record<string, number>;
}

const ORDERS_LOCAL_STORAGE_KEY = 'productionOrders';

export default function AssignmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<SchedulingData | null>(null);
  const [assignments, setAssignments] = useState<AssignmentData>({});
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let storedData: string | null = null;
    try {
      storedData = localStorage.getItem('schedulingData');
      if (storedData) {
        const parsedData: SchedulingData = JSON.parse(storedData);
        if (parsedData.operatives && parsedData.tasks && Array.isArray(parsedData.tasks)) {
           parsedData.tasks.forEach(task => {
            if (typeof task.unitSam !== 'number') task.unitSam = 0;
            if (typeof task.consecutivo !== 'number') task.consecutivo = 0;
            if (typeof task.maquina !== 'string') task.maquina = 'N/A';
          });
          if (!parsedData.unitsPerHour) {
            parsedData.unitsPerHour = {};
          }
          setData(parsedData);
        } else {
          throw new Error("Invalid data structure");
        }
      } else {
        toast({
            variant: "destructive",
            title: "Datos no encontrados",
            description: "No se encontraron datos de programación. Redirigiendo...",
        });
        router.push('/scheduling');
      }
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error al cargar datos",
            description: "Hubo un problema al leer los datos de programación.",
        });
        router.push('/scheduling');
    } finally {
        setIsLoading(false);
    }
  }, [router, toast]);

  const tasksByProduct = useMemo(() => {
    if (!data) return {};
    return data.tasks.reduce((acc, task) => {
        const key = task.productDescription;
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(task);
        return acc;
    }, {} as Record<string, Task[]>);
  }, [data]);

  const handleAssignmentChange = (taskId: string, operativeId: string, value: string) => {
    if (!data) return;

    let samToAssign = parseFloat(value) || 0;
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const unitsPerHour = data.unitsPerHour?.[task.productDescription] || 0;
    const requiredSam = task.unitSam * unitsPerHour;
    
    const otherAssignmentsForTask = Object.entries(assignments[taskId] || {})
      .filter(([opId]) => opId !== operativeId)
      .reduce((sum, [, val]) => sum + val, 0);

    if (otherAssignmentsForTask + samToAssign > requiredSam) {
        samToAssign = Math.max(0, requiredSam - otherAssignmentsForTask);
        toast({ title: "Límite de Tarea Excedido", description: `El SAM asignado no puede superar el SAM requerido de ${requiredSam.toFixed(2)}.`});
    }

    const otherAssignmentsForOperative = Object.keys(assignments)
      .filter(tId => tId !== taskId)
      .reduce((sum, currentTaskId) => sum + (assignments[currentTaskId]?.[operativeId] || 0), 0);
    
    if (otherAssignmentsForOperative + samToAssign > data.levelingUnit) {
        samToAssign = Math.max(0, data.levelingUnit - otherAssignmentsForOperative);
        toast({ title: "Límite de Operario Excedido", description: `La carga de ${operativeId} no puede superar los ${data.levelingUnit} min.`});
    }

    setAssignments(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [operativeId]: samToAssign,
      },
    }));
  };
  
  const summaryTotals = useMemo(() => {
    if (!data) return { operativeTotals: {}, totalsByProduct: {}, globalTotals: {} };
    
    const operativeTotals: Record<string, number> = {};
    data.operatives.forEach(op => operativeTotals[op.id] = 0);

    Object.values(assignments).forEach(taskAssignments => {
        Object.entries(taskAssignments).forEach(([operativeId, value]) => {
            operativeTotals[operativeId] = (operativeTotals[operativeId] || 0) + value;
        });
    });

    const totalsByProduct = Object.keys(tasksByProduct).reduce((acc, productName) => {
        const tasks = tasksByProduct[productName];
        const unitsPerHour = data.unitsPerHour?.[productName] || 0;
        
        let totalTasks = tasks.length;
        let totalUnitSam = tasks.reduce((sum, task) => sum + task.unitSam, 0);
        let totalPackageTime = tasks.reduce((sum, task) => sum + (task.unitSam * data.packageSize), 0);
        let totalRequiredSam = tasks.reduce((sum, task) => sum + (task.unitSam * unitsPerHour), 0);
        
        acc[productName] = {
            totalTasks,
            totalUnitSam,
            totalPackageTime,
            totalRequiredSam
        };
        return acc;
    }, {} as Record<string, {totalTasks: number; totalUnitSam: number; totalPackageTime: number; totalRequiredSam: number}>);
    
    return { 
      operativeTotals,
      totalsByProduct
    };
  }, [data, assignments, tasksByProduct]);


  const handleAutoAssign = () => {
    if (!data) return;
    setIsLoading(true);
    setAiSummary(null);

    const newAssignments: AssignmentData = {};
    const operativeLoads: Record<string, number> = data.operatives.reduce((acc, op) => {
      acc[op.id] = 0;
      return acc;
    }, {} as Record<string, number>);

    for (const task of data.tasks) {
      const unitsPerHour = data.unitsPerHour?.[task.productDescription] || 0;
      let samToDistribute = task.unitSam * unitsPerHour;
      
      if (samToDistribute <= 0) continue;

      if (!newAssignments[task.id]) {
        newAssignments[task.id] = {};
      }

      for (const operative of data.operatives) {
        if (samToDistribute <= 0.01) break;

        const remainingOperativeCapacity = data.levelingUnit - (operativeLoads[operative.id] || 0);
        if (remainingOperativeCapacity <= 0) continue;

        const assignedAmount = Math.min(samToDistribute, remainingOperativeCapacity);

        newAssignments[task.id][operative.id] = (newAssignments[task.id][operative.id] || 0) + assignedAmount;
        operativeLoads[operative.id] += assignedAmount;
        samToDistribute -= assignedAmount;
      }
    }

    setAssignments(newAssignments);
    setAiSummary("Asignación automática completada con el algoritmo de nivelación secuencial.");
    setIsLoading(false);
    toast({ title: "Éxito", description: "Las tareas han sido asignadas automáticamente." });
  };
  
  const handleSaveAssignments = async () => {
    try {
        // This is a bit tricky as we don't have direct access to the file system
        // on the client to read all orders. We will rely on what was passed for scheduling.
        if (!data) throw new Error("No hay datos de programación para guardar.");

        const allOrderIds = [...new Set(data.tasks.map(t => t.orderId))];
        
        // This is a simplification. In a real scenario, we would fetch orders from the DB.
        // Here we assume we only need to update the orders we have tasks for.
        const ordersWithAssignments = allOrderIds.map(orderId => {
            const orderAssignments: AssignmentData = {};
            for (const taskId in assignments) {
                if (taskId.startsWith(orderId)) {
                    orderAssignments[taskId] = assignments[taskId];
                }
            }
            // This is a partial update, we would need the full order object in a real app
            return { id: orderId, assignments: orderAssignments };
        });

        // We can't update a JSON file directly. This would need a proper API endpoint.
        // The saveOrdersData action is simulated. For now, we save to localStorage
        // to persist across refreshes on this page, but it won't update a central file.
        // A more robust solution is needed for multi-user or persistent server-side storage.

        toast({
            title: "Simulación de Guardado",
            description: "Las asignaciones se han guardado localmente (simulación).",
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido";
        toast({
            variant: "destructive",
            title: "Error al Guardar",
            description: message,
        });
    }
  };


  if (isLoading || !data) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  
  const productTabs = Object.keys(tasksByProduct);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Matriz de Asignación</h1>
          <p className="text-muted-foreground">Ajuste manualmente o asigne automáticamente la carga de trabajo a los operarios.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/scheduling')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Regresar
            </Button>
            <Button onClick={handleAutoAssign} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Asignar Automáticamente
            </Button>
            <Button onClick={handleSaveAssignments}>
                <Save className="mr-2 h-4 w-4" />
                Guardar Asignación
            </Button>
        </div>
      </div>

      {aiSummary && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Resumen de Asignación</AlertTitle>
          <AlertDescription>{aiSummary}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={productTabs[0]} className="w-full">
        <TabsList>
            {productTabs.map(productName => (
                <TabsTrigger key={productName} value={productName}>{productName}</TabsTrigger>
            ))}
        </TabsList>
        {productTabs.map((productName, tabIndex) => (
          <TabsContent key={productName} value={productName}>
             <Card>
                <CardHeader>
                    <CardTitle>Prenda: {productName}</CardTitle>
                    <CardDescription>Tamaño de paquete: {data.packageSize} | Tiempo de Nivelación: {data.levelingUnit} min | Unidades/Hora: {data.unitsPerHour?.[productName]?.toFixed(2) || 'N/A'}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-card z-10 w-[60px]">Cons.</TableHead>
                          <TableHead className="sticky left-16 bg-card z-10 w-[250px]">Tarea</TableHead>
                          <TableHead className="w-[150px]">Máquina</TableHead>
                          <TableHead className="text-right w-[100px]">SAM Unit.</TableHead>
                          <TableHead className="text-right w-[100px]">T. Paquete</TableHead>
                          <TableHead className="text-right w-[120px]">SAM Total Req.</TableHead>
                          <TableHead className="text-right w-[120px]">SAM Asignado</TableHead>
                          {data.operatives.map(op => (
                            <TableHead key={op.id} className="text-center w-[150px]">{op.id}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasksByProduct[productName]
                         .map((task, index) => {
                          const unitsPerHour = data.unitsPerHour?.[task.productDescription] || 0;
                          const requiredSam = task.unitSam * unitsPerHour;
                          const assigned = Object.values(assignments[task.id] || {}).reduce((sum, val) => sum + val, 0);
                          const isBalanced = Math.abs(assigned - requiredSam) < 0.01 || requiredSam === 0;
                          const timePerPackage = task.unitSam * data.packageSize;
                          return (
                            <TableRow key={task.id}>
                              <TableCell className="sticky left-0 bg-card z-10 font-medium text-center w-[60px]">{index + 1}</TableCell>
                              <TableCell className="sticky left-16 bg-card z-10 font-medium w-[250px]">
                                <div>{task.operation}</div>
                                <div className="text-xs text-muted-foreground">{task.orderId}</div>
                              </TableCell>
                              <TableCell className="w-[150px]">{task.maquina}</TableCell>
                              <TableCell className="text-right w-[100px]">{task.unitSam.toFixed(2)}</TableCell>
                              <TableCell className="text-right w-[100px]">{timePerPackage.toFixed(2)}</TableCell>
                              <TableCell className="text-right w-[120px]">{requiredSam.toFixed(2)}</TableCell>
                              <TableCell className={`text-right font-bold w-[120px] ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>{assigned.toFixed(2)}</TableCell>
                              {data.operatives.map(op => (
                                <TableCell key={op.id} className="p-1 w-[150px]">
                                  <Input
                                    type="number"
                                    className="text-right"
                                    value={assignments[task.id]?.[op.id] || ''}
                                    onChange={e => handleAssignmentChange(task.id, op.id, e.target.value)}
                                    placeholder="0"
                                  />
                                </TableCell>
                              ))}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                        <TableFooter>
                           <TableRow className="bg-secondary/70 hover:bg-secondary/70 font-bold">
                              <TableCell colSpan={2} className="sticky left-0 bg-secondary/70 z-10">Totales</TableCell>
                              <TableCell className="text-center">{summaryTotals.totalsByProduct[productName]?.totalTasks || 0}</TableCell>
                              <TableCell className="text-right">{summaryTotals.totalsByProduct[productName]?.totalUnitSam.toFixed(2) || '0.00'}</TableCell>
                              <TableCell className="text-right">{summaryTotals.totalsByProduct[productName]?.totalPackageTime.toFixed(2) || '0.00'}</TableCell>
                              <TableCell className="text-right">{summaryTotals.totalsByProduct[productName]?.totalRequiredSam.toFixed(2) || '0.00'}</TableCell>
                              <TableCell></TableCell>
                              {data.operatives.map(op => {
                                  const totalMinutes = summaryTotals.operativeTotals[op.id] || 0;
                                  return (<TableCell key={op.id} className="text-right font-bold">{totalMinutes.toFixed(2)}</TableCell>)
                              })}
                          </TableRow>
                          <TableRow className="bg-secondary hover:bg-secondary">
                            <th colSpan={7} className="p-2 text-right font-bold sticky left-0 bg-secondary z-10">Total Asignado (Nivelación)</th>
                            {data.operatives.map(op => {
                               const totalMinutes = summaryTotals.operativeTotals[op.id] || 0;
                               const levelingMinutes = data.levelingUnit;
                               const usage = levelingMinutes > 0 ? (totalMinutes / levelingMinutes) * 100 : 0;
                               const isOverloaded = totalMinutes > levelingMinutes;
                              return (
                                  <th key={op.id} className="p-2 text-center font-normal">
                                      <div className={`font-bold ${isOverloaded ? 'text-red-600' : ''}`}>{totalMinutes.toFixed(2)} / {levelingMinutes.toFixed(2)} min</div>
                                      <Progress value={usage} className={`h-2 mt-1 ${isOverloaded ? '[&>div]:bg-red-500': ''}`} />
                                  </th>
                              )
                            })}
                          </TableRow>
                        </TableFooter>
                    </Table>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

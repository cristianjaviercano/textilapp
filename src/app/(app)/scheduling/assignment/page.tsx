"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Operative, Task } from '@/lib/types';
import { runAutomatedAssignment } from '../actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wand2, Info, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface SchedulingData {
  operatives: Operative[];
  tasks: Task[];
  levelingUnit: number;
}

export default function AssignmentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<SchedulingData | null>(null);
  const [assignments, setAssignments] = useState<Record<string, Record<string, number>>>({});
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let storedData: string | null = null;
    try {
      storedData = localStorage.getItem('schedulingData');
      if (storedData) {
        const parsedData: SchedulingData = JSON.parse(storedData);
        if (parsedData.operatives && parsedData.tasks && Array.isArray(parsedData.tasks)) {
           // Ensure all tasks have a unitSam, defaulting to 0 if not present
           parsedData.tasks.forEach(task => {
            if (typeof task.unitSam !== 'number') {
              task.unitSam = 0;
            }
          });
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
    const sam = parseFloat(value) || 0;
    setAssignments(prev => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        [operativeId]: sam,
      },
    }));
  };

  const totals = useMemo(() => {
    if (!data) return { operativeTotals: {}, taskTotals: {} };

    const operativeTotals: Record<string, number> = {};
    data.operatives.forEach(op => operativeTotals[op.id] = 0);

    const taskTotals: Record<string, { assigned: number, required: number }> = {};
    data.tasks.forEach(task => {
      taskTotals[task.id] = { assigned: 0, required: task.totalSam };
      let currentTaskTotal = 0;
      data.operatives.forEach(op => {
        const assignedSam = assignments[task.id]?.[op.id] || 0;
        operativeTotals[op.id] += assignedSam;
        currentTaskTotal += assignedSam;
      });
      taskTotals[task.id].assigned = currentTaskTotal;
    });

    return { operativeTotals, taskTotals };
  }, [data, assignments]);

  const handleAutoAssign = async () => {
    if (!data) return;
    setIsLoading(true);
    setAiSummary(null);

    const input = {
      operatives: data.operatives.map(op => ({ operativeId: op.id, tiempoDisponible: op.availableTime })),
      tasks: data.tasks.map(task => ({ orderId: task.id, prenda: task.productDescription, operacion: task.operation, samRequeridoTotal: task.totalSam })),
      nivelacionUnidad: data.levelingUnit,
    };
    
    const result = await runAutomatedAssignment(input);
    setIsLoading(false);

    if (result.success && result.data) {
      const newAssignments: Record<string, Record<string, number>> = {};
      result.data.assignments.forEach(a => {
        if (!newAssignments[a.taskId]) {
          newAssignments[a.taskId] = {};
        }
        newAssignments[a.taskId][a.operativeId] = a.samAsignado;
      });
      setAssignments(newAssignments);
      setAiSummary(result.data.summary);
      toast({ title: "Éxito", description: "Las tareas han sido asignadas automáticamente." });
    } else {
      toast({ variant: "destructive", title: "Error", description: result.error || "Fallo al obtener la asignación de la IA." });
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
        </div>
      </div>

      {aiSummary && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Resumen de Asignación de IA</AlertTitle>
          <AlertDescription>{aiSummary}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={productTabs[0]} className="w-full">
        <TabsList>
            {productTabs.map(productName => (
                <TabsTrigger key={productName} value={productName}>{productName}</TabsTrigger>
            ))}
        </TabsList>
        {productTabs.map(productName => (
          <TabsContent key={productName} value={productName}>
             <Card>
                <CardHeader>
                    <CardTitle>Prenda: {productName}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-card z-10 w-[300px]">Tarea</TableHead>
                          <TableHead className="text-right w-[120px]">SAM Unitario</TableHead>
                          <TableHead className="text-right w-[120px]">SAM Total Req.</TableHead>
                          <TableHead className="text-right w-[120px]">SAM Asignado</TableHead>
                          {data.operatives.map(op => (
                            <TableHead key={op.id} className="text-center w-[150px]">{op.id}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasksByProduct[productName].map(task => {
                          const taskTotal = totals.taskTotals[task.id];
                          const assigned = taskTotal?.assigned || 0;
                          const required = taskTotal?.required || 0;
                          const isBalanced = Math.abs(assigned - required) < 0.01;
                          return (
                            <TableRow key={task.id}>
                              <TableCell className="sticky left-0 bg-card z-10 font-medium w-[300px]">
                                <div className="font-bold">{task.operation}</div>
                                <div className="text-xs text-muted-foreground">{task.orderId} / {task.productDescription}</div>
                              </TableCell>
                              <TableCell className="text-right w-[120px]">{task.unitSam.toFixed(2)}</TableCell>
                              <TableCell className="text-right w-[120px]">{required.toFixed(2)}</TableCell>
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
                      <tfoot>
                        <TableRow className="bg-secondary hover:bg-secondary">
                          <th colSpan={4} className="p-2 text-right font-bold sticky left-0 bg-secondary z-10">Total Asignado (Minutos)</th>
                          {data.operatives.map(op => {
                             const totalMinutes = totals.operativeTotals[op.id] || 0;
                             const availableMinutes = op.availableTime;
                             const usage = availableMinutes > 0 ? (totalMinutes / availableMinutes) * 100 : 0;
                             const isOverloaded = totalMinutes > availableMinutes;
                            return (
                                <th key={op.id} className="p-2 text-center font-normal">
                                    <div className={`font-bold ${isOverloaded ? 'text-red-600' : ''}`}>{totalMinutes.toFixed(2)} / {availableMinutes.toFixed(2)} min</div>
                                    <Progress value={usage} className={`h-2 mt-1 ${isOverloaded ? '[&>div]:bg-red-500': ''}`} />
                                </th>
                            )
                          })}
                        </TableRow>
                      </tfoot>
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

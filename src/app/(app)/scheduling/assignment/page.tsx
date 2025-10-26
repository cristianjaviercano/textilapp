"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
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
  packageSize: number;
  unitsPerHour: Record<string, number>;
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
    
    // --- VALIDATION LOGIC ---

    // Rule 1: Cannot be greater than SAM total Req for the activity
    const otherAssignmentsForTask = Object.entries(assignments[taskId] || {})
      .filter(([opId]) => opId !== operativeId)
      .reduce((sum, [, val]) => sum + val, 0);

    let maxForTask = requiredSam - otherAssignmentsForTask;
    if(samToAssign > maxForTask) {
        samToAssign = maxForTask < 0 ? 0 : maxForTask;
        toast({ title: "Límite de Tarea Excedido", description: `El SAM asignado no puede superar el SAM requerido de ${requiredSam.toFixed(2)}.`});
    }

    // Rule 2: Cumulative value for an operative cannot exceed levelingUnit
    const otherAssignmentsForOperative = data.tasks
      .filter(t => t.id !== taskId)
      .reduce((sum, currentTask) => sum + (assignments[currentTask.id]?.[operativeId] || 0), 0);

    const operativeTotal = otherAssignmentsForOperative;
    const maxForOperative = data.levelingUnit - operativeTotal;
    
    if (samToAssign > maxForOperative) {
        samToAssign = maxForOperative < 0 ? 0 : maxForOperative;
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
    if (!data) return { totalTasks: 0, totalUnitSam: 0, totalPackageTime: 0, operativeTotals: {} };
    
    const operativeTotals: Record<string, number> = {};
    data.operatives.forEach(op => operativeTotals[op.id] = 0);

    data.tasks.forEach(task => {
        const assignedSamForTask = Object.values(assignments[task.id] || {}).reduce((sum, val) => sum + val, 0);
        data.operatives.forEach(op => {
            const assignedSam = assignments[task.id]?.[op.id] || 0;
            operativeTotals[op.id] += assignedSam;
        });
    });

    const totalsByProduct = Object.keys(tasksByProduct).reduce((acc, productName) => {
        const tasks = tasksByProduct[productName];
        acc[productName] = {
            totalTasks: tasks.length,
            totalUnitSam: tasks.reduce((sum, task) => sum + task.unitSam, 0),
            totalPackageTime: tasks.reduce((sum, task) => sum + (task.unitSam * data.packageSize), 0),
        };
        return acc;
    }, {} as Record<string, {totalTasks: number, totalUnitSam: number, totalPackageTime: number}>);


    return { 
      operativeTotals,
      totalsByProduct
    };
  }, [data, assignments, tasksByProduct]);


  const handleAutoAssign = async () => {
    if (!data) return;
    setIsLoading(true);
    setAiSummary(null);

    const input = {
      operatives: data.operatives.map(op => ({ operativeId: op.id, tiempoDisponible: data.levelingUnit })),
      tasks: data.tasks.map(task => ({ orderId: task.id, prenda: task.productDescription, operacion: task.operation, samRequeridoTotal: task.unitSam })),
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
                        {tasksByProduct[productName].sort((a, b) => a.consecutivo - b.consecutivo).map(task => {
                          const unitsPerHour = data.unitsPerHour?.[productName] || 0;
                          const requiredSam = task.unitSam * unitsPerHour;
                          const assigned = Object.values(assignments[task.id] || {}).reduce((sum, val) => sum + val, 0);
                          const isBalanced = Math.abs(assigned - requiredSam) < 0.01 && requiredSam > 0;
                          const timePerPackage = task.unitSam * data.packageSize;
                          return (
                            <TableRow key={task.id}>
                              <TableCell className="sticky left-0 bg-card z-10 font-medium text-center w-[60px]">{task.consecutivo}</TableCell>
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
                            <TableCell colSpan={2}></TableCell>
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

    
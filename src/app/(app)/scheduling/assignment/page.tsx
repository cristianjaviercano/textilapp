"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Operative, Task, Assignment } from '@/lib/types';
import { runAutomatedAssignment } from '../actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Wand2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem('schedulingData');
    if (storedData) {
      setData(JSON.parse(storedData));
    } else {
      router.push('/scheduling');
    }
  }, [router]);

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

    const taskTotals: Record<string, number> = {};
    data.tasks.forEach(task => {
      taskTotals[task.id] = 0;
      data.operatives.forEach(op => {
        const assignedSam = assignments[task.id]?.[op.id] || 0;
        operativeTotals[op.id] += assignedSam;
        taskTotals[task.id] += assignedSam;
      });
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

  if (!data) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Matriz de Asignación</h1>
          <p className="text-muted-foreground">Ajuste manualmente o asigne automáticamente la carga de trabajo a los operarios.</p>
        </div>
        <Button onClick={handleAutoAssign} disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          Asignar Automáticamente
        </Button>
      </div>

      {aiSummary && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Resumen de Asignación de IA</AlertTitle>
          <AlertDescription>{aiSummary}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-card z-10 w-[300px]">Tarea</TableHead>
                  <TableHead className="text-right w-[120px]">SAM Requerido</TableHead>
                  <TableHead className="text-right w-[120px]">SAM Asignado</TableHead>
                  {data.operatives.map(op => (
                    <TableHead key={op.id} className="text-center w-[150px]">{op.id}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tasks.map(task => {
                  const assigned = totals.taskTotals[task.id] || 0;
                  const required = task.totalSam;
                  const isBalanced = Math.abs(assigned - required) < 0.01;
                  return (
                    <TableRow key={task.id}>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium w-[300px]">
                        <div className="font-bold">{task.operation}</div>
                        <div className="text-xs text-muted-foreground">{task.orderId} / {task.productDescription}</div>
                      </TableCell>
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
                  <th colSpan={3} className="p-2 text-right font-bold sticky left-0 bg-secondary z-10">Total Asignado por Operario</th>
                  {data.operatives.map(op => {
                     const total = totals.operativeTotals[op.id] || 0;
                     const available = op.availableTime;
                     const usage = available > 0 ? (total / available) * 100 : 0;
                     const isOverloaded = total > available;
                    return (
                        <th key={op.id} className="p-2 text-center font-normal">
                            <div className={`font-bold ${isOverloaded ? 'text-red-600' : ''}`}>{total.toFixed(2)} / {available}</div>
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
    </div>
  );
}

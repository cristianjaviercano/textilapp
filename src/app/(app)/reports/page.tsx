"use client";

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { ChartConfig } from '@/components/ui/chart';

// This is mock data representing a completed schedule.
// In a real app, this would come from the assignment results.
const mockScheduleData = [
  { task: 'Cut Fabric', operative: 'Op 1', start: 0, end: 550, fill: "var(--color-op1)" },
  { task: 'Sew Sleeves', operative: 'Op 2', start: 0, end: 820, fill: "var(--color-op2)" },
  { task: 'Attach Collar', operative: 'Op 3', start: 0, end: 410, fill: "var(--color-op3)" },
  { task: 'Cut Denim', operative: 'Op 1', start: 550, end: 900, fill: "var(--color-op1)" },
  { task: 'Sew Legs', operative: 'Op 4', start: 0, end: 765, fill: "var(--color-op4)" },
  { task: 'Add Pockets', operative: 'Op 5', start: 0, end: 640, fill: "var(--color-op5)" },
  { task: 'Cut Fabric', operative: 'Op 6', start: 0, end: 450, fill: "var(--color-op6)" },
  { task: 'Sew Body', operative: 'Op 7', start: 0, end: 712.5, fill: "var(--color-op7)" },
  { task: 'Sew Sleeves', operative: 'Op 8', start: 0, end: 205, fill: "var(--color-op8)" },
];

const chartConfig = {
  op1: { label: 'Op 1', color: 'hsl(var(--chart-1))' },
  op2: { label: 'Op 2', color: 'hsl(var(--chart-2))' },
  op3: { label: 'Op 3', color: 'hsl(var(--chart-3))' },
  op4: { label: 'Op 4', color: 'hsl(var(--chart-4))' },
  op5: { label: 'Op 5', color: 'hsl(var(--chart-5))' },
  op6: { label: 'Op 6', color: 'hsl(var(--chart-1))' },
  op7: { label: 'Op 7', color: 'hsl(var(--chart-2))' },
  op8: { label: 'Op 8', color: 'hsl(var(--chart-3))' },
} satisfies ChartConfig;


export default function ReportsPage() {
    
  const transformedData = useMemo(() => {
    const dataByTask: { [key: string]: any } = {};
    mockScheduleData.forEach(item => {
        if (!dataByTask[item.task]) {
            dataByTask[item.task] = { task: item.task };
        }
        const opKey = item.operative.replace(' ', '').toLowerCase();
        dataByTask[item.task][opKey] = item.end - item.start;
    });
    return Object.values(dataByTask);
  }, []);

  const kpis = useMemo(() => {
      const makespan = Math.max(...mockScheduleData.map(d => d.end));
      const totalWorkTime = mockScheduleData.reduce((acc, d) => acc + (d.end - d.start), 0);
      const totalAvailableTime = 8 * 480; // 8 operatives, 480 min each
      const utilization = (totalWorkTime / totalAvailableTime) * 100;
      return {
          makespan: `${makespan.toFixed(2)} min`,
          utilization: `${utilization.toFixed(2)}%`,
          tasks: mockScheduleData.length,
          operatives: 8,
      }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Reports & Analytics</h1>
          <p className="text-muted-foreground">Visualize schedules and key performance indicators.</p>
        </div>
        <Button variant="outline" onClick={() => alert("PDF export functionality would be implemented here.")}>
          <Download className="mr-2 h-4 w-4" />
          Export to PDF
        </Button>
      </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Makespan</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpis.makespan}</div>
                    <p className="text-xs text-muted-foreground">Total time to complete all tasks</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpis.utilization}</div>
                     <p className="text-xs text-muted-foreground">Based on {kpis.operatives} operatives</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpis.tasks}</div>
                    <p className="text-xs text-muted-foreground">Assigned across all operatives</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Operatives</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{kpis.operatives}</div>
                    <p className="text-xs text-muted-foreground">Included in schedule</p>
                </CardContent>
            </Card>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Gantt Chart Simulation</CardTitle>
          <CardDescription>
            This chart shows the total time (SAM) allocated to each task, distributed by operative.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[400px] w-full">
            <BarChart
              data={transformedData}
              layout="vertical"
              stackOffset="expand"
              margin={{
                left: 50,
                right: 20
              }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="task"
                type="category"
                tickLine={false}
                axisLine={false}
                width={100}
                tick={{ fill: 'hsl(var(--foreground))' }}
              />
              <XAxis 
                type="number" 
                tick={{ fill: 'hsl(var(--foreground))' }}
                domain={[0, 'dataMax + 100']}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              {Object.keys(chartConfig).map(key => (
                  <Bar 
                    key={key} 
                    dataKey={key} 
                    stackId="a" 
                    fill={chartConfig[key as keyof typeof chartConfig].color} 
                    radius={[4, 4, 4, 4]}
                    />
              ))}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}

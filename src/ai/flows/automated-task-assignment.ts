'use server';

/**
 * @fileOverview An automated task assignment AI agent.
 *
 * - automatedTaskAssignment - A function that suggests task assignments to operatives.
 * - AutomatedTaskAssignmentInput - The input type for the automatedTaskAssignment function.
 * - AutomatedTaskAssignmentOutput - The return type for the automatedTaskAssignment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TaskSchema = z.object({
  orderId: z.string().describe('The ID of the production order.'),
  prenda: z.string().describe('The garment or item being produced.'),
  operacion: z.string().describe('The specific operation to be performed.'),
  samRequeridoTotal: z
    .number()
    .describe('The total Standard Allowed Minutes required for the operation.'),
});

const OperativeSchema = z.object({
  operativeId: z.string().describe('The unique identifier for the operative.'),
  tiempoDisponible: z
    .number()
    .describe('The available working time in minutes for the operative.'),
});

const AutomatedTaskAssignmentInputSchema = z.object({
  operatives: z.array(OperativeSchema).describe('The list of operatives available.'),
  tasks: z.array(TaskSchema).describe('The list of tasks to be assigned.'),
  nivelacionUnidad: z
    .number()
    .describe('The unit of leveling in minutes, e.g., 60 for hourly leveling.'),
});

export type AutomatedTaskAssignmentInput = z.infer<typeof AutomatedTaskAssignmentInputSchema>;

const AssignmentSchema = z.object({
  operativeId: z.string().describe('The ID of the operative assigned to the task.'),
  taskId: z.string().describe('The ID of the task assigned to the operative (orderId).'),
  samAsignado: z
    .number()
    .describe('The Standard Allowed Minutes assigned to this operative for this task.'),
});

const AutomatedTaskAssignmentOutputSchema = z.object({
  assignments: z.array(AssignmentSchema).describe('The list of suggested task assignments.'),
  summary: z.string().describe('A summary of the assignment process and results.'),
});

export type AutomatedTaskAssignmentOutput = z.infer<typeof AutomatedTaskAssignmentOutputSchema>;

export async function automatedTaskAssignment(
  input: AutomatedTaskAssignmentInput
): Promise<AutomatedTaskAssignmentOutput> {
  return automatedTaskAssignmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automatedTaskAssignmentPrompt',
  input: {schema: AutomatedTaskAssignmentInputSchema},
  output: {schema: AutomatedTaskAssignmentOutputSchema},
  prompt: `You are an expert industrial engineer specializing in optimizing workload distribution in textile manufacturing.

Given the available operatives and the tasks that need to be completed, suggest an optimal assignment of tasks to operatives to balance the workload.
Consider the available time for each operative and the total SAM (Standard Allowed Minutes) required for each task.
If a task cannot be fully assigned to one operative, split the task and assign portions to multiple operatives.
Provide a clear and concise summary of the assignment process, including the rationale behind your suggestions and any limitations encountered.

Operatives:
{{#each operatives}}
- Operative ID: {{operativeId}}, Available Time: {{tiempoDisponible}} minutes
{{/each}}

Tasks:
{{#each tasks}}
- Order ID: {{orderId}}, Garment: {{prenda}}, Operation: {{operacion}}, SAM Required: {{samRequeridoTotal}} minutes
{{/each}}

Unit of Leveling: {{nivelacionUnidad}} minutes

Output:
Suggest task assignments to operatives to balance the workload:

Assignments:
[
  {
    "operativeId": "<operative_id>",
    "taskId": "<order_id>",
    "samAsignado": <sam_minutes>
  },
  // ... more assignments
]

Summary: <summary_of_assignment_process>
`,
});

const automatedTaskAssignmentFlow = ai.defineFlow(
  {
    name: 'automatedTaskAssignmentFlow',
    inputSchema: AutomatedTaskAssignmentInputSchema,
    outputSchema: AutomatedTaskAssignmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

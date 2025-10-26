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
  prompt: `You are an expert industrial engineer specializing in optimizing workload distribution in textile manufacturing. Your goal is to assign tasks to operatives using a heuristic approach to balance the workload.

Follow this specific logic:
1.  Go through the tasks one by one.
2.  For each task, start with the first operative.
3.  If the operative has enough available time to complete the entire task, assign the full SAM of the task to them and update their available time.
4.  If the operative does not have enough time, assign only the remaining available time of that operative to the task.
5.  The remaining SAM for that task must then be assigned to the next available operative. Continue this process, splitting the task across multiple operatives if necessary, until the entire SAM for the task is assigned.
6.  Proceed to the next task and repeat the process, starting again with the first operative that has available time.

The objective is to fill each operative's time before moving to the next, splitting tasks as required.

Operatives:
{{#each operatives}}
- Operative ID: {{operativeId}}, Available Time: {{tiempoDisponible}} minutes
{{/each}}

Tasks:
{{#each tasks}}
- Task ID (orderId): {{orderId}}, Garment: {{prenda}}, Operation: {{operacion}}, SAM Required: {{samRequeridoTotal}} minutes
{{/each}}

Unit of Leveling: {{nivelacionUnidad}} minutes (This is for context, the main constraint is 'tiempoDisponible').

Output Format:
Provide a JSON object with "assignments" and a "summary".
For "assignments", create an array where each entry represents a full or partial assignment of a task to an operative.
For "summary", provide a clear and concise summary of the assignment process, including the rationale behind your suggestions and any limitations encountered.
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

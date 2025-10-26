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
  prompt: `You are an expert industrial engineer specializing in optimizing workload distribution in textile manufacturing. Your goal is to assign tasks to operatives using a sequential heuristic approach to balance the workload.

Follow this specific logic meticulously:
1.  Initialize the workload for all operatives to zero. Start with the first operative.
2.  Iterate through each task one by one.
3.  For each task, determine its total required SAM ('samRequeridoTotal').
4.  You will attempt to assign the remaining SAM of the current task to the current operative.
5.  Check the current operative's remaining available time ('tiempoDisponible' - their current workload).
6.  The amount of time to assign in this step is the *minimum* of either the task's remaining SAM or the operative's remaining available time.
7.  Add this assigned time to the operative's workload and record it as a partial or full assignment for that task.
8.  Subtract the assigned time from the task's remaining SAM.
9.  If the task still has SAM left to be assigned (meaning the operative's time was filled before the task was completed), you MUST move to the *next* operative and repeat steps 5-8 for the *same* task.
10. If the task has no SAM remaining, move to the *next* task and start again from the current operative (or the next one if the current one is now full).
11. An operative is considered "full" when their workload is equal to their 'tiempoDisponible'. If an operative becomes full, immediately move to the next operative.

The objective is to fill each operative's available time sequentially, splitting tasks across operatives only when necessary.

Operatives:
{{#each operatives}}
- Operative ID: {{operativeId}}, Available Time: {{tiempoDisponible}} minutes
{{/each}}

Tasks:
{{#each tasks}}
- Task ID (orderId): {{orderId}}, Garment: {{prenda}}, Operation: {{operacion}}, SAM Required: {{samRequeridoTotal}} minutes
{{/each}}

Unit of Leveling: {{nivelacionUnidad}} minutes (This is for context; the primary constraint is 'tiempoDisponible'. The goal is to fill the available time).

Output Format:
Provide a JSON object with "assignments" and a "summary".
- For "assignments", create an array. Each entry must represent a full or partial assignment of a task to an operative, containing 'operativeId', 'taskId', and 'samAsignado'.
- For "summary", provide a clear and concise summary of the assignment process. Explicitly mention if more operatives are needed to complete the work, or if some operatives were not assigned any work and could be removed.
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

'use server';

import { automatedTaskAssignment } from '@/ai/flows/automated-task-assignment';
import type { AutomatedTaskAssignmentInput, AutomatedTaskAssignmentOutput } from '@/ai/flows/automated-task-assignment';

export async function runAutomatedAssignment(input: AutomatedTaskAssignmentInput): Promise<{
    success: boolean;
    data?: AutomatedTaskAssignmentOutput;
    error?: string;
}> {
  console.log("Running automated assignment with input:", JSON.stringify(input, null, 2));
  if (!input.operatives || input.operatives.length === 0 || !input.tasks || input.tasks.length === 0) {
    return { success: false, error: 'Invalid input: Operatives and tasks are required.' };
  }

  try {
    const result = await automatedTaskAssignment(input);
    console.log("AI flow result:", result);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in automated assignment flow:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: `Failed to run automated assignment: ${errorMessage}` };
  }
}

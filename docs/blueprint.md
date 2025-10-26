# **App Name**: TextileFlow Scheduler

## Core Features:

- BOM Management: CRUD operations for managing the Bill of Materials, including adding, modifying, deleting, and loading product data from CSV files.
- Production Order Management: Create, manage, and track production orders with details such as client name, delivery date, priority, and order details, referencing BOM data.
- Workload Leveling: Balance workload by allowing manual adjustment and offering automated suggestions to reach optimal allocation. Use a matrix display.
- Sequential Assignment Tool: Implement a heuristic for sequential task assignment with task splitting, automatically assigning tasks to operatives based on available time and task requirements.
- Reporting and Visualization: Generate Gantt charts and key performance indicators to visualize workload distribution and operative utilization, with export functionality to PDF.
- Home Screen Navigation: Act as the central navigation point, containing clear and minimalist buttons that direct to the main sections: BOM management, order generation, scheduling, and reports.

## Style Guidelines:

- Primary color: Light gray (#F5F5F5) for the main background, providing a clean, macOS-inspired aesthetic.
- Text color: Dark gray (#222222) for high readability against the light background.
- Accent color: Medium gray (#808080) for interactive elements like buttons and selections, with subtle tone changes on hover/active states to indicate interactivity.
- Font: 'Helvetica', a sans-serif font, should be employed, because it's a clean and very legible font reminiscent of macOS; use 'Bold' for titles, 'Regular' for body text.
- Prioritize whitespace (padding and margins) to create a structured, well-organized, and visually uncluttered user interface.
- Employ minimalist icons for buttons and navigation, using simple, monochrome representations to maintain the clean aesthetic.
- Implement subtle animations (e.g., smooth transitions, fade-in effects) for interactive elements to provide feedback without being intrusive.
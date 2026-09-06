export interface MedicationSchedule {
  id: string;
  elderId: string;
  label: string;
  timeOfDay: string; // 24-hour "HH:MM"
  createdAt: string;
}

---
title: "Reports Dashboard"
description: "Operational dashboard with KPIs, charts, and analytics for clinic management"
---

# Reports Dashboard

The **Reports Dashboard** (`/reports`) provides an operational overview of clinic activities through key performance indicators (KPIs), charts, and audit tables.

## Overview

The dashboard is designed for clinic administrators and managers to monitor:
- Inventory health and stock value
- Patient flow and appointment density
- Items requiring attention (expiring stock)

## IAM Permissions

Access to the Reports module requires:

| Permission Key | Description |
| :--- | :--- |
| `appointments.read` | Required to view the Reports dashboard |

## Features

### 1. KPI Cards

Four key performance indicator cards:

| KPI | Description | Permission Required |
|-----|-------------|---------------------|
| **Total Stock Value** | Sum of all inventory items (quantity × unit_price) | `inventory.read` + finance context |
| **Patients Today** | Count of appointments scheduled for today | `appointments.read` |
| **Low Stock Alerts** | Count of items below minimum stock threshold | `inventory.read` |
| **Total Movements** | Count of inventory transactions (entries/exits) | `inventory.read` |

### 2. Weekly Stock Flow Chart

A bar chart showing inventory movements over the past 7 days:
- **Blue bars**: Stock entries (purchases, returns)
- **Teal bars**: Stock exits (consumption, discards)
- X-axis: Days of the week
- Y-axis: Quantity of items

### 3. Appointment Density Chart

A timeline showing appointment distribution throughout the day:
- Shows number of appointments per hour
- Helps identify peak hours and staffing needs

### 4. Expiry Audit Table

Critical items table showing inventory nearing expiration:
- Items expiring within 30 days
- Color-coded urgency (approaching expiration highlighted)
- Columns: Product Name, Batch/Lot, Expiry Date, Quantity, Days Until Expiry

## Source

- **Component**: `frontend/src/app/features/reports/reports.component.ts`
- **Services Used**:
  - `InventoryService` - Stock data and movements
  - `AppointmentService` - Appointment counts
  - `PatientService` - Patient statistics
  - `IamService` - Permission checks

## Technical Implementation

### Chart Rendering

The dashboard uses CSS-based chart rendering (no external charting library required):
- Bar charts built with Tailwind CSS `bg-*` classes
- Dynamic width/height based on data values
- Responsive layout that adapts to container size

### Data Loading

```typescript
// Signal-based reactive data loading
@Component({
  selector: 'app-reports',
  standalone: true,
  template: `
    @if (isLoading()) {
      <div class="animate-pulse">Loading...</div>
    } @else {
      <!-- KPI Cards -->
      <!-- Charts -->
      <!-- Audit Table -->
    }
  `
})
export class ReportsComponent {
  private inventory = inject(InventoryService);
  private appointments = inject(AppointmentService);
  private context = inject(ClinicContextService);

  // Reactive signals for all dashboard data
}
```

## Related Documentation

- [Inventory Module](./inventory.md) - Detailed inventory management
- [Reception Module](./reception.md) - Appointment scheduling

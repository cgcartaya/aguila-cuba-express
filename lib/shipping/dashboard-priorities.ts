export type PriorityShipment={id:string;status:string;assigned_staff_id?:string|null;assigned_driver_id?:string|null;assigned_driver_name?:string|null};
export function needsAssignment(row:PriorityShipment){return !['delivered','cancelled'].includes(row.status)&&!row.assigned_staff_id&&!row.assigned_driver_id&&!row.assigned_driver_name;}
export function priorityGroup(row:PriorityShipment){return row.status==='issue'?'issues':row.status==='received_cuba'?'cuba':needsAssignment(row)?'unassigned':null;}

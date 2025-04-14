# Overtime and Transportation Management System - Approval Workflow

This document describes the hierarchical approval system implemented for the Overtime and Transportation Management System.

## Overview

The system now supports a multi-level approval workflow for overtime and transportation entries:

1. **Initial Data Entry**: Standard admins can create entries, which start with "Pending" status
2. **District Supervisor Approval**: First level of approval 
3. **Regional Accountant Approval**: Second level, with ability to adjust amounts
4. **Regional Director Approval**: Final approval

Each level of the hierarchy can view data from lower levels but can only edit and approve according to their role's permissions.

## Admin Roles

The system now supports four admin roles with different permissions:

1. **Standard Admin**
   - Can add new entries
   - Can edit only pending entries
   - Cannot approve or reject entries

2. **District Supervisor**
   - Can approve or reject pending entries
   - Can edit pending and supervisor-approved entries
   - Can view all entries in their district

3. **Regional Accountant**
   - Can approve entries that have been approved by a supervisor
   - Can adjust monetary amounts for overtime and transportation
   - Can edit entries until they receive final approval

4. **Regional Director**
   - Can give final approval to entries approved by an accountant
   - Cannot edit entries (view-only)
   - Can view detailed approval history

## Approval Status Flow

Entries progress through these status states:

1. **Pending**: Initial state after creation
2. **Supervisor**: Approved by a District Supervisor
3. **Accountant**: Approved by a Regional Accountant
4. **Approved**: Final approval by a Regional Director
5. **Rejected**: Can be rejected at any stage

## Key Features

1. **Entry Time Editing**:
   - Added ability to edit entry/exit times for a worker's overtime record
   - Editing is restricted based on the entry's approval status and admin role

2. **Approval Buttons**:
   - Each role sees appropriate approval buttons based on the entry's current status
   - Visual indicators show the current approval state

3. **Amount Calculations**:
   - Category A overtime is multiplied by 2 to get the amount
   - Category C overtime is multiplied by 3 to get the amount
   - Amounts are automatically calculated but can be overridden by accountants

4. **Audit Trail**:
   - The system tracks who edited an entry and when
   - The system tracks who approved or rejected an entry and when
   - Rejection requires providing a reason

5. **Filtering and Searching**:
   - Monthly summary can be filtered by approval status
   - Search functionality works across all data fields

## Technical Implementation

1. Database schema changes:
   - Added role field to admin table
   - Added approval status fields to overtime entries
   - Added tracking fields for edits and approvals
   - Added amount calculation fields

2. API endpoints:
   - New endpoint for approving entries
   - New endpoint for rejecting entries
   - Enhanced entry update endpoint with permission checks

3. UI Components:
   - Added WorkerDetailsEdit component for editing entries
   - Enhanced summary views with approval status badges
   - Added role-specific editing controls

## Getting Started

1. Run the database migration scripts to update your schema
2. Create admin accounts with appropriate roles
3. Start using the system with the new approval workflow

## Database Migration

Run the following SQL scripts in order:
1. `database_update.sql` - Adds basic approval fields
2. `database_approval_schema.sql` - Creates complete approval schema 
/**
 * Maps internal role names to display names
 * @param role The internal role name from the database
 * @returns The user-friendly display name
 */
export const getDisplayRole = (role: string): string => {
  switch (role) {
    case 'Standard':
      return 'Dist Head';
    case 'District_Head':
      return 'Dist Head';
    case 'Supervisor':
      return 'RDM';
    case 'RDM':
      return 'RDM';
    case 'Director':
    case 'RCM':
      return 'RCM';
    case 'Accountant':
      return 'Accountant';
    case 'Developer':
      return 'Developer';
    default:
      return role || 'Staff';
  }
};

/**
 * Maps internal role names to full display names
 * @param role The internal role name from the database
 * @returns The full display name
 */
export const getFullDisplayRole = (role: string): string => {
  switch (role) {
    case 'Standard':
      return 'District Head';
    case 'District_Head':
      return 'District Head';
    case 'Supervisor':
      return 'RDM';
    case 'RDM':
      return 'RDM';
    case 'Director':
    case 'RCM':
      return 'RCM';
    case 'Accountant':
      return 'Regional Accountant';
    case 'Developer':
      return 'System Developer';
    default:
      return role || 'Staff';
  }
};

/**
 * Maps approval status to display names
 * @param status The internal approval status
 * @returns The user-friendly display name
 */
export const getDisplayApprovalStatus = (status: string): string => {
  switch (status) {
    case 'Standard':
      return 'Dist Head';
    case 'District_Head':
      return 'Dist Head';
    case 'Supervisor':
      return 'RDM';
    case 'RDM':
      return 'RDM';
    case 'Director':
    case 'RCM':
      return 'RCM';
    case 'Pending':
      return 'Pending RCM Approval';
    default:
      return status;
  }
}; 
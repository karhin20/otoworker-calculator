/**
 * Maps internal role names to display names
 * @param role The internal role name from the database
 * @returns The user-friendly display name
 */
export const getDisplayRole = (role: string): string => {
  switch (role) {
    case 'Standard':
      return 'Dist Head';
    case 'Supervisor':
      return 'RDM';
    case 'Director':
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
    case 'Supervisor':
      return 'RDM';
    case 'Director':
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
 * Maps approval status to display names
 * @param status The internal approval status
 * @returns The user-friendly display name
 */
export const getDisplayApprovalStatus = (status: string): string => {
  switch (status) {
    case 'Standard':
      return 'Dist Head';
    case 'Supervisor':
      return 'RDM';
    case 'Director':
      return 'RCM';
    default:
      return status;
  }
}; 
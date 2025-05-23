import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { ApprovalStatus } from "@/types";

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

/**
 * Gets appropriate badge for approval status
 * @param status The internal approval status
 * @returns A TSX element representing the status badge
 */
export function getApprovalBadge(status: ApprovalStatus) {
  switch (status) {
    case "Pending":
      return <Badge variant="outline" className="flex items-center gap-1 text-xs py-1"><Clock className="h-3.5 w-3.5" /> Pending</Badge>;
    case "Standard":
      return <Badge variant="secondary" className="flex items-center gap-1 text-xs py-1 bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3.5 w-3.5" /> Dist Head</Badge>;
    case "Supervisor":
      return <Badge variant="secondary" className="flex items-center gap-1 text-xs py-1 bg-blue-100 text-blue-800 border-blue-200"><CheckCircle2 className="h-3.5 w-3.5" /> RDM</Badge>;
    case "Accountant":
      return <Badge variant="secondary" className="flex items-center gap-1 text-xs py-1 bg-purple-100 text-purple-800 border-purple-200"><CheckCircle2 className="h-3.5 w-3.5" /> Accountant</Badge>;
    case "Approved":
      return <Badge variant="success" className="flex items-center gap-1 text-xs py-1"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</Badge>;
    case "Rejected":
      return <Badge variant="destructive" className="flex items-center gap-1 text-xs py-1"><AlertCircle className="h-3.5 w-3.5" /> Rejected</Badge>;
    default:
      return <Badge variant="outline" className="flex items-center gap-1 text-xs py-1"><Clock className="h-3.5 w-3.5" /> Pending</Badge>;
  }
} 
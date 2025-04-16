import React from "react";
import { getDisplayRole, getFullDisplayRole } from "@/utils/displayRoles";

interface RoleBadgeProps {
  role: string;
  showFullName?: boolean;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role, showFullName = false }) => {
  if (!role) return null;
  
  const displayRole = showFullName ? getFullDisplayRole(role) : getDisplayRole(role);
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      {displayRole}
    </span>
  );
};

export default RoleBadge; 
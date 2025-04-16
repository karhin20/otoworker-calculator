import React from "react";
import { getDisplayRole, getFullDisplayRole } from "@/utils/displayRoles";

interface RoleBadgeProps {
  role: string;
  showFullName?: boolean;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role, showFullName = false }) => {
  if (!role) return null;
  
  const displayRole = showFullName ? getFullDisplayRole(role) : getDisplayRole(role);
  
  // Define background and text colors based on the role
  let bgColor = "bg-blue-100";
  let textColor = "text-blue-800";
  
  switch (role) {
    case "Standard":
    case "District_Head":
      bgColor = "bg-green-100";
      textColor = "text-green-800";
      break;
    case "Supervisor":
    case "RDM":
      bgColor = "bg-blue-100";
      textColor = "text-blue-800";
      break;
    case "Accountant":
      bgColor = "bg-purple-100";
      textColor = "text-purple-800";
      break;
    case "Director":
    case "RCM":
      bgColor = "bg-amber-100";
      textColor = "text-amber-800";
      break;
    default:
      // Keep the default blue
      break;
  }
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {displayRole}
    </span>
  );
};

export default RoleBadge; 
"use client";

import { User, MessageCircle, Building, Truck, Tag } from "lucide-react";
import { cn } from "@/features/shared/lib/utils/index";
import type { ContactStatus } from "@prisma/client";

interface ContactType {
  value: ContactStatus;
  label: string;
  description: string;
  icon: typeof User;
  color: string;
}

const contactTypes: ContactType[] = [
  {
    value: "PERSONAL",
    label: "Personal",
    description: "Individual contact",
    icon: User,
    color: "blue",
  },
  {
    value: "ENQUIRY",
    label: "Enquiry",
    description: "Potential client",
    icon: MessageCircle,
    color: "yellow",
  },
  {
    value: "CLIENT",
    label: "Client",
    description: "Individual or business client",
    icon: Building,
    color: "green",
  },
  {
    value: "SUPPLIER",
    label: "Supplier",
    description: "Service provider",
    icon: Truck,
    color: "purple",
  },
];

interface ContactTypeSelectorProps {
  value?: ContactStatus;
  onChange: (value: ContactStatus) => void;
}

export function ContactTypeSelector({
  value,
  onChange,
}: ContactTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <label className="text-sm font-medium">Contact Type</label>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {contactTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.value;

          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange(type.value)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all text-left",
                "hover:bg-muted/50",
                isSelected
                  ? cn(
                      "border-primary bg-primary/5",
                      type.color === "blue" && "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
                      type.color === "yellow" && "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20",
                      type.color === "green" && "border-green-500 bg-green-50 dark:bg-green-950/20",
                      type.color === "purple" && "border-purple-500 bg-purple-50 dark:bg-purple-950/20",
                    )
                  : "border-border bg-background",
              )}
            >
              <Icon
                className={cn(
                  "h-6 w-6",
                  isSelected
                    ? cn(
                        type.color === "blue" && "text-blue-600",
                        type.color === "yellow" && "text-yellow-600",
                        type.color === "green" && "text-green-600",
                        type.color === "purple" && "text-purple-600",
                      )
                    : "text-muted-foreground",
                )}
              />
              <div className="flex flex-col items-center gap-0.5">
                <span
                  className={cn(
                    "text-sm font-medium",
                    isSelected ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {type.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {type.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


"use client";

import { ChevronDown, MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/features/shared/components/ui/collapsible";
import { Input } from "@/features/shared/components/ui/input";
import {
  Select,
  type SelectOption,
} from "@/features/shared/components/ui/select";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { cn } from "@/features/shared/lib/utils/index";
import type {
  CreateContactInput,
  UpdateContactInput,
} from "../schemas/contact.schema";

const addressTypeOptions: SelectOption[] = [
  { value: "HOME", label: "Home" },
  { value: "WORK", label: "Work" },
  { value: "BILLING", label: "Billing" },
  { value: "SHIPPING", label: "Shipping" },
  { value: "OTHER", label: "Other" },
];

export function ContactAddressesField() {
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [openAddresses, setOpenAddresses] = useState<Record<number, boolean>>(
    {},
  );
  const {
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useFormContext<CreateContactInput | UpdateContactInput>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "addresses",
  });

  const addresses = watch("addresses") || [];

  const addAddress = () => {
    append({
      type: "OTHER",
      addressLine1: "",
      city: "",
      postalCode: "",
      country: "",
      isPrimary: false,
      isActive: true,
    });
    // Open the new address automatically
    const newIndex = fields.length;
    setOpenAddresses((prev) => ({ ...prev, [newIndex]: true }));
  };

  const handlePrimaryChange = (index: number, isPrimary: boolean) => {
    if (isPrimary) {
      // Unset all other primary addresses
      addresses.forEach((_, i) => {
        if (i !== index) {
          setValue(`addresses.${i}.isPrimary`, false);
        }
      });
    }
    setValue(`addresses.${index}.isPrimary`, isPrimary);
  };

  const toggleAddress = (index: number) => {
    setOpenAddresses((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const isLoading = isSubmitting;

  return (
    <Collapsible
      open={addressesOpen}
      onOpenChange={setAddressesOpen}
      className="space-y-4 pt-2 border-t"
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between h-auto font-semibold"
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Addresses</span>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              addressesOpen && "transform rotate-180",
            )}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-4 pb-6">
        {fields.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No addresses added yet. Click "Add Address" to add one.
            </CardContent>
          </Card>
        )}

        {fields.map((field, index) => {
          const isPrimary = watch(`addresses.${index}.isPrimary`);
          const addressOpen = openAddresses[index] ?? true;

          return (
            <Card key={field.id}>
              <Collapsible
                open={addressOpen}
                onOpenChange={() => toggleAddress(index)}
              >
                <CardHeader className="pb-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full justify-between h-auto"
                    >
                      <CardTitle className="text-base flex items-center gap-2">
                        Address {index + 1}
                        {isPrimary && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Primary
                          </span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(index);
                          }}
                          disabled={isLoading}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform",
                            addressOpen && "transform rotate-180",
                          )}
                        />
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-0 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor={`addresses.${index}.type`}
                          className="text-sm font-medium"
                        >
                          Address Type{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <Controller
                          name={`addresses.${index}.type`}
                          control={control}
                          render={({ field: fieldProps }) => (
                            <Select
                              value={fieldProps.value}
                              onValueChange={fieldProps.onChange}
                              options={addressTypeOptions}
                              placeholder="Select address type..."
                            />
                          )}
                        />
                        {errors.addresses?.[index]?.type && (
                          <p className="text-sm text-destructive">
                            {errors.addresses[index]?.type?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`addresses.${index}.label`}
                          className="text-sm font-medium"
                        >
                          Label{" "}
                          <span className="text-muted-foreground">
                            (optional)
                          </span>
                        </label>
                        <Input
                          id={`addresses.${index}.label`}
                          placeholder="e.g., Main Office"
                          disabled={isLoading}
                          {...control.register(`addresses.${index}.label`)}
                        />
                        {errors.addresses?.[index]?.label && (
                          <p className="text-sm text-destructive">
                            {errors.addresses[index]?.label?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`addresses.${index}.addressLine1`}
                        className="text-sm font-medium"
                      >
                        Address Line 1{" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id={`addresses.${index}.addressLine1`}
                        placeholder="Street address, P.O. box"
                        disabled={isLoading}
                        {...control.register(`addresses.${index}.addressLine1`)}
                      />
                      {errors.addresses?.[index]?.addressLine1 && (
                        <p className="text-sm text-destructive">
                          {errors.addresses[index]?.addressLine1?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`addresses.${index}.addressLine2`}
                        className="text-sm font-medium"
                      >
                        Address Line 2{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </label>
                      <Input
                        id={`addresses.${index}.addressLine2`}
                        placeholder="Apartment, suite, unit, building, floor, etc."
                        disabled={isLoading}
                        {...control.register(`addresses.${index}.addressLine2`)}
                      />
                      {errors.addresses?.[index]?.addressLine2 && (
                        <p className="text-sm text-destructive">
                          {errors.addresses[index]?.addressLine2?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor={`addresses.${index}.locality`}
                          className="text-sm font-medium"
                        >
                          Locality{" "}
                          <span className="text-muted-foreground">
                            (optional)
                          </span>
                        </label>
                        <Input
                          id={`addresses.${index}.locality`}
                          placeholder="Neighborhood or district"
                          disabled={isLoading}
                          {...control.register(`addresses.${index}.locality`)}
                        />
                        {errors.addresses?.[index]?.locality && (
                          <p className="text-sm text-destructive">
                            {errors.addresses[index]?.locality?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`addresses.${index}.city`}
                          className="text-sm font-medium"
                        >
                          City <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id={`addresses.${index}.city`}
                          placeholder="City"
                          disabled={isLoading}
                          {...control.register(`addresses.${index}.city`)}
                        />
                        {errors.addresses?.[index]?.city && (
                          <p className="text-sm text-destructive">
                            {errors.addresses[index]?.city?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor={`addresses.${index}.county`}
                          className="text-sm font-medium"
                        >
                          County{" "}
                          <span className="text-muted-foreground">
                            (optional)
                          </span>
                        </label>
                        <Input
                          id={`addresses.${index}.county`}
                          placeholder="County or state"
                          disabled={isLoading}
                          {...control.register(`addresses.${index}.county`)}
                        />
                        {errors.addresses?.[index]?.county && (
                          <p className="text-sm text-destructive">
                            {errors.addresses[index]?.county?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`addresses.${index}.postalCode`}
                          className="text-sm font-medium"
                        >
                          Postal Code{" "}
                          <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id={`addresses.${index}.postalCode`}
                          placeholder="Postal/ZIP code"
                          disabled={isLoading}
                          {...control.register(`addresses.${index}.postalCode`)}
                        />
                        {errors.addresses?.[index]?.postalCode && (
                          <p className="text-sm text-destructive">
                            {errors.addresses[index]?.postalCode?.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`addresses.${index}.country`}
                          className="text-sm font-medium"
                        >
                          Country <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id={`addresses.${index}.country`}
                          placeholder="Country"
                          disabled={isLoading}
                          {...control.register(`addresses.${index}.country`)}
                        />
                        {errors.addresses?.[index]?.country && (
                          <p className="text-sm text-destructive">
                            {errors.addresses[index]?.country?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`addresses.${index}.notes`}
                        className="text-sm font-medium"
                      >
                        Notes{" "}
                        <span className="text-muted-foreground">
                          (optional)
                        </span>
                      </label>
                      <Textarea
                        id={`addresses.${index}.notes`}
                        placeholder="Additional notes about this address..."
                        disabled={isLoading}
                        rows={3}
                        {...control.register(`addresses.${index}.notes`)}
                      />
                      {errors.addresses?.[index]?.notes && (
                        <p className="text-sm text-destructive">
                          {errors.addresses[index]?.notes?.message}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 pt-2 border-t pb-4">
                      <Controller
                        name={`addresses.${index}.isPrimary`}
                        control={control}
                        render={({ field: fieldProps }) => (
                          <input
                            id={`addresses.${index}.isPrimary`}
                            type="checkbox"
                            checked={fieldProps.value}
                            onChange={(e) =>
                              handlePrimaryChange(index, e.target.checked)
                            }
                            disabled={isLoading}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        )}
                      />
                      <label
                        htmlFor={`addresses.${index}.isPrimary`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        Set as primary address
                      </label>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}

        {/* Add Address button - appears below existing addresses */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAddress}
          disabled={isLoading}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Address
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}

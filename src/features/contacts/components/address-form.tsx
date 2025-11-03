"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { Input } from "@/features/shared/components/ui/input";
import {
  Select,
  type SelectOption,
} from "@/features/shared/components/ui/select";
import { Textarea } from "@/features/shared/components/ui/textarea";
import type { AddressInput } from "../schemas/address.schema";
import { addressSchema } from "../schemas/address.schema";

interface AddressFormProps {
  contactId?: string;
  addressId?: string;
  initialData?: AddressInput & { id?: string };
  onSave: (data: AddressInput) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

// AddressFormProps interface - contactId is used for future enhancements

const addressTypeOptions: SelectOption[] = [
  { value: "HOME", label: "Home" },
  { value: "WORK", label: "Work" },
  { value: "BILLING", label: "Billing" },
  { value: "SHIPPING", label: "Shipping" },
  { value: "OTHER", label: "Other" },
];

export function AddressForm({
  addressId,
  initialData,
  onSave,
  onCancel,
  isLoading = false,
}: AddressFormProps) {
  const isEdit = !!addressId;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    control,
  } = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: initialData || {
      type: "OTHER",
      addressLine1: "",
      city: "",
      postalCode: "",
      country: "",
      isPrimary: false,
      isActive: true,
    },
  });

  const onSubmit = async (data: AddressInput) => {
    console.log("AddressForm onSubmit called with data:", data);
    try {
      setIsSubmitting(true);
      console.log("Calling onSave callback...");
      await onSave(data);
      console.log("onSave completed successfully");
    } catch (error) {
      console.error("Error in onSubmit:", error);
      setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to save address",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const loading = isLoading || isSubmitting;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-lg">
              {isEdit ? "Edit Address" : "Add Address"}
            </CardTitle>
          </div>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCancel}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription>
          {isEdit
            ? "Update the address information"
            : "Add a new address for this contact"}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {errors.root && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {errors.root.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">
                Address Type <span className="text-destructive">*</span>
              </label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    options={addressTypeOptions}
                    placeholder="Select address type..."
                  />
                )}
              />
              {errors.type && (
                <p className="text-sm text-destructive">
                  {errors.type.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="label" className="text-sm font-medium">
                Label <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="label"
                placeholder="e.g., Main Office"
                disabled={loading}
                aria-invalid={errors.label ? "true" : "false"}
                {...register("label")}
              />
              {errors.label && (
                <p className="text-sm text-destructive">
                  {errors.label.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="addressLine1" className="text-sm font-medium">
              Address Line 1 <span className="text-destructive">*</span>
            </label>
            <Input
              id="addressLine1"
              placeholder="Street address, P.O. box"
              disabled={loading}
              aria-invalid={errors.addressLine1 ? "true" : "false"}
              {...register("addressLine1")}
            />
            {errors.addressLine1 && (
              <p className="text-sm text-destructive">
                {errors.addressLine1.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="addressLine2" className="text-sm font-medium">
              Address Line 2{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="addressLine2"
              placeholder="Apartment, suite, unit, building, floor, etc."
              disabled={loading}
              aria-invalid={errors.addressLine2 ? "true" : "false"}
              {...register("addressLine2")}
            />
            {errors.addressLine2 && (
              <p className="text-sm text-destructive">
                {errors.addressLine2.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="locality" className="text-sm font-medium">
                Locality{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="locality"
                placeholder="Neighborhood or district"
                disabled={loading}
                aria-invalid={errors.locality ? "true" : "false"}
                {...register("locality")}
              />
              {errors.locality && (
                <p className="text-sm text-destructive">
                  {errors.locality.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="city" className="text-sm font-medium">
                City <span className="text-destructive">*</span>
              </label>
              <Input
                id="city"
                placeholder="City"
                disabled={loading}
                aria-invalid={errors.city ? "true" : "false"}
                {...register("city")}
              />
              {errors.city && (
                <p className="text-sm text-destructive">
                  {errors.city.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label htmlFor="county" className="text-sm font-medium">
                County <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="county"
                placeholder="County or state"
                disabled={loading}
                aria-invalid={errors.county ? "true" : "false"}
                {...register("county")}
              />
              {errors.county && (
                <p className="text-sm text-destructive">
                  {errors.county.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="postalCode" className="text-sm font-medium">
                Postal Code <span className="text-destructive">*</span>
              </label>
              <Input
                id="postalCode"
                placeholder="Postal/ZIP code"
                disabled={loading}
                aria-invalid={errors.postalCode ? "true" : "false"}
                {...register("postalCode")}
              />
              {errors.postalCode && (
                <p className="text-sm text-destructive">
                  {errors.postalCode.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="country" className="text-sm font-medium">
                Country <span className="text-destructive">*</span>
              </label>
              <Input
                id="country"
                placeholder="Country"
                disabled={loading}
                aria-invalid={errors.country ? "true" : "false"}
                {...register("country")}
              />
              {errors.country && (
                <p className="text-sm text-destructive">
                  {errors.country.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="notes"
              placeholder="Additional notes about this address..."
              disabled={loading}
              aria-invalid={errors.notes ? "true" : "false"}
              rows={3}
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-2 pb-4 border-t">
            <Controller
              name="isPrimary"
              control={control}
              render={({ field }) => (
                <input
                  id="isPrimary"
                  type="checkbox"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                  disabled={loading}
                  className="h-4 w-4 rounded border-gray-300"
                />
              )}
            />
            <label
              htmlFor="isPrimary"
              className="text-sm font-medium cursor-pointer"
            >
              Set as primary address
            </label>
          </div>
        </CardContent>
        <div className="px-6 pb-6 pt-2 flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={loading} className="ml-auto">
            {loading ? "Saving..." : isEdit ? "Update Address" : "Add Address"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

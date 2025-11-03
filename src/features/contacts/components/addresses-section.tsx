"use client";

import { MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { listAddressesAction } from "../actions/list-addresses.action";

interface AddressesSectionProps {
  contactId: string;
  initialAddresses?: Address[];
}

// Note: AddressesSection is now read-only only. Addresses are managed through the contact form.

interface Address {
  id: string;
  type: string;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  locality: string | null;
  city: string;
  county: string | null;
  postalCode: string;
  country: string;
  isPrimary: boolean;
  isActive: boolean;
  notes: string | null;
}

export function AddressesSection({
  contactId,
  initialAddresses = [],
}: AddressesSectionProps) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [isLoading, setIsLoading] = useState(false);

  const loadAddresses = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await listAddressesAction({
        addressableType: "Contact",
        addressableId: contactId,
      });

      if (result?.data?.success && result.data.addresses) {
        setAddresses(result.data.addresses as Address[]);
      }
    } catch (error) {
      console.error("Failed to load addresses:", error);
    } finally {
      setIsLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    // Use initial addresses if provided, otherwise fetch
    if (initialAddresses.length > 0) {
      setAddresses(initialAddresses);
    } else if (contactId) {
      loadAddresses();
    }
  }, [contactId, initialAddresses, loadAddresses]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Addresses</h3>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">
          Loading addresses...
        </div>
      ) : addresses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No addresses added yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {address.type}
                      {address.label && (
                        <span className="text-sm font-normal text-muted-foreground">
                          ({address.label})
                        </span>
                      )}
                      {address.isPrimary && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <div className="space-y-1">
                        <div>{address.addressLine1}</div>
                        {address.addressLine2 && (
                          <div>{address.addressLine2}</div>
                        )}
                        <div>
                          {[
                            address.locality,
                            address.city,
                            address.county,
                            address.postalCode,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </div>
                        <div>{address.country}</div>
                      </div>
                    </CardDescription>
                    {address.notes && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {address.notes}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

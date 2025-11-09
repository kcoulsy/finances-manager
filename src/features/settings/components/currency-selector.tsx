"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/features/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/features/shared/components/ui/card";
import { Select } from "@/features/shared/components/ui/select";
import { updateCurrencySchema, type UpdateCurrencyInput } from "../schemas/settings.schema";
import { updateCurrencyAction } from "../actions/update-currency.action";
import { getUserSettingsAction } from "../actions/get-user-settings.action";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { CURRENCIES } from "@/features/shared/lib/constants/currencies";

export function CurrencySelector() {
  const [currency, setCurrency] = useState<string>("USD");
  const [isLoading, setIsLoading] = useState(true);

  const { execute, status } = useActionWithToast(updateCurrencyAction, {
    onSuccess: () => {
      // Settings updated successfully
    },
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await getUserSettingsAction({});
        if (result?.data?.success) {
          setCurrency(result.data.settings.currency);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    await execute({ currency: newCurrency });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Currency Preference</CardTitle>
        <CardDescription>
          Set your default currency for displaying amounts throughout the application
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="currency" className="text-sm font-medium">
              Default Currency
            </label>
            <Select
              value={currency}
              onValueChange={handleCurrencyChange}
              options={CURRENCIES}
              placeholder="Select currency"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This currency will be used as the default for new accounts and when displaying
            amounts. Individual accounts can have their own currency settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}


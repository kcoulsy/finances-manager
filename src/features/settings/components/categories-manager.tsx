"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Edit2, X } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { getCategoriesAction } from "@/features/categories/actions/get-categories.action";
import { createCategoryAction } from "@/features/categories/actions/create-category.action";
import { updateCategoryAction } from "@/features/categories/actions/update-category.action";
import { deleteCategoryAction } from "@/features/categories/actions/delete-category.action";
import {
  createCategorySchema,
  type CreateCategoryInput,
} from "@/features/categories/schemas/category.schema";

// Suggested categories with default colors
const SUGGESTED_CATEGORIES = [
  { name: "Food & Dining", color: "#ef4444" },
  { name: "Shopping", color: "#3b82f6" },
  { name: "Transportation", color: "#10b981" },
  { name: "Bills & Utilities", color: "#f59e0b" },
  { name: "Entertainment", color: "#8b5cf6" },
  { name: "Healthcare", color: "#ec4899" },
  { name: "Education", color: "#06b6d4" },
  { name: "Travel", color: "#14b8a6" },
  { name: "Groceries", color: "#84cc16" },
  { name: "Subscriptions", color: "#f97316" },
];

// Predefined color palette
const COLOR_PALETTE = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
];

type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  isDefault: boolean;
  userId: string | null;
};

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>("");

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: errorsCreate },
    reset: resetCreate,
    setValue: setValueCreate,
    watch: watchCreate,
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: errorsEdit },
    reset: resetEdit,
    setValue: setValueEdit,
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
  });

  const watchedColor = watchCreate("color");

  const { execute: executeCreate, status: createStatus } = useActionWithToast(
    createCategoryAction,
    {
      onSuccess: () => {
        setCreateDialogOpen(false);
        resetCreate();
        setSelectedColor("");
        loadCategories();
      },
    },
  );

  const { execute: executeUpdate, status: updateStatus } = useActionWithToast(
    updateCategoryAction,
    {
      onSuccess: () => {
        setEditDialogOpen(false);
        setEditingCategory(null);
        resetEdit();
        setSelectedColor("");
        loadCategories();
      },
    },
  );

  const { execute: executeDelete, status: deleteStatus } = useActionWithToast(
    deleteCategoryAction,
    {
      onSuccess: () => {
        loadCategories();
      },
    },
  );

  const loadCategories = async () => {
    try {
      const result = await getCategoriesAction({});
      if (result?.data?.success) {
        // Filter to only show user categories (not default)
        const userCategories = result.data.categories.filter(
          (cat) => !cat.isDefault,
        );
        setCategories(userCategories);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleQuickAdd = async (suggested: { name: string; color: string }) => {
    await executeCreate({
      name: suggested.name,
      color: suggested.color,
    });
  };

  const handleCreateSubmit = async (data: CreateCategoryInput) => {
    await executeCreate({
      name: data.name,
      color: selectedColor || data.color || null,
    });
  };

  const handleEditClick = (category: Category) => {
    setEditingCategory(category);
    setSelectedColor(category.color || "");
    setValueEdit("name", category.name);
    setValueEdit("color", category.color || "");
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async (data: CreateCategoryInput) => {
    if (!editingCategory) return;

    await executeUpdate({
      categoryId: editingCategory.id,
      name: data.name,
      color: selectedColor || data.color || null,
    });
  };

  const handleDelete = async (categoryId: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      await executeDelete({ categoryId });
    }
  };

  const userCategories = categories.filter((cat) => !cat.isDefault);
  const suggestedNotAdded = SUGGESTED_CATEGORIES.filter(
    (suggested) =>
      !userCategories.some(
        (cat) => cat.name.toLowerCase() === suggested.name.toLowerCase(),
      ),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>
          Manage your transaction categories. Add colors to organize and identify
          categories easily.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Suggested Categories */}
        {suggestedNotAdded.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Suggested Categories</h3>
            <div className="flex flex-wrap gap-2">
              {suggestedNotAdded.map((suggested, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAdd(suggested)}
                  disabled={createStatus === "executing"}
                  className="h-auto py-2 px-3"
                >
                  <Plus className="mr-1 h-3 w-3" />
                  <div
                    className="mr-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: suggested.color }}
                  />
                  {suggested.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* User Categories List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Your Categories</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCreateDialogOpen(true);
                setSelectedColor("");
                resetCreate();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : userCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No categories yet. Add one above or use a suggested category.
            </p>
          ) : (
            <div className="space-y-2">
              {userCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {category.color && (
                      <div
                        className="h-5 w-5 rounded-full border"
                        style={{ backgroundColor: category.color }}
                      />
                    )}
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditClick(category)}
                      disabled={updateStatus === "executing"}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                      disabled={deleteStatus === "executing"}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Category Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>
                Add a new category for organizing your transactions
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitCreate(handleCreateSubmit)}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Category Name
                  </label>
                  <Input
                    id="name"
                    placeholder="e.g., Groceries, Rent, Salary"
                    {...registerCreate("name")}
                    aria-invalid={errorsCreate.name ? "true" : "false"}
                  />
                  {errorsCreate.name && (
                    <p className="text-sm text-destructive">
                      {errorsCreate.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Color</label>
                  <div className="grid grid-cols-8 gap-2">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color);
                          setValueCreate("color", color);
                        }}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          selectedColor === color || watchedColor === color
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                  <Input
                    type="text"
                    placeholder="#000000 or leave empty"
                    {...registerCreate("color")}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Click a color above or enter a hex code
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCreateDialogOpen(false);
                    resetCreate();
                    setSelectedColor("");
                  }}
                  disabled={createStatus === "executing"}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createStatus === "executing"}>
                  {createStatus === "executing" ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update category name and color
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitEdit(handleEditSubmit)}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="edit-name" className="text-sm font-medium">
                    Category Name
                  </label>
                  <Input
                    id="edit-name"
                    placeholder="e.g., Groceries, Rent, Salary"
                    {...registerEdit("name")}
                    aria-invalid={errorsEdit.name ? "true" : "false"}
                  />
                  {errorsEdit.name && (
                    <p className="text-sm text-destructive">
                      {errorsEdit.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Color</label>
                  <div className="grid grid-cols-8 gap-2">
                    {COLOR_PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          setSelectedColor(color);
                          setValueEdit("color", color);
                        }}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          selectedColor === color
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                  <Input
                    type="text"
                    placeholder="#000000 or leave empty"
                    {...registerEdit("color")}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Click a color above or enter a hex code
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingCategory(null);
                    resetEdit();
                    setSelectedColor("");
                  }}
                  disabled={updateStatus === "executing"}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStatus === "executing"}>
                  {updateStatus === "executing" ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}


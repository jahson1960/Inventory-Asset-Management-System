import { CategoryManager } from '@/components/category-manager';

export default function InventoryCategoriesPage() {
  return (
    <CategoryManager
      resourcePath="/inventory-categories"
      title="Inventory Categories"
      description="Category structure used to classify consumable inventory items."
      permission="inventoryCategories.manage"
    />
  );
}

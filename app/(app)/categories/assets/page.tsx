import { CategoryManager } from '@/components/category-manager';

export default function AssetCategoriesPage() {
  return (
    <CategoryManager
      resourcePath="/asset-categories"
      title="Asset Categories"
      description="Category structure used to classify fixed assets and controlled equipment."
      permission="assetCategories.manage"
    />
  );
}

export type CategoryTypeValue = 'gasto' | 'ingreso' | 'ahorro';

export interface CategoryItem {
  id: string;
  userId: string;
  name: string;
  type: CategoryTypeValue;
  emoji: string | null;
  isDefault: boolean;
}

export interface CreateCategoryInput {
  userId: string;
  name: string;
  type: CategoryTypeValue;
  emoji?: string;
}

export type CreateCategoryResult =
  | { ok: true; category: CategoryItem }
  | { ok: false; reason: 'invalid_name' | 'name_too_long' | 'duplicate' };

export interface GroupedCategories {
  gasto: CategoryItem[];
  ingreso: CategoryItem[];
  ahorro: CategoryItem[];
}

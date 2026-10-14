import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getEquipmentList, getIngredients, getRecipes } from "@/lib/kitchen/data";
import { buildRecipeOptions } from "@/lib/kitchen/recipeOptions";
import { RecipeEditorForm } from "@/components/admin/kitchen/RecipeEditorForm";

export default async function NewRecipePage() {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin/kitchen/recipes");

  const [ingredients, recipes, equipment] = await Promise.all([
    getIngredients(),
    getRecipes(),
    getEquipmentList(),
  ]);

  return (
    <>
      <h1>מתכון חדש</h1>
      <RecipeEditorForm
        ingredients={ingredients}
        equipment={equipment}
        recipeOptions={buildRecipeOptions(recipes, ingredients)}
      />
    </>
  );
}

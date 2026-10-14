import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getEquipmentList, getIngredients, getRecipes } from "@/lib/kitchen/data";
import { wouldCreateCycle } from "@/lib/kitchen/algorithms";
import { buildRecipeOptions } from "@/lib/kitchen/recipeOptions";
import { RecipeEditorForm } from "@/components/admin/kitchen/RecipeEditorForm";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") redirect("/admin/kitchen/recipes");

  const { id } = await params;
  const [ingredients, recipes, equipment] = await Promise.all([
    getIngredients(),
    getRecipes(),
    getEquipmentList(),
  ]);

  const recipe = recipes.find((r) => r.id === id);
  if (!recipe) notFound();

  const recipesById = new Map(recipes.map((r) => [r.id, r]));
  const validIds = new Set(
    recipes.filter((r) => r.id !== id && !wouldCreateCycle(id, [r.id], recipesById)).map((r) => r.id)
  );

  return (
    <>
      <h1>עריכת מתכון — {recipe.name}</h1>
      <RecipeEditorForm
        recipeId={id}
        initial={recipe}
        ingredients={ingredients}
        equipment={equipment}
        recipeOptions={buildRecipeOptions(recipes, ingredients).filter((o) => validIds.has(o.id))}
      />
    </>
  );
}

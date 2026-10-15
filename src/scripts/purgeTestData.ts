import { RecipeModel, PantryModel } from '../models';
async function executePreDeploymentPurge() {
  await RecipeModel.deleteMany({});
  await PantryModel.deleteMany({});
  await RecipeModel.create({
    title: "Classic French Omelette",
    category: "Breakfast",
    ingredients: [
      { name: "Eggs", quantity: 3, unit: "pcs" },
      { name: "Unsalted Butter", quantity: 1, unit: "tbsp" }
    ]
  });
  console.log("Database cleared. Pristine production seed applied.");
}
executePreDeploymentPurge();

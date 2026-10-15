import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const recipes = pgTable("recipes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  prepTimeMinutes: integer("prep_time_minutes"),
  cookTimeMinutes: integer("cook_time_minutes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mealPlans = pgTable("meal_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  // Monday
  mondayBreakfast: text("monday_breakfast").references(() => recipes.id, { onDelete: "set null" }),
  mondayLunch: text("monday_lunch").references(() => recipes.id, { onDelete: "set null" }),
  mondayDinner: text("monday_dinner").references(() => recipes.id, { onDelete: "set null" }),

  // Tuesday
  tuesdayBreakfast: text("tuesday_breakfast").references(() => recipes.id, { onDelete: "set null" }),
  tuesdayLunch: text("tuesday_lunch").references(() => recipes.id, { onDelete: "set null" }),
  tuesdayDinner: text("tuesday_dinner").references(() => recipes.id, { onDelete: "set null" }),

  // Wednesday
  wednesdayBreakfast: text("wednesday_breakfast").references(() => recipes.id, { onDelete: "set null" }),
  wednesdayLunch: text("wednesday_lunch").references(() => recipes.id, { onDelete: "set null" }),
  wednesdayDinner: text("wednesday_dinner").references(() => recipes.id, { onDelete: "set null" }),

  // Thursday
  thursdayBreakfast: text("thursday_breakfast").references(() => recipes.id, { onDelete: "set null" }),
  thursdayLunch: text("thursday_lunch").references(() => recipes.id, { onDelete: "set null" }),
  thursdayDinner: text("thursday_dinner").references(() => recipes.id, { onDelete: "set null" }),

  // Friday
  fridayBreakfast: text("friday_breakfast").references(() => recipes.id, { onDelete: "set null" }),
  fridayLunch: text("friday_lunch").references(() => recipes.id, { onDelete: "set null" }),
  fridayDinner: text("friday_dinner").references(() => recipes.id, { onDelete: "set null" }),

  // Saturday
  saturdayBreakfast: text("saturday_breakfast").references(() => recipes.id, { onDelete: "set null" }),
  saturdayLunch: text("saturday_lunch").references(() => recipes.id, { onDelete: "set null" }),
  saturdayDinner: text("saturday_dinner").references(() => recipes.id, { onDelete: "set null" }),

  // Sunday
  sundayBreakfast: text("sunday_breakfast").references(() => recipes.id, { onDelete: "set null" }),
  sundayLunch: text("sunday_lunch").references(() => recipes.id, { onDelete: "set null" }),
  sundayDinner: text("sunday_dinner").references(() => recipes.id, { onDelete: "set null" }),
});

export const pantry = pgTable("pantry", {
  id: text("id").primaryKey(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull().default("Pantry Staples"),
  quantity: integer("quantity").notNull().default(1),
  unit: text("unit").notNull().default("units"),
  status: text("status").notNull().default("In Stock"),
  upcCode: text("upc_code"),
  pluCode: text("plu_code"),
  dateAdded: timestamp("date_added").defaultNow().notNull(),
  purchaseDate: timestamp("purchase_date"),
  useByDate: timestamp("use_by_date"),
  shelfLifeDays: integer("shelf_life_days"),
});

/**
 * Normalizes incoming meal slot keys (snake_case or camelCase) to the canonical camelCase
 * table property names expected by Drizzle ORM schema fields.
 */
export function normalizeMealSlotToCamelCase(incomingKey: string): string {
  if (!incomingKey) return "";
  
  // If already in camelCase, ensure initial lower char and return
  if (!incomingKey.includes("_")) {
    return incomingKey.charAt(0).toLowerCase() + incomingKey.slice(1);
  }

  // Convert snake_case (e.g. "monday_breakfast") to camelCase ("mondayBreakfast")
  return incomingKey
    .trim()
    .toLowerCase()
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}


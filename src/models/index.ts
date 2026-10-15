import { recipeClient } from "../api/recipeClient";

export const RecipeModel = {
  async find() {
    if (typeof window !== "undefined") {
      return recipeClient.recipes.list();
    }
    const fs = await import("fs");
    const path = await import("path");
    const dbPath = path.resolve(process.cwd(), "data/db.json");
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    return db.recipes || [];
  },
  async deleteMany(_query: any = {}) {
    if (typeof window !== "undefined") {
      const all = await recipeClient.recipes.list();
      await Promise.all(all.map(r => recipeClient.recipes.delete(r.id)));
      return { acknowledged: true, deletedCount: all.length };
    }
    const fs = await import("fs");
    const path = await import("path");
    const dbPath = path.resolve(process.cwd(), "data/db.json");
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    db.recipes = [];
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return { acknowledged: true, deletedCount: 0 };
  },
  async create(doc: any) {
    if (typeof window !== "undefined") {
      return recipeClient.recipes.create(doc);
    }
    const fs = await import("fs");
    const path = await import("path");
    const dbPath = path.resolve(process.cwd(), "data/db.json");
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    db.recipes = db.recipes || [];
    const item = { id: "rec-" + Math.random().toString(36).substr(2, 9), ...doc, created_date: new Date().toISOString() };
    db.recipes.push(item);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return item;
  }
};

export const PantryModel = {
  async find() {
    if (typeof window !== "undefined") {
      return recipeClient.pantry.list();
    }
    const fs = await import("fs");
    const path = await import("path");
    const dbPath = path.resolve(process.cwd(), "data/db.json");
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    return db.pantry || [];
  },
  async deleteMany(_query: any = {}) {
    if (typeof window !== "undefined") {
      const all = await recipeClient.pantry.list();
      await Promise.all(all.map(p => recipeClient.pantry.delete(p.id)));
      return { acknowledged: true, deletedCount: all.length };
    }
    const fs = await import("fs");
    const path = await import("path");
    const dbPath = path.resolve(process.cwd(), "data/db.json");
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    db.pantry = [];
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return { acknowledged: true, deletedCount: 0 };
  },
  async create(doc: any) {
    if (typeof window !== "undefined") {
      return recipeClient.pantry.create(doc);
    }
    const fs = await import("fs");
    const path = await import("path");
    const dbPath = path.resolve(process.cwd(), "data/db.json");
    const db = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    db.pantry = db.pantry || [];
    const name = doc.name || doc.itemName || "Item";
    const item = { 
      id: "pantry-" + Math.random().toString(36).substr(2, 9), 
      name, 
      itemName: name, 
      ...doc, 
      created_date: new Date().toISOString() 
    };
    db.pantry.push(item);
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return item;
  }
};

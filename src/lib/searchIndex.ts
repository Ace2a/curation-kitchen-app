/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Recipe } from "../types";

// Common English stopwords to filter out for better indexing precision
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "can't",
  "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down", "during",
  "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't", "have", "haven't", "having",
  "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself", "him", "himself", "his", "how",
  "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself",
  "let's", "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
  "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't", "she",
  "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the",
  "their", "theirs", "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll",
  "they're", "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was",
  "wasn't", "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
  "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself", "yourselves"
]);

// Helper to tokenize text into clean lowercase words
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove punctuation except hyphens
    .split(/[\s_/]+/)            // split on whitespace, slashes, or underscores
    .filter(token => token.length > 1 && !STOPWORDS.has(token));
}

interface IndexEntry {
  recipeId: string;
  score: number;
}

export class LocalSearchIndex {
  private index: Map<string, IndexEntry[]> = new Map();
  private recipesMap: Map<string, Recipe> = new Map();

  constructor(recipes: Recipe[] = []) {
    this.buildIndex(recipes);
  }

  /**
   * Rebuilds the search index with the current list of recipes
   */
  public buildIndex(recipes: Recipe[]): void {
    this.index.clear();
    this.recipesMap.clear();

    recipes.forEach(recipe => {
      this.recipesMap.set(recipe.id, recipe);
      const tokenWeights: Map<string, number> = new Map();

      // Helper to add tokens with specified weight multiplier
      const addTokens = (text: string, weight: number) => {
        const tokens = tokenize(text);
        tokens.forEach(token => {
          const current = tokenWeights.get(token) || 0;
          tokenWeights.set(token, current + weight);
        });
      };

      // 1. Index Title (Weight: 8)
      addTokens(recipe.title, 8);

      // 2. Index Dietary Tags (Weight: 5)
      (recipe.tags || []).forEach(tag => {
        addTokens(tag, 5);
      });

      // 3. Index Ingredients (Weight: 4)
      (recipe.ingredients || []).forEach(ingredient => {
        const text = typeof ingredient === "string" ? ingredient : `${ingredient.canonicalAmount || ingredient.minAmount || ""} ${ingredient.unit || ""} ${ingredient.name || ""} ${(ingredient.modifiers || []).join(" ")}`.trim();
        addTokens(text, 4);
      });

      // 4. Index Meal Heading/Category (Weight: 3)
      if (recipe.meal_heading) {
        addTokens(recipe.meal_heading, 3);
      }

      // 5. Index Description (Weight: 1.5)
      if (recipe.description) {
        addTokens(recipe.description, 1.5);
      }

      // Apply to index
      tokenWeights.forEach((score, token) => {
        // Support partial matches on prefix for interactive search-as-you-type
        // E.g. "glut" indexes "gluten-free"
        const entries = this.index.get(token) || [];
        entries.push({ recipeId: recipe.id, score });
        this.index.set(token, entries);
      });
    });
  }

  /**
   * Performs an offline-first weighted search and tag filtering
   */
  public search(
    query: string,
    selectedTags: string[] = []
  ): Recipe[] {
    const queryTokens = tokenize(query);
    const scoreMap: Map<string, number> = new Map();

    // If query is provided, compute term matching scores
    if (queryTokens.length > 0) {
      queryTokens.forEach(queryToken => {
        // Direct match
        const directEntries = this.index.get(queryToken) || [];
        directEntries.forEach(entry => {
          const current = scoreMap.get(entry.recipeId) || 0;
          scoreMap.set(entry.recipeId, current + entry.score);
        });

        // Prefix match (e.g., query "choc" matches "chocolate")
        this.index.forEach((entries, indexedToken) => {
          if (indexedToken !== queryToken && indexedToken.startsWith(queryToken)) {
            entries.forEach(entry => {
              const current = scoreMap.get(entry.recipeId) || 0;
              // Diminish score slightly for partial match
              const partialScore = entry.score * 0.6;
              scoreMap.set(entry.recipeId, current + partialScore);
            });
          }
        });
      });
    }

    // Determine candidate recipes
    let candidates: Recipe[] = [];
    if (queryTokens.length > 0) {
      // Only keep recipes that had search matches
      scoreMap.forEach((_, id) => {
        const recipe = this.recipesMap.get(id);
        if (recipe) candidates.push(recipe);
      });
    } else {
      // If no query, start with all recipes as candidates
      candidates = Array.from(this.recipesMap.values());
    }

    // Apply exact dietary tags filter if tags are selected
    if (selectedTags.length > 0) {
      candidates = candidates.filter(recipe => {
        const recipeTagsLower = (recipe.tags || []).map(t => t.toLowerCase().trim());
        return selectedTags.every(filterTag => 
          recipeTagsLower.includes(filterTag.toLowerCase().trim())
        );
      });
    }

    // Sort results: if search query exists, sort by search match score, otherwise preserve default order (e.g., by created date)
    if (queryTokens.length > 0) {
      return candidates.sort((a, b) => {
        const scoreA = scoreMap.get(a.id) || 0;
        const scoreB = scoreMap.get(b.id) || 0;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        // Tie-breaker: creation date
        return new Date(b.created_date).getTime() - new Date(a.created_date).getTime();
      });
    } else {
      // Default order: Newest first
      return candidates.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
    }
  }

  /**
   * Extract all unique tags present across all recipes for handy quick filter buttons
   */
  public getAllUniqueTags(): string[] {
    const tagsSet: Set<string> = new Set();
    this.recipesMap.forEach(recipe => {
      (recipe.tags || []).forEach(tag => {
        const trimmed = tag.trim();
        if (trimmed) tagsSet.add(trimmed);
      });
    });
    return Array.from(tagsSet).sort();
  }
}

import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';

export const categoryController = {
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await categoryService.getCategories();
      res.json({ data: categories, total: categories.length });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  },

  async getCategory(req: Request, res: Response) {
    try {
      const category = await categoryService.getCategoryById(req.params.id as string);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
      res.json(category);
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({ error: 'Failed to fetch category' });
    }
  },

  async createCategory(req: Request, res: Response) {
    try {
      const category = await categoryService.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({ error: 'Failed to create category' });
    }
  },

  async updateCategory(req: Request, res: Response) {
    try {
      const category = await categoryService.updateCategory(req.params.id as string, req.body);
      res.json(category);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({ error: 'Failed to update category' });
    }
  },

  async deleteCategory(req: Request, res: Response) {
    try {
      await categoryService.deleteCategory(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting category:', error);
      res.status(500).json({ error: 'Failed to delete category' });
    }
  },
};

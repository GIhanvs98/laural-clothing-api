import { Request, Response } from 'express';
import { productService } from '../services/product.service';

export class ProductController {
  async getAllProducts(req: Request, res: Response) {
    try {
      const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : undefined;
      const take = req.query.take ? parseInt(req.query.take as string, 10) : undefined;
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;

      const result = await productService.getAllProducts({ skip, take, search, category });
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }

  async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await productService.getProductById(id as string);
      
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      
      res.status(200).json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }

  async getProductBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const product = await productService.getProductBySlug(slug as string);
      
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      
      res.status(200).json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }

  async createProduct(req: Request, res: Response) {
    try {
      const product = await productService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Bad Request' });
    }
  }

  async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await productService.updateProduct(id as string, req.body);
      res.status(200).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Bad Request' });
    }
  }

  async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await productService.deleteProduct(id as string);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Bad Request' });
    }
  }
}

export const productController = new ProductController();

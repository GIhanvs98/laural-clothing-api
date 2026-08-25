import { Request, Response } from 'express';
import { productService } from '../services/product.service';

export class ProductController {
  async getAllProducts(req: Request, res: Response) {
    try {
      let skip = req.query.skip ? parseInt(req.query.skip as string, 10) : undefined;
      let take = req.query.take ? parseInt(req.query.take as string, 10) : undefined;

      if (skip !== undefined && isNaN(skip)) {
        res.status(400).json({ error: 'Invalid skip parameter' });
        return;
      }

      if (take !== undefined) {
        if (isNaN(take)) {
          res.status(400).json({ error: 'Invalid take parameter' });
          return;
        }
        take = Math.min(100, Math.max(1, take));
      }
      const search = req.query.search as string | undefined;
      const category = req.query.category as string | undefined;
      
      const sizes = req.query.sizes ? (req.query.sizes as string).split(',') : undefined;
      const colors = req.query.colors ? (req.query.colors as string).split(',') : undefined;
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
      const styles = req.query.styles ? (req.query.styles as string).split(',') : undefined;
      const sort = req.query.sort as string | undefined;

      const result = await productService.getAllProducts({ 
        skip, take, search, category, sizes, colors, minPrice, maxPrice, styles, sort 
      });
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

  async getProductBySku(req: Request, res: Response) {
    try {
      const { sku } = req.params;
      const product = await productService.getProductBySku(sku as string);
      
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      
      res.status(200).json(product);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }

  async getFilterMetadata(req: Request, res: Response) {
    try {
      const metadata = await productService.getFilterMetadata();
      res.status(200).json(metadata);
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

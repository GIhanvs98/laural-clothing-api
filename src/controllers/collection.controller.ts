import { Request, Response } from 'express';
import { collectionService } from '../services/collection.service';

export const getCollections = async (req: Request, res: Response) => {
  try {
    const search = req.query.search as string;
    const collections = await collectionService.getCollections(search);
    res.json({ data: collections, total: collections.length });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching collections', error });
  }
};

export const getCollectionById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const collection = await collectionService.getCollectionById(id);
    if (!collection) {
      return res.status(404).json({ message: 'Collection not found' });
    }
    res.json(collection);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching collection', error });
  }
};

export const createCollection = async (req: Request, res: Response) => {
  try {
    const collection = await collectionService.createCollection(req.body);
    res.status(201).json(collection);
  } catch (error) {
    res.status(500).json({ message: 'Error creating collection', error });
  }
};

export const updateCollection = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const collection = await collectionService.updateCollection(id, req.body);
    res.json(collection);
  } catch (error) {
    res.status(500).json({ message: 'Error updating collection', error });
  }
};

export const deleteCollection = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await collectionService.deleteCollection(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting collection', error });
  }
};

export const getCollectionProducts = async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const skip = req.query.skip ? parseInt(req.query.skip as string, 10) : undefined;
    const take = req.query.take ? parseInt(req.query.take as string, 10) : undefined;
    
    const result = await collectionService.getCollectionProducts(slug, skip, take);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'Collection not found') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Error fetching collection products', error });
  }
};

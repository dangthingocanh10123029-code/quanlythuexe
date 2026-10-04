import { ImageSourcePropType } from 'react-native';

export interface Car {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  pricePerDay: number;
  location: string;
  image: ImageSourcePropType;
  seats: number;
  rating: number;
  availability: boolean;
  type: string;
  createdAt: Date;
}

export interface CarFilter {
  brand?: string;
  type?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  location?: string;
  seats?: number;
  availability?: boolean;
  rating?: number;
  sortBy?: 'price' | 'rating' | 'createdAt';
  order?: 'asc' | 'desc';
}

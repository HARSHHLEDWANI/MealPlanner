export type AuthState = 'LOADING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

export interface User {
  id: string;
  email?: string;
  phone?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image_url: string;
  prep_time: number;
  cook_time: number;
  serving_size: number;
  tags: string[];
  saved?: boolean;
} 
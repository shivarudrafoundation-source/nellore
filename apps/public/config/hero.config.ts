export interface CategoryHeroConfig {
  id: string;
  name: string;
  subtitle: string;
  frameCount: number;
  duration: number; // in seconds
  path: string;     // relative folder path under public/
}

export const heroCategories: CategoryHeroConfig[] = [
  {
    id: 'mr',
    name: 'MR',
    subtitle: "THE GENTLEMEN'S ARENA",
    frameCount: 56,
    duration: 2.33,
    path: '/media/hero/mr'
  },
  {
    id: 'miss',
    name: 'MISS',
    subtitle: 'THE CROWN OF GRACE',
    frameCount: 53,
    duration: 2.21,
    path: '/media/hero/miss'
  },
  {
    id: 'kids',
    name: 'KIDS',
    subtitle: 'THE FUTURE OF EXCELLENCE',
    frameCount: 53,
    duration: 2.21,
    path: '/media/hero/kids'
  }
];

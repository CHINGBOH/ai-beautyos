export interface HeroSlide {
  id: number;
  brand: string;
  subtitle: string;
  title: string;
  stat: string;
  statLabel: string;
  primaryBtn: string;
  secondaryBtn: string;
  image: string;
  theme: string;
  textColor: string;
  subColor: string;
  statColor: string;
  gradient: string;
}

export interface TestimonialStory {
  id: number;
  bg: string;
  category: string;
  quote: string;
  author: string;
  role: string;
  initial: string;
  theme: string;
  gradient: string;
}

export interface LandingService {
  id: string;
  name: string;
  fullName?: string;
  description: string;
  shortDescription: string;
  indications: string[];
  contraindications: string[];
  treatmentDuration: string;
  recoveryTime: string;
  painLevel: number;
  priceMin: number;
  priceMax: number;
  priceUnit: string;
  effects: string[];
  risks: string[];
  preCare: string;
  postCare: string;
  technology?: string;
  equipment?: string;
  recommendedCourses?: string;
}

export interface LandingServiceCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  services: LandingService[];
}

export interface CreateSponsorDto {
  name: string;
  tier?: string;
  logoUrl: string;
  websiteUrl?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateSponsorDto {
  name?: string;
  tier?: string;
  logoUrl?: string;
  websiteUrl?: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

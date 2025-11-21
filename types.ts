
export interface Business {
  'Business Name': string;
  'Category': string;
  'Address': string;
  'Phone': string;
  'Website': string;
  'Email': string;
  'Google Maps Link': string;
  'Rating': string; // Rating score, e.g., "4.5/5"
  'Review Count': string; // Number of reviews, e.g., "1234"
  'Price Range': string; // Price range, e.g., "$$"
  'Hours': string; // Opening hours
  'Status': string; // Status, e.g., "Open", "Closed"
}

export type SortDirection = 'ascending' | 'descending';

export interface SortConfig {
    key: keyof Business;
    direction: SortDirection;
}

// A simplified type for the Maps grounding metadata we care about.
export interface GroundingChunk {
  maps?: {
    uri?: string;
    title?: string;
  };
  web?: {
    uri?: string;
    title?: string;
  };
}

export type ModelOption = 'fast' | 'deep';

export interface FindBusinessesResult {
    businesses: Business[];
    sources: GroundingChunk[];
}

export interface Business {
  'İşletme Adı': string;
  'Kategori': string;
  'Adres': string;
  'Telefon Numarası': string;
  'Web Sitesi': string;
  'E-posta': string;
  'Google Maps Linki': string;
  'Değerlendirme Puanı': string; // Rating score, e.g., "4.5/5"
  'Değerlendirme Sayısı': string; // Number of reviews, e.g., "1234"
  'Fiyat Aralığı': string; // Price range, e.g., "$$"
  'Çalışma Saatleri': string; // Opening hours
  'Durum': string; // Status, e.g., "Open", "Closed"
}

export type SortDirection = 'ascending' | 'descending';

export interface SortConfig {
    key: keyof Business;
    direction: SortDirection;
}

// A simplified type for the Maps grounding metadata we care about.
export interface GroundingChunk {
  maps?: {
    // FIX: Made uri and title optional to match the type from @google/genai library.
    uri?: string;
    title?: string;
  };
  web?: {
    // FIX: Made uri and title optional to match the type from @google/genai library.
    uri?: string;
    title?: string;
  };
}
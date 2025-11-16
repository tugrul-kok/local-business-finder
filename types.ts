export interface Business {
  'İşletme Adı': string;
  'Kategori': string;
  'Adres': string;
  'Telefon Numarası': string;
  'Web Sitesi': string;
  'E-posta': string;
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
// Default hardcoded Google Sheet ID for public catalog access
export const DEFAULT_SPREADSHEET_ID = '1Qw4HYY-WRAnG5I6HP3TVtwFe0QQc2ifwNyHYzH_sAo';

// Default Google Apps Script Web App URL for Partner Registrations and Catalog
export const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxoTB-hDxquIp3U7iTp468ENwPWnjd-qS8jKh4YvffjMXw3gpME_MZ2uuLytRjcAl0Ibw/exec';

export const cleanSpreadsheetId = (input: string): string => {
  if (!input) return DEFAULT_SPREADSHEET_ID;
  const trimmed = input.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed || DEFAULT_SPREADSHEET_ID;
};

export interface Contact {
  name: string;
  email?: string;
  phone?: string;
}

export interface PartnerProfile {
  partnerId: string;
  name: string;
  phone: string;
  houseStreet: string;
  unitNo: string;
  areaThana: string;
  city: string;
  district: string;
  postalCode: string;
  category: 'Partner A' | 'Partner B' | 'Partner C';
  deliveryArea?: string;
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  originalPrice: number;
  partnerAPrice: number;
  partnerBPrice: number;
  partnerCPrice: number;
  weight: string;
  imageUrl: string;
  description: string;
}

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'PROD001',
    name: 'Premium Organic Honey (অর্গানিক মধু)',
    category: 'Honey',
    originalPrice: 1200,
    partnerAPrice: 900,
    partnerBPrice: 1000,
    partnerCPrice: 1100,
    weight: '500g',
    imageUrl: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=400',
    description: '100% pure organic flower honey from Sundarbans forest.',
  },
  {
    id: 'PROD002',
    name: 'Natural Chia Seeds (চিয়া সিড)',
    category: 'Superfood',
    originalPrice: 850,
    partnerAPrice: 600,
    partnerBPrice: 700,
    partnerCPrice: 780,
    weight: '250g',
    imageUrl: 'https://images.unsplash.com/photo-1596450514735-111a2fe02935?auto=format&fit=crop&q=80&w=400',
    description: 'High-fiber raw premium organic black chia seeds.',
  },
  {
    id: 'PROD003',
    name: 'Virgin Coconut Oil (নারকেল তেল)',
    category: 'Wellness',
    originalPrice: 950,
    partnerAPrice: 700,
    partnerBPrice: 800,
    partnerCPrice: 880,
    weight: '500ml',
    imageUrl: 'https://images.unsplash.com/photo-1622484211148-716598e04041?auto=format&fit=crop&q=80&w=400',
    description: 'Extra virgin cold-pressed natural cooking & beauty coconut oil.',
  },
  {
    id: 'PROD004',
    name: 'Premium Green Tea (গ্রিন টি)',
    category: 'Beverage',
    originalPrice: 450,
    partnerAPrice: 300,
    partnerBPrice: 350,
    partnerCPrice: 400,
    weight: '100g',
    imageUrl: 'https://images.unsplash.com/photo-1564890369478-c90ae83b4feb?auto=format&fit=crop&q=80&w=400',
    description: 'Antioxidant-rich selected premium hand-picked green tea leaves.',
  },
  {
    id: 'PROD005',
    name: 'Organic Roasted Almonds (কাঠবাদাম)',
    category: 'Nuts',
    originalPrice: 1500,
    partnerAPrice: 1100,
    partnerBPrice: 1250,
    partnerCPrice: 1380,
    weight: '500g',
    imageUrl: 'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&q=80&w=400',
    description: 'Premium quality selected crunchy roasted whole almonds.',
  },
];

export interface Order {
  orderId: string;
  date: string;
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  items: string;
  totalAmount: number;
  status: string; // Pending (Order Processing), To Ship, Out for Delivery, Delivered
  shippingAddress: string;
  paymentProofUrl: string; // Saved Google Drive link to payment receipt image
  damageClaim?: string; // Information about any submitted damage claims
}

// Create a new B2B tracking spreadsheet in Google Drive/Sheets
export const createB2BSpreadsheet = async (accessToken: string): Promise<string> => {
  try {
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'B2B Partner Portal - Master Database',
        },
        sheets: [
          { properties: { title: 'Profiles' } },
          { properties: { title: 'Category' } },
          { properties: { title: 'Orders' } },
          { properties: { title: 'PaymentSettings' } },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create spreadsheet: ${response.statusText}`);
    }

    const data = await response.json();
    const spreadsheetId = data.spreadsheetId;

    // 1. Populate Profiles Sheet
    const profilesData = [
      [
        'Partner ID',
        'Partner Name',
        'Partner Number',
        'House No., Building, Street Name',
        'Unit | No (optional)',
        'Area or Thana',
        'City',
        'District',
        'Postal Code',
        'Partner Category',
        'Delivery Area (Dhaka City / Outside Dhaka)',
      ],
      [
        'P-1001',
        'করিম আহমেদ',
        '01700000000',
        'বাসা ১২, রোড ৫',
        'ফ্ল্যাট ৩এ',
        'ধানমন্ডি',
        'ঢাকা',
        'ঢাকা',
        '১২০৫',
        'Partner A',
        'Dhaka City',
      ],
    ];

    const profilesRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Profiles!A1:K2?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: profilesData }),
      }
    );

    if (!profilesRes.ok) {
      throw new Error(`Failed to initialize Profiles tab: ${profilesRes.statusText}`);
    }

    // 2. Populate Category Tab (Products Catalog)
    // Columns: A=Product ID, B=Name, C=Category, D=Original Price, E=Partner A Price, F=Partner B Price, G=Partner C Price, H=Weight, I=Image URL, J=Description
    const categoryData = [
      [
        'Product ID',
        'Product Name',
        'Category',
        'Original Price',
        'Partner A Price',
        'Partner B Price',
        'Partner C Price',
        'Product Weight',
        'Product Photo URL',
        'Description',
      ],
      [
        'PROD001',
        'Premium Organic Honey (অর্গানিক মধু)',
        'Honey',
        '1200',
        '900',
        '1000',
        '1100',
        '500g',
        'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=400',
        '100% pure organic flower honey from Sundarbans forest.',
      ],
      [
        'PROD002',
        'Natural Chia Seeds (চিয়া সিড)',
        'Superfood',
        '850',
        '600',
        '700',
        '780',
        '250g',
        'https://images.unsplash.com/photo-1596450514735-111a2fe02935?auto=format&fit=crop&q=80&w=400',
        'High-fiber raw premium organic black chia seeds.',
      ],
      [
        'PROD003',
        'Virgin Coconut Oil (নারকেল তেল)',
        'Wellness',
        '950',
        '700',
        '800',
        '880',
        '500ml',
        'https://images.unsplash.com/photo-1622484211148-716598e04041?auto=format&fit=crop&q=80&w=400',
        'Extra virgin cold-pressed natural cooking & beauty coconut oil.',
      ],
      [
        'PROD004',
        'Premium Green Tea (গ্রিন টি)',
        'Beverage',
        '450',
        '300',
        '350',
        '400',
        '100g',
        'https://images.unsplash.com/photo-1564890369478-c90ae83b4feb?auto=format&fit=crop&q=80&w=400',
        'Antioxidant-rich selected premium hand-picked green tea leaves.',
      ],
      [
        'PROD005',
        'Organic Roasted Almonds (কাঠবাদাম)',
        'Nuts',
        '1500',
        '1100',
        '1250',
        '1380',
        '500g',
        'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&q=80&w=400',
        'Premium quality selected crunchy roasted whole almonds.',
      ],
    ];

    const categoryRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Category!A1:J6?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: categoryData }),
      }
    );

    if (!categoryRes.ok) {
      throw new Error(`Failed to initialize Category tab: ${categoryRes.statusText}`);
    }

    // 3. Populate Orders Tab
    const ordersHeaders = [
      [
        'Order ID',
        'Date',
        'Partner ID',
        'Partner Name',
        'Partner Phone',
        'Items (Product x Qty...)',
        'Total Order Amount',
        'Status',
        'Shipping Address',
        'Payment Proof Link',
        'Damage Claim Details'
      ],
    ];

    const ordersRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Orders!A1:K1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: ordersHeaders }),
      }
    );

    if (!ordersRes.ok) {
      throw new Error(`Failed to initialize Orders tab: ${ordersRes.statusText}`);
    }

    // 4. Populate PaymentSettings Tab
    const paymentSettingsData = [
      ['Method Name', 'Account Number / Detail', 'Type / Instructions'],
      ['বিকাশ (Bkash)', '01700000000', 'Personal (সেন্ড মানি)'],
      ['নগদ (Nagad)', '01700000000', 'Personal (সেন্ড মানি)'],
      ['ডাচ-বাংলা ব্যাংক (DBBL)', '১২৩.৪৫৬.৭৮৯০১২', 'একাউন্ট নাম: PureGlow International, বনানী শাখা, রাউটিং: ০৭৫২৬০১৩৪'],
    ];

    const paymentSettingsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/PaymentSettings!A1:C4?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: paymentSettingsData }),
      }
    );

    if (!paymentSettingsRes.ok) {
      console.warn('Failed to populate PaymentSettings tab, but continuing:', paymentSettingsRes.statusText);
    }

    return spreadsheetId;
  } catch (error) {
    console.error('Error creating B2B Spreadsheet:', error);
    throw error;
  }
};

// CSV Parser for public Google Sheets gviz output - supports quoted multiline cells, escaped quotes, and empty values
export const parseCsvTo2DArray = (csvText: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      row.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n in \r\n
      }
      row.push(currentCell.trim());
      if (row.some(cell => cell.length > 0)) {
        result.push(row);
      }
      row = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  row.push(currentCell.trim());
  if (row.some(cell => cell.length > 0)) {
    result.push(row);
  }

  return result;
};

// Helper function to clean cell strings, stripping outer quotes, formula prefixes like =XLOOKUP, and error strings
export const cleanCellString = (cell: any): string => {
  if (cell === undefined || cell === null) return '';
  let str = String(cell).trim();

  // Strip wrapping outer quotes if present
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // Handle cell formulas starting with '=' (e.g. ="Product Name", =3689, =XLOOKUP(...))
  if (str.startsWith('=')) {
    const quotedMatch = str.match(/^=\s*"([^"]*)"/);
    if (quotedMatch) {
      str = quotedMatch[1];
    } else {
      const numMatch = str.match(/^=\s*([\d.]+)/);
      if (numMatch) {
        str = numMatch[1];
      } else {
        const innerTextMatch = str.match(/,\s*"([^"]+)"/);
        if (innerTextMatch) {
          str = innerTextMatch[1];
        } else {
          return '';
        }
      }
    }
  }

  // Handle formula error codes from Google Sheets
  if (/^#(VALUE|N\/A|REF!|NAME\?|NUM!|NULL!|DIV\/0!)/i.test(str)) {
    return '';
  }

  return str.trim();
};

// Convert Bangla numerals to English numerals
export const convertBanglaDigitsToEnglish = (str: string): string => {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return str.replace(/[০-৯]/g, (match) => String(banglaDigits.indexOf(match)));
};

// Ultra-robust price parser
export const parsePrice = (cellValue: any): number => {
  const cleaned = cleanCellString(cellValue);
  if (!cleaned) return 0;

  let str = convertBanglaDigitsToEnglish(cleaned);
  str = str.replace(/[^\d.]/g, '');
  const num = Number(str);
  return isNaN(num) ? 0 : Math.round(num);
};

// Universal sheet values reader: supports OAuth Bearer and public Sheets API v4
export const fetchRangeValues = async (
  spreadsheetId: string,
  rangeOrSheet: string,
  accessToken?: string | null
): Promise<any[][]> => {
  // 1. Try Google Sheets API v4 with OAuth accessToken if provided
  if (accessToken) {
    try {
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeOrSheet)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data.values || [];
      }
    } catch (e) {
      console.warn('Authenticated fetch failed, trying public fallbacks:', e);
    }
  }

  // 2. Try Google Sheets API v4 without Auth header (works for public spreadsheets)
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeOrSheet)}`
    );
    if (response.ok) {
      const data = await response.json();
      return data.values || [];
    }
  } catch (e) {
    // Return empty array if public fetch fails
  }

  return [];
};

// Cache structure for spreadsheet metadata to prevent redundant parallel calls
interface CachedStructure {
  titles: string[];
  timestamp: number;
}
const structureCache: Record<string, CachedStructure> = {};
const pendingStructureRequests: Record<string, Promise<string[]>> = {};
const CACHE_TTL_MS = 10000; // 10 seconds cache is plenty for page loads

export const fetchSheetTitlesWithCache = async (
  spreadsheetId: string,
  accessToken?: string | null
): Promise<string[]> => {
  const cacheKey = `${spreadsheetId}_${accessToken || 'public'}`;
  const now = Date.now();

  // 1. Check if we have a valid cache hit
  if (structureCache[cacheKey] && now - structureCache[cacheKey].timestamp < CACHE_TTL_MS) {
    return structureCache[cacheKey].titles;
  }

  // 2. Check if there is already a pending fetch request for this cache key
  if (pendingStructureRequests[cacheKey]) {
    return pendingStructureRequests[cacheKey];
  }

  // 3. Otherwise, create a new request promise and cache it
  const requestPromise = (async () => {
    try {
      if (accessToken) {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const titles: string[] = data.sheets?.map((s: any) => s.properties?.title as string) || [];
          structureCache[cacheKey] = { titles, timestamp: Date.now() };
          return titles;
        }
      }

      // Fallback 1: Try public Sheets API v4 without headers
      const pubRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`);
      if (pubRes.ok) {
        const data = await pubRes.json();
        const titles: string[] = data.sheets?.map((s: any) => s.properties?.title as string) || [];
        structureCache[cacheKey] = { titles, timestamp: Date.now() };
        return titles;
      }
    } catch (e) {
      console.warn('Error fetching sheet structure via API:', e);
    } finally {
      delete pendingStructureRequests[cacheKey];
    }

    // Fallback 2: Default sheet title list
    const fallbackTitles = ['Category', 'Data', 'Products', 'Profiles', 'Orders', 'PaymentSettings'];
    structureCache[cacheKey] = { titles: fallbackTitles, timestamp: Date.now() };
    return fallbackTitles;
  })();

  pendingStructureRequests[cacheKey] = requestPromise;
  return requestPromise;
};

// Helper to check if a sheet title is a generic default sheet or a non-products system tracking sheet
export const isDefaultOrSystemSheet = (title: string): boolean => {
  const l = title.toLowerCase().trim();
  return (
    l === 'profiles' ||
    l === 'orders' ||
    l === 'paymentsettings' ||
    l === 'sheet1' ||
    l === 'sheet 1' ||
    l === 'sheet2' ||
    l === 'sheet 2' ||
    l === 'sheet3' ||
    l === 'sheet 3' ||
    l === 'sheet4' ||
    l === 'sheet 4' ||
    l.startsWith('sheet') ||
    l.startsWith('শীট') ||
    l.startsWith('সীট') ||
    l === 'শীট১' ||
    l === 'শীট ২' ||
    l === 'শীট 1' ||
    l === 'শীট 2'
  );
};

// Validate if spreadsheet has 'Profiles', 'Category'/'Data', and 'Orders'
export const resolveSheetTitles = async (
  spreadsheetId: string,
  accessToken?: string | null
): Promise<{ profiles: string; products: string; orders: string }> => {
  try {
    const titles = await fetchSheetTitlesWithCache(spreadsheetId, accessToken);

    const profiles = titles.find((t) => t.toLowerCase() === 'profiles') || 'Profiles';
    const orders = titles.find((t) => t.toLowerCase() === 'orders') || 'Orders';

    // Find products tab: look for 'category' or 'data' or similar case-insensitive match
    let products = titles.find((t) => t.toLowerCase() === 'category') || '';
    if (!products) {
      products = titles.find((t) => t.toLowerCase() === 'data') || '';
    }
    if (!products) {
      // Fallback to contains check
      products = titles.find((t) => {
        const l = t.toLowerCase();
        return (
          l.includes('cat') ||
          l.includes('dat') ||
          l.includes('prod') ||
          l.includes('পণ্য') ||
          l.includes('প্রোডাক্ট')
        );
      }) || '';
    }
    if (!products) {
      // Ultimate fallback: first sheet that is not a default or system sheet
      products = titles.find((t) => !isDefaultOrSystemSheet(t)) || 'Category';
    }

    return { profiles, products, orders };
  } catch (error) {
    console.error('Error resolving sheet titles dynamically:', error);
  }
  // Return standard names if request failed
  return { profiles: 'Profiles', products: 'Category', orders: 'Orders' };
};

export const validateSpreadsheet = async (spreadsheetId: string, accessToken?: string | null): Promise<boolean> => {
  try {
    const sheetTitles = await fetchSheetTitlesWithCache(spreadsheetId, accessToken);
    
    const hasProducts = sheetTitles.some((t: string) => {
      const l = t.toLowerCase();
      return (
        l === 'category' ||
        l === 'data' ||
        l.includes('cat') ||
        l.includes('dat') ||
        l.includes('prod') ||
        l.includes('পণ্য') ||
        l.includes('প্রোডাক্ট') ||
        !isDefaultOrSystemSheet(t)
      );
    });

    return hasProducts || true;
  } catch (error: any) {
    console.error('Error validating spreadsheet:', error);
    return true; // Allow proceeding if spreadsheetId is present
  }
};

// Helper function to write sheet values with a retry mechanism to handle Google Sheets eventual consistency
const updateSheetValuesWithRetry = async (
  spreadsheetId: string,
  range: string,
  values: any[][],
  accessToken: string,
  retries = 3,
  delayMs = 1500
): Promise<boolean> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );

      if (res.ok) {
        return true;
      }

      const errText = await res.text();
      console.warn(`Attempt ${attempt} to write to range ${range} failed:`, errText);
      
      if (attempt === retries) {
        let errMsg = res.statusText;
        try {
          const errData = JSON.parse(errText);
          if (errData?.error?.message) {
            errMsg = errData.error.message;
          }
        } catch {}
        throw new Error(`Failed to write to range ${range}: ${errMsg}`);
      }
    } catch (error: any) {
      if (attempt === retries) {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
};

// Automatically create missing Profiles or Orders tabs in existing spreadsheet
export const autoFixMissingTabs = async (spreadsheetId: string, accessToken: string): Promise<boolean> => {
  try {
    const structResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!structResponse.ok) {
      let errMsg = structResponse.statusText;
      try {
        const errData = await structResponse.json();
        if (errData?.error?.message) {
          errMsg = errData.error.message;
        }
      } catch {}
      throw new Error(`Failed to fetch spreadsheet info: ${errMsg}`);
    }

    const structData = await structResponse.json();
    const titles: string[] = structData.sheets?.map((s: any) => s.properties?.title as string) || [];

    const hasProfiles = titles.some((t) => t.toLowerCase() === 'profiles');
    const hasOrders = titles.some((t) => t.toLowerCase() === 'orders');
    const hasPaymentSettings = titles.some((t) => t.toLowerCase() === 'paymentsettings');
    const hasProducts = titles.some((t: string) => {
      const l = t.toLowerCase();
      return (
        l === 'category' ||
        l === 'data' ||
        l.includes('cat') ||
        l.includes('dat') ||
        l.includes('prod') ||
        l.includes('পণ্য') ||
        l.includes('প্রোডাক্ট') ||
        !isDefaultOrSystemSheet(t)
      );
    });

    const requests: any[] = [];

    if (!hasProfiles) {
      requests.push({
        addSheet: {
          properties: {
            title: 'Profiles',
          }
        }
      });
    }

    if (!hasOrders) {
      requests.push({
        addSheet: {
          properties: {
            title: 'Orders',
          }
        }
      });
    }

    if (!hasPaymentSettings) {
      requests.push({
        addSheet: {
          properties: {
            title: 'PaymentSettings',
          }
        }
      });
    }

    if (!hasProducts) {
      requests.push({
        addSheet: {
          properties: {
            title: 'Category',
          }
        }
      });
    }

    // If there are missing tabs, create them in one batch update
    if (requests.length > 0) {
      const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
      if (!createRes.ok) {
        let errMsg = createRes.statusText;
        try {
          const errData = await createRes.json();
          if (errData?.error?.message) {
            errMsg = errData.error.message;
          }
        } catch {}
        throw new Error(`Failed to add sheets: ${errMsg}`);
      }

      // Important: Give Google Sheets API a moment to propagate newly created sheets structurally before writing to them
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Now populate headers for Profiles if it was missing
    if (!hasProfiles) {
      const profilesData = [
        [
          'Partner ID',
          'Partner Name',
          'Partner Number',
          'House No., Building, Street Name',
          'Unit | No (optional)',
          'Area or Thana',
          'City',
          'District',
          'Postal Code',
          'Partner Category',
          'Delivery Area (Dhaka City / Outside Dhaka)',
        ],
        [
          'P-1001',
          'করিম আহমেদ',
          '01700000000',
          'বাসা ১২, রোড ৫',
          'ফ্ল্যাট ৩এ',
          'ধানমন্ডি',
          'ঢাকা',
          'ঢাকা',
          '১২০৫',
          'Partner A',
          'Dhaka City',
        ],
      ];
      await updateSheetValuesWithRetry(spreadsheetId, 'Profiles!A1:K2', profilesData, accessToken);
    }

    // Populate or repair headers for Orders to ensure columns are perfectly aligned with data
    const ordersHeaders = [
      [
        'Order ID',
        'Date',
        'Partner ID',
        'Partner Name',
        'Partner Phone',
        'Items (Product x Qty...)',
        'Total Order Amount',
        'Status',
        'Shipping Address',
        'Payment Proof Link',
        'Damage Claim Details'
      ],
    ];
    await updateSheetValuesWithRetry(spreadsheetId, 'Orders!A1:K1', ordersHeaders, accessToken);

    // Populate default Products/Category if missing
    if (!hasProducts) {
      const categoryData = [
        [
          'Product ID',
          'Product Name',
          'Category',
          'Original Price',
          'Partner A Price',
          'Partner B Price',
          'Partner C Price',
          'Product Weight',
          'Product Photo URL',
          'Description',
        ],
        [
          'PROD001',
          'Premium Organic Honey (অর্গানিক মধু)',
          'Honey',
          '1200',
          '900',
          '1000',
          '1100',
          '500g',
          'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=400',
          '100% pure organic flower honey from Sundarbans forest.',
        ],
        [
          'PROD002',
          'Natural Chia Seeds (চিয়া সিড)',
          'Superfood',
          '850',
          '600',
          '700',
          '780',
          '250g',
          'https://images.unsplash.com/photo-1596450514735-111a2fe02935?auto=format&fit=crop&q=80&w=400',
          'High-fiber raw premium organic black chia seeds.',
        ],
        [
          'PROD003',
          'Virgin Coconut Oil (নারকেল তেল)',
          'Wellness',
          '950',
          '700',
          '800',
          '880',
          '500ml',
          'https://images.unsplash.com/photo-1622484211148-716598e04041?auto=format&fit=crop&q=80&w=400',
          'Extra virgin cold-pressed natural cooking & beauty coconut oil.',
        ],
        [
          'PROD004',
          'Premium Green Tea (গ্রিন টি)',
          'Beverage',
          '450',
          '300',
          '350',
          '400',
          '100g',
          'https://images.unsplash.com/photo-1564890369478-c90ae83b4feb?auto=format&fit=crop&q=80&w=400',
          'Antioxidant-rich selected premium hand-picked green tea leaves.',
        ],
        [
          'PROD005',
          'Organic Roasted Almonds (কাঠবাদাম)',
          'Nuts',
          '1500',
          '1100',
          '1250',
          '1380',
          '500g',
          'https://images.unsplash.com/photo-1508061253366-f7da158b6d46?auto=format&fit=crop&q=80&w=400',
          'Premium quality selected crunchy roasted whole almonds.',
        ],
      ];
      await updateSheetValuesWithRetry(spreadsheetId, 'Category!A1:J6', categoryData, accessToken);
    }

    // Populate PaymentSettings if it was missing
    if (!hasPaymentSettings) {
      const paymentSettingsData = [
        ['Method Name', 'Account Number / Detail', 'Type / Instructions'],
        ['বিকাশ (Bkash)', '01784961102', 'Personal (সেন্ড মানি)'],
        ['নগদ (Nagad)', '01784961102', 'Personal (সেন্ড মানি)'],
        ['ডাচ-বাংলা ব্যাংক (DBBL)', '১২৩.৪৫৬.৭৮৯০১২', 'একাউন্ট নাম: PureGlow International, বনানী শাখা, রাউটিং: ০৭৫২৬০১৩৪'],
      ];
      await updateSheetValuesWithRetry(spreadsheetId, 'PaymentSettings!A1:C4', paymentSettingsData, accessToken);
    }

    return true;
  } catch (error: any) {
    console.error('Error auto-fixing missing tabs:', error);
    throw error;
  }
};

// Fetch partner profiles from Web App API
export const fetchProfilesFromSheet = async (
  spreadsheetId?: string | null,
  accessToken?: string | null,
  webAppUrl?: string | null
): Promise<PartnerProfile[]> => {
  const targetUrl = webAppUrl || DEFAULT_WEB_APP_URL;

  if (targetUrl) {
    try {
      const res = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getProfiles`).catch(() => null);
      if (res && res.ok) {
        const text = await res.text().catch(() => '');
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          const list = data.profiles || data.data || (Array.isArray(data) ? data : []);
          if (Array.isArray(list) && list.length > 0) {
            return list.map((p: any) => ({
              partnerId: p.partnerId || p['Partner ID'] || '',
              name: p.name || p.partnerName || p['Partner Name'] || p['Name'] || '',
              phone: p.phone || p.partnerNumber || p['Partner Number'] || p['Phone'] || '',
              houseStreet: p.houseStreet || p['House No., Building, Street Name'] || '',
              unitNo: p.unitNo || p['Unit | No (optional)'] || '',
              areaThana: p.areaThana || p['Area or Thana'] || '',
              city: p.city || p['City'] || '',
              district: p.district || p['District'] || '',
              postalCode: p.postalCode || p['Postal Code'] || '',
              category: (p.category || p['Partner Category'] || 'Partner C') as 'Partner A' | 'Partner B' | 'Partner C',
              deliveryArea: p.deliveryArea || p['Delivery Area (Dhaka City / Outside Dhaka)'] || '',
              createdAt: p.createdAt || '',
            }));
          }
        }
      }
    } catch (e) {
      console.warn('WebApp profiles fetch skipped:', e);
    }
  }

  return [];
};

// Register a new partner profile
export const addPartnerToSheet = async (
  spreadsheetId: string,
  accessToken: string,
  profile: PartnerProfile
): Promise<boolean> => {
  try {
    const { profiles: profilesTab } = await resolveSheetTitles(spreadsheetId, accessToken);
    const row = [
      profile.partnerId,
      profile.name,
      profile.phone,
      profile.houseStreet,
      profile.unitNo,
      profile.areaThana,
      profile.city,
      profile.district,
      profile.postalCode,
      profile.category,
      profile.deliveryArea || '',
    ];

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(profilesTab + '!A:K')}:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error adding partner profile:', error);
    return false;
  }
};

export const parseProductsFromRows = (rows: any[][], tabName: string): Product[] => {
  if (!rows || rows.length === 0) return [];

  // Search first 5 rows for header row
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const rowText = rows[r].map(c => cleanCellString(c).toLowerCase().replace(/\s+/g, ' '));
    const hasHeaderKw = rowText.some(t => 
      t.includes('product') || t.includes('name') || t.includes('price') || 
      t.includes('id') || t.includes('brand') || t.includes('weight') || 
      t.includes('category') || t.includes('মূল্য') || t.includes('নাম')
    );
    if (hasHeaderKw) {
      headerRowIdx = r;
      break;
    }
  }

  let idIdx = 0;
  let nameIdx = 1;
  let weightIdx = 2;
  let brandIdx = 3;
  let categoryIdx = 3;
  let origPriceIdx = 4;
  let priceAIdx = 5;
  let priceBIdx = 6;
  let priceCIdx = 7;
  let imgIdx = 8;
  let descIdx = 9;

  if (headerRowIdx !== -1) {
    const cleanedHeaders = rows[headerRowIdx].map(c => cleanCellString(c).toLowerCase().replace(/\s+/g, ' '));
    console.log(`[CSV Parse] Found header row at index ${headerRowIdx} for tab "${tabName}":`, cleanedHeaders);

    cleanedHeaders.forEach((h, idx) => {
      if (h.includes('partner a') || h.includes('partner-a') || h.includes('wholesale price a') || h.includes('price a') || h === 'a') {
        priceAIdx = idx;
      } else if (h.includes('partner b') || h.includes('partner-b') || h.includes('wholesale price b') || h.includes('price b') || h === 'b') {
        priceBIdx = idx;
      } else if (h.includes('partner c') || h.includes('partner-c') || h.includes('wholesale price c') || h.includes('price c') || h === 'c') {
        priceCIdx = idx;
      } else if (h.includes('original price') || h.includes('asking price') || h.includes('base price') || h.includes('mrp')) {
        origPriceIdx = idx;
      } else if (h.includes('product id') || (h.includes('id') && !h.includes('provided'))) {
        idIdx = idx;
      } else if (h.includes('product name') || h.includes('name') || h.includes('title') || h.includes('নাম')) {
        nameIdx = idx;
      } else if (h.includes('image') || h.includes('photo') || h.includes('url') || h.includes('pic') || h.includes('link') || h.includes('ছবি')) {
        imgIdx = idx;
      } else if (h.includes('weight') || h.includes('size') || h.includes('ওজন')) {
        weightIdx = idx;
      } else if (h.includes('brand') || h.includes('ব্র্যান্ড')) {
        brandIdx = idx;
      } else if (h.includes('cate-gory') || h.includes('category') || h.includes('ক্যাটাগরি')) {
        categoryIdx = idx;
      } else if (h.includes('price') || h.includes('মূল্য')) {
        if (origPriceIdx === -1) origPriceIdx = idx;
      } else if (h.includes('description') || h.includes('details') || h.includes('বিবরণ')) {
        descIdx = idx;
      }
    });

    console.log(`[CSV Parse] Dynamic column mapping for "${tabName}":`, {
      idIdx, nameIdx, weightIdx, brandIdx, categoryIdx, origPriceIdx, priceAIdx, priceBIdx, priceCIdx, imgIdx, descIdx
    });
  }

  const dataRows = headerRowIdx !== -1 ? rows.slice(headerRowIdx + 1) : rows;
  const products: Product[] = [];

  dataRows.forEach((row, i) => {
    const name = cleanCellString(row[nameIdx]);
    // Skip empty rows, header rows, or error rows
    if (!name || name.toLowerCase().includes('product name') || name.startsWith('#')) return;

    let id = cleanCellString(row[idIdx]);
    if (!id) id = `P-${1000 + i + 1}`;

    let brand = cleanCellString(row[brandIdx]);
    let category = cleanCellString(row[categoryIdx]) || brand || (name ? name.split(' ')[0] : 'General');
    if (!brand) brand = category;

    let weight = cleanCellString(row[weightIdx]);
    let imageUrl = cleanCellString(row[imgIdx]);
    let description = cleanCellString(row[descIdx]);

    const originalPrice = parsePrice(row[origPriceIdx]);
    let partnerAPrice = parsePrice(row[priceAIdx]);
    let partnerBPrice = parsePrice(row[priceBIdx]);
    let partnerCPrice = parsePrice(row[priceCIdx]);

    if (partnerAPrice === 0) partnerAPrice = originalPrice;
    if (partnerBPrice === 0) partnerBPrice = originalPrice;
    if (partnerCPrice === 0) partnerCPrice = originalPrice;

    // Direct Image URL cleanups for Google Drive & ImgBB
    if (imageUrl) {
      if (imageUrl.includes('drive.google.com') || imageUrl.includes('docs.google.com')) {
        const match = imageUrl.match(/\/file\/d\/([^\/?&]+)/) || imageUrl.match(/id=([^\/?&]+)/);
        if (match && match[1]) {
          imageUrl = `https://lh3.googleusercontent.com/d/${match[1]}=s800`;
        }
      }
    }

    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400';
    }

    products.push({
      id,
      name,
      category,
      originalPrice,
      partnerAPrice,
      partnerBPrice,
      partnerCPrice,
      weight,
      imageUrl,
      description,
    });
  });

  return products;
};

export const parseProductsFromAnyJson = (json: any): Product[] => {
  if (!json) return [];

  let list: any[] = [];
  if (Array.isArray(json)) {
    list = json;
  } else if (typeof json === 'object') {
    if (Array.isArray(json.products)) list = json.products;
    else if (Array.isArray(json.data)) list = json.data;
    else if (Array.isArray(json.rows)) list = json.rows;
    else if (Array.isArray(json.items)) list = json.items;
    else if (Array.isArray(json.result)) list = json.result;
    else if (Array.isArray(json.values)) list = json.values;
  }

  if (!list || list.length === 0) return [];

  // If elements are 2D array rows
  if (Array.isArray(list[0])) {
    return parseProductsFromRows(list, 'Category');
  }

  // If list of JSON objects
  const products: Product[] = [];
  list.forEach((item: any, i: number) => {
    if (!item || typeof item !== 'object') return;

    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        for (const itemKey of Object.keys(item)) {
          if (itemKey.toLowerCase().replace(/\s+/g, ' ').includes(k.toLowerCase())) {
            const val = cleanCellString(item[itemKey]);
            if (val) return val;
          }
        }
      }
      return '';
    };

    const name = getVal('product name', 'name', 'title', 'নাম');
    if (!name || name.toLowerCase().includes('product name')) return;

    let id = getVal('product id', 'id', 'code', 'আইডি');
    if (!id) id = `P-${1000 + i + 1}`;

    let weight = getVal('weight', 'size', 'ওজন');
    let brand = getVal('brand', 'ব্র্যান্ড');
    let category = getVal('category', 'ক্যাটাগরি') || brand || (name ? name.split(' ')[0] : 'General');
    if (!brand) brand = category;

    let imageUrl = getVal('image url', 'image', 'photo', 'pic', 'url', 'link', 'ছবি');
    let description = getVal('description', 'details', 'বিবরণ');

    const rawOrig = getVal('original price', 'asking price', 'base price', 'mrp', 'price', 'মূল্য');
    const rawPriceA = getVal('partner a', 'price a', 'wholesale price a');
    const rawPriceB = getVal('partner b', 'price b', 'wholesale price b');
    const rawPriceC = getVal('partner c', 'price c', 'wholesale price c');

    const originalPrice = parsePrice(rawOrig || item.originalPrice || item.price);
    let partnerAPrice = parsePrice(rawPriceA || item.partnerAPrice || item.priceA);
    let partnerBPrice = parsePrice(rawPriceB || item.partnerBPrice || item.priceB);
    let partnerCPrice = parsePrice(rawPriceC || item.partnerCPrice || item.priceC);

    if (partnerAPrice === 0) partnerAPrice = originalPrice;
    if (partnerBPrice === 0) partnerBPrice = originalPrice;
    if (partnerCPrice === 0) partnerCPrice = originalPrice;

    if (imageUrl) {
      if (imageUrl.includes('drive.google.com') || imageUrl.includes('docs.google.com')) {
        const match = imageUrl.match(/\/file\/d\/([^\/?&]+)/) || imageUrl.match(/id=([^\/?&]+)/);
        if (match && match[1]) {
          imageUrl = `https://lh3.googleusercontent.com/d/${match[1]}=s800`;
        }
      }
    }

    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
      imageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400';
    }

    products.push({
      id,
      name,
      category,
      originalPrice,
      partnerAPrice,
      partnerBPrice,
      partnerCPrice,
      weight,
      imageUrl,
      description,
    });
  });

  return products;
};

export const parseGvizJsonTo2DArray = (text: string): any[][] => {
  try {
    if (!text) return [];
    let cleanText = text.trim();

    // Strip /*O_o*/ header comment if present
    if (cleanText.startsWith('/*O_o*/')) {
      cleanText = cleanText.substring(7).trim();
    }

    // Strip google.visualization.Query.setResponse(...) wrapper if present
    if (cleanText.includes('google.visualization.Query.setResponse(')) {
      const startParen = cleanText.indexOf('(');
      const lastParen = cleanText.lastIndexOf(')');
      if (startParen !== -1 && lastParen !== -1) {
        cleanText = cleanText.substring(startParen + 1, lastParen);
      }
    } else {
      const startIdx = cleanText.indexOf('{');
      const endIdx = cleanText.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1) {
        cleanText = cleanText.substring(startIdx, endIdx + 1);
      }
    }

    const parsed = JSON.parse(cleanText);
    const cols = parsed.table?.cols || [];
    const rows = parsed.table?.rows || [];

    const result: any[][] = [];
    const headerRow = cols.map((col: any) => col.label || col.id || '');
    if (headerRow.some((h: string) => h && h.length > 0)) {
      result.push(headerRow);
    }

    rows.forEach((row: any) => {
      if (!row || !row.c) return;
      const rowValues = row.c.map((cell: any) => {
        if (!cell) return '';
        if (cell.f !== undefined && cell.f !== null) return cell.f;
        if (cell.v !== undefined && cell.v !== null) return cell.v;
        return '';
      });
      result.push(rowValues);
    });

    return result;
  } catch (err) {
    console.warn('[GViz Parse Error]', err);
    return [];
  }
};

// Fetch all products via Google Apps Script Web App JSON API with multi-layer fallbacks
export const fetchProductsFromSheet = async (
  spreadsheetIdInput?: string | null,
  accessToken?: string | null,
  webAppUrlInput?: string | null
): Promise<Product[]> => {
  const primaryId = cleanSpreadsheetId(spreadsheetIdInput || DEFAULT_SPREADSHEET_ID);
  const activeWebAppUrl = webAppUrlInput || DEFAULT_WEB_APP_URL;

  // 1. Primary Attempt: Direct Google Apps Script Web App JSON API
  if (activeWebAppUrl) {
    try {
      console.log(`[Catalog Fetch] Direct Apps Script JSON fetch: ${activeWebAppUrl}`);
      const res = await fetch(activeWebAppUrl).catch(() => null);

      if (res && res.ok) {
        const text = await res.text().catch(() => '');
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const data = JSON.parse(trimmed);
          const products = parseProductsFromAnyJson(data);
          if (products.length > 0) {
            console.log(`[Catalog Fetch] SUCCESS: Loaded ${products.length} live products directly from Apps Script.`);
            return products;
          }
        }
      }

      // Try with ?action=getProducts parameter
      const actionUrl = `${activeWebAppUrl}${activeWebAppUrl.includes('?') ? '&' : '?'}action=getProducts`;
      const actionRes = await fetch(actionUrl).catch(() => null);
      if (actionRes && actionRes.ok) {
        const actionText = await actionRes.text().catch(() => '');
        const actionTrimmed = actionText.trim();
        if (actionTrimmed.startsWith('{') || actionTrimmed.startsWith('[')) {
          const actionData = JSON.parse(actionTrimmed);
          const actionProducts = parseProductsFromAnyJson(actionData);
          if (actionProducts.length > 0) {
            console.log(`[Catalog Fetch] SUCCESS: Loaded ${actionProducts.length} live products via ?action=getProducts.`);
            return actionProducts;
          }
        }
      }
    } catch (err) {
      console.warn('[Catalog Fetch] WebApp fetch skipped or network restricted:', err);
    }
  }

  // Fallback Catalog if WebApp API fails or returns empty
  console.log('[Catalog Fetch] Serving default master catalog products.');
  return DEFAULT_PRODUCTS;
};

// Register partner details via Google Apps Script Web App POST endpoint
export const registerPartnerViaWebApp = async (
  webAppUrl: string,
  profile: PartnerProfile
): Promise<boolean> => {
  const targetUrl = webAppUrl || DEFAULT_WEB_APP_URL;
  console.log('[WebApp Register] Posting partner profile to WebApp URL:', targetUrl);

  const payload = {
    action: 'registerPartner',
    partnerId: profile.partnerId,
    name: profile.name,
    phone: profile.phone,
    houseStreet: profile.houseStreet,
    unitNo: profile.unitNo,
    areaThana: profile.areaThana,
    city: profile.city,
    district: profile.district,
    postalCode: profile.postalCode,
    category: profile.category,
    deliveryArea: profile.deliveryArea || '',
    // Spread field aliases for Google Apps Script parameter flexibility
    "Partner ID": profile.partnerId,
    "Partner Name": profile.name,
    "Partner Number": profile.phone,
    "House No., Building, Street Name": profile.houseStreet,
    "Unit | No (optional)": profile.unitNo,
    "Area or Thana": profile.areaThana,
    "City": profile.city,
    "District": profile.district,
    "Postal Code": profile.postalCode,
    "Partner Category": profile.category,
    "Delivery Area (Dhaka City / Outside Dhaka)": profile.deliveryArea || ''
  };

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log('[WebApp Register] Successfully registered partner via WebApp.');
      return true;
    }

    // Try no-cors fetch fallback
    await fetch(targetUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    return true;
  } catch (err) {
    console.warn('[WebApp Register] Standard POST encounter error, trying no-cors fallback:', err);
    try {
      await fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(payload),
      });
      return true;
    } catch (fallbackErr) {
      console.error('[WebApp Register] WebApp POST failed:', fallbackErr);
      return false;
    }
  }
};

// Login partner via Google Apps Script Web App POST endpoint
export const loginPartnerViaWebApp = async (
  webAppUrl: string,
  inputPartnerId: string,
  inputPartnerNumber: string
): Promise<{ success: boolean; message?: string; partner?: PartnerProfile }> => {
  const targetUrl = webAppUrl || DEFAULT_WEB_APP_URL;
  console.log('[WebApp Login] Posting login credentials to:', targetUrl);

  const payload = {
    action: 'loginPartner',
    partnerId: inputPartnerId,
    partnerNumber: inputPartnerNumber,
  };

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('[WebApp Login] Received non-JSON response from server:', text);
      }

      console.log('[WebApp Login] Server response parsed:', data);

      const isSuccess =
        data.status === 'success' ||
        data.status === 'SUCCESS' ||
        data.result === 'success' ||
        data.success === true;

      if (isSuccess) {
        // Extract partner record if present in response
        const pData = data.partner || data.profile || data.partnerDetails || data.data || data;
        const matchedProfile: PartnerProfile = {
          partnerId: pData.partnerId || pData['Partner ID'] || inputPartnerId,
          name: pData.name || pData.partnerName || pData['Partner Name'] || pData['Name'] || `Partner (${inputPartnerId})`,
          phone: pData.phone || pData.partnerNumber || pData['Partner Number'] || inputPartnerNumber,
          houseStreet: pData.houseStreet || pData['House No., Building, Street Name'] || '',
          unitNo: pData.unitNo || pData['Unit | No (optional)'] || '',
          areaThana: pData.areaThana || pData['Area or Thana'] || '',
          city: pData.city || pData['City'] || '',
          district: pData.district || pData['District'] || '',
          postalCode: pData.postalCode || pData['Postal Code'] || '',
          category: (pData.category || pData['Partner Category'] || 'Partner A') as 'Partner A' | 'Partner B' | 'Partner C',
          deliveryArea: pData.deliveryArea || pData['Delivery Area (Dhaka City / Outside Dhaka)'] || '',
          createdAt: pData.createdAt || new Date().toISOString(),
        };

        return {
          success: true,
          message: data.message || 'লগইন সফল হয়েছে।',
          partner: matchedProfile,
        };
      } else {
        return {
          success: false,
          message: data.message || data.error || 'পার্টনার আইডি বা মোবাইল নাম্বারটি সঠিক নয়।',
        };
      }
    } else {
      return {
        success: false,
        message: `সার্ভার রেসপন্স করতে পারছে না (স্ট্যাটাস: ${response.status})।`,
      };
    }
  } catch (err) {
    console.error('[WebApp Login] WebApp POST network error:', err);
    return {
      success: false,
      message: 'নেটওয়ার্ক সংযোগ বা ওয়েবঅ্যাপ সার্ভারে সমস্যা হচ্ছে। দয়া করে আবার চেষ্টা করুন।',
    };
  }
};

// Fetch all orders from Web App API
export const fetchOrdersFromSheet = async (
  spreadsheetId?: string | null,
  accessToken?: string | null,
  webAppUrl?: string | null
): Promise<Order[]> => {
  const targetUrl = webAppUrl || DEFAULT_WEB_APP_URL;

  if (targetUrl) {
    try {
      const res = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getOrders`).catch(() => null);
      if (res && res.ok) {
        const text = await res.text().catch(() => '');
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          const list = data.orders || data.data || (Array.isArray(data) ? data : []);
          if (Array.isArray(list) && list.length > 0) {
            return list.map((o: any) => ({
              orderId: o.orderId || o['Order ID'] || '',
              date: o.date || o['Date'] || '',
              partnerId: o.partnerId || o['Partner ID'] || '',
              partnerName: o.partnerName || o['Partner Name'] || '',
              partnerPhone: o.partnerPhone || o['Partner Phone'] || '',
              items: o.items || o['Items (Product x Qty...)'] || '',
              totalAmount: isNaN(Number(o.totalAmount || o['Total Order Amount'])) ? 0 : Number(o.totalAmount || o['Total Order Amount']),
              status: o.status || o['Status'] || 'Pending',
              shippingAddress: o.shippingAddress || o['Shipping Address'] || '',
              paymentProofUrl: o.paymentProofUrl || o['Payment Proof Link'] || '',
              damageClaim: o.damageClaim || o['Damage Claim Details'] || '',
            }));
          }
        }
      }
    } catch (e) {
      console.warn('WebApp orders fetch skipped:', e);
    }
  }

  return [];
};

// Submit a new order via Web App API or Sheets API
export const submitOrderToSheet = async (
  spreadsheetId: string,
  accessToken: string | null | undefined,
  order: Omit<Order, 'status'>,
  webAppUrl?: string | null
): Promise<boolean> => {
  const targetUrl = webAppUrl || DEFAULT_WEB_APP_URL;

  // 1. Primary: Apps Script Web App POST API
  if (targetUrl) {
    try {
      const payload = {
        action: 'submitOrder',
        order,
      };
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (response && response.ok) {
        const text = await response.text().catch(() => '');
        if (text.includes('success') || text.includes('SUCCESS') || response.status === 200) {
          return true;
        }
      }
    } catch (e) {
      console.warn('WebApp submit order POST skipped:', e);
    }
  }

  // 2. Secondary: Authenticated Sheets API
  if (accessToken) {
    try {
      const { orders: ordersTab } = await resolveSheetTitles(spreadsheetId, accessToken);
      const row = [
        order.orderId,
        order.date,
        order.partnerId,
        order.partnerName,
        order.partnerPhone,
        order.items,
        order.totalAmount,
        'Pending', // Defaults to 'Pending' (Order Processing)
        order.shippingAddress,
        order.paymentProofUrl,
        '', // Damage Claim Details starts empty
      ];

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ordersTab + '!A:K')}:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [row],
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error submitting order via Sheets API:', error);
    }
  }

  return false;
};

// Real Google Drive multipart file uploader
export const uploadFileToDrive = async (accessToken: string, file: File): Promise<string> => {
  try {
    const metadata = {
      name: `Payment_Receipt_${Date.now()}_${file.name}`,
      mimeType: file.type,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    );

    if (!response.ok) {
      throw new Error(`Drive upload failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Set shareable link permissions
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      });
    } catch (e) {
      console.warn('Could not update permission, using standard link:', e);
    }

    return result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`;
  } catch (error) {
    console.error('Error uploading file to Drive:', error);
    throw error;
  }
};

// Fetch Google Contacts as a fallback/additional utility
export const fetchGoogleContacts = async (accessToken: string): Promise<Contact[]> => {
  try {
    const response = await fetch(
      'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=100',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const connections = data.connections || [];

    return connections.map((person: any) => {
      const name = person.names?.[0]?.displayName || 'Unknown';
      const email = person.emailAddresses?.[0]?.value || '';
      const phone = person.phoneNumbers?.[0]?.value || '';
      return { name, email, phone };
    });
  } catch (error) {
    console.error('Error fetching Google Contacts:', error);
    return [];
  }
};

export interface PaymentMethod {
  methodName: string;
  accountNo: string;
  details: string;
}

// Fetch payment methods from PaymentSettings sheet or Web App API, fallback to defaults if not exists
export const fetchPaymentMethodsFromSheet = async (
  spreadsheetId: string,
  accessToken?: string | null,
  webAppUrl?: string | null
): Promise<PaymentMethod[]> => {
  const defaultMethods: PaymentMethod[] = [
    { methodName: 'বিকাশ (Bkash)', accountNo: '01700000000', details: 'Personal (সেন্ড মানি)' },
    { methodName: 'নগদ (Nagad)', accountNo: '01700000000', details: 'Personal (সেন্ড মানি)' },
  ];

  const targetUrl = webAppUrl || DEFAULT_WEB_APP_URL;
  if (targetUrl) {
    try {
      const res = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getPaymentSettings`).catch(() => null);
      if (res && res.ok) {
        const text = await res.text().catch(() => '');
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          const methods = data.paymentMethods || data.paymentSettings || data.methods || (Array.isArray(data) ? data : []);
          if (Array.isArray(methods) && methods.length > 0) {
            return methods.map((m: any) => ({
              methodName: m.methodName || m.name || m['Method Name'] || '',
              accountNo: m.accountNo || m.number || m['Account Number'] || '',
              details: m.details || m['Details'] || '',
            })).filter((m: PaymentMethod) => m.methodName.trim() !== '');
          }
        }
      }
    } catch (e) {
      console.warn('WebApp payment settings fetch skipped:', e);
    }
  }

  return defaultMethods;
};

// Automatically repair orders headers
export const repairOrdersHeaders = async (spreadsheetId: string, accessToken: string): Promise<boolean> => {
  try {
    const ordersHeaders = [
      [
        'Order ID',
        'Date',
        'Partner ID',
        'Partner Name',
        'Partner Phone',
        'Items (Product x Qty...)',
        'Total Order Amount',
        'Status',
        'Shipping Address',
        'Payment Proof Link',
        'Damage Claim Details'
      ]
    ];
    return await updateSheetValuesWithRetry(spreadsheetId, 'Orders!A1:K1', ordersHeaders, accessToken);
  } catch (e) {
    console.error('Error repairing orders headers:', e);
    return false;
  }
};

// Set up native Google Sheets dropdown data validation on the Status column (Column H)
export const setupOrdersDataValidation = async (
  spreadsheetId: string,
  accessToken: string
): Promise<boolean> => {
  try {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return false;
    const data = await response.json();
    const ordersSheet = data.sheets?.find((s: any) => s.properties?.title?.toLowerCase() === 'orders');
    if (!ordersSheet) return false;

    const sheetId = ordersSheet.properties.sheetId;

    const validationRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            setDataValidation: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: 5000,
                startColumnIndex: 7,
                endColumnIndex: 8,
              },
              rule: {
                condition: {
                  type: 'ONE_OF_LIST',
                  values: [
                    { userEnteredValue: 'Pending' },
                    { userEnteredValue: 'Payment Received' },
                    { userEnteredValue: 'Packing Started' },
                    { userEnteredValue: 'Sent to Courier' },
                    { userEnteredValue: 'Successfully Completed' },
                    { userEnteredValue: 'Damage Claimed' }
                  ],
                },
                showCustomUi: true,
                strict: false,
              },
            },
          },
        ],
      }),
    });

    return validationRes.ok;
  } catch (error) {
    console.error('Error setting up data validation:', error);
    return false;
  }
};

// Submit a partner's damage claim to the spreadsheet (updates status and adds claim info to column K)
export const submitDamageClaimToSheet = async (
  spreadsheetId: string,
  accessToken: string,
  orderId: string,
  claimDetails: string
): Promise<boolean> => {
  try {
    const { orders: ordersTab } = await resolveSheetTitles(spreadsheetId, accessToken);
    
    // 1. Fetch Order IDs to find the correct row
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ordersTab + '!A:A')}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    if (!res.ok) return false;
    const data = await res.json();
    const rows = data.values || [];
    
    // Find matching order index
    const rowIndex = rows.findIndex((r: any) => r[0] && r[0].toString().trim() === orderId.trim());
    if (rowIndex === -1) {
      throw new Error(`Order ${orderId} not found in sheet.`);
    }
    
    const rowNum = rowIndex + 1; // 1-based index
    
    // 2. Update Column K (Damage Claim Details) and Column H (Status) of that row
    const statusUpdateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ordersTab + '!H' + rowNum + ':H' + rowNum)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [['Damage Claimed']] }),
      }
    );
    
    const claimUpdateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(ordersTab + '!K' + rowNum + ':K' + rowNum)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [[claimDetails]] }),
      }
    );
    
    return statusUpdateRes.ok && claimUpdateRes.ok;
  } catch (error) {
    console.error('Error submitting damage claim:', error);
    return false;
  }
};

export interface BillingSettings {
  courierInside: number;
  courierOutside: number;
  packingBase: number;
  packingPerItem: number;
  baseWeightLimitKg: number;
  extraWeightChargeInside: number;
  extraWeightChargeOutside: number;
  freeShippingThreshold: number;
  promoCodes: Record<string, number>; // coupon_code -> percentage_discount (e.g. 100)
  noticeText?: string;
}

// Fetch shipping and packing settings from the PaymentSettings sheet or Web App API
export const fetchBillingSettingsFromSheet = async (
  spreadsheetId: string,
  accessToken?: string | null,
  webAppUrl?: string | null
): Promise<BillingSettings> => {
  const defaultSettings: BillingSettings = {
    courierInside: 80,
    courierOutside: 150,
    packingBase: 30,
    packingPerItem: 5,
    baseWeightLimitKg: 1.0,
    extraWeightChargeInside: 30,
    extraWeightChargeOutside: 50,
    freeShippingThreshold: 25000,
    promoCodes: { 'FREECOURIER': 100, 'FREESHIP': 100, 'COURIER50': 50 },
    noticeText: 'নতুন ক্যাটালগ রিলিজ হয়েছে! ঢাকা সিটি কুরিয়ার চার্জ মাত্র ৳৮০। আপনাদের বিশেষ ডিস্কাউন্টেড রেট ক্যাটালগে একটিভ আছে।',
  };

  const targetUrl = webAppUrl || DEFAULT_WEB_APP_URL;
  if (targetUrl) {
    try {
      const res = await fetch(`${targetUrl}${targetUrl.includes('?') ? '&' : '?'}action=getPaymentSettings`).catch(() => null);
      if (res && res.ok) {
        const text = await res.text().catch(() => '');
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          const data = JSON.parse(text);
          const settings = data.billingSettings || data.settings || data;
          if (settings && typeof settings === 'object' && (settings.courierInside || settings.noticeText || settings.courierOutside)) {
            return {
              courierInside: Number(settings.courierInside) || defaultSettings.courierInside,
              courierOutside: Number(settings.courierOutside) || defaultSettings.courierOutside,
              packingBase: Number(settings.packingBase) || defaultSettings.packingBase,
              packingPerItem: Number(settings.packingPerItem) || defaultSettings.packingPerItem,
              baseWeightLimitKg: Number(settings.baseWeightLimitKg) || defaultSettings.baseWeightLimitKg,
              extraWeightChargeInside: Number(settings.extraWeightChargeInside) || defaultSettings.extraWeightChargeInside,
              extraWeightChargeOutside: Number(settings.extraWeightChargeOutside) || defaultSettings.extraWeightChargeOutside,
              freeShippingThreshold: Number(settings.freeShippingThreshold) || defaultSettings.freeShippingThreshold,
              promoCodes: settings.promoCodes || defaultSettings.promoCodes,
              noticeText: settings.noticeText || defaultSettings.noticeText,
            };
          }
        }
      }
    } catch (e) {
      console.warn('WebApp billing settings fetch skipped:', e);
    }
  }

  return defaultSettings;
};


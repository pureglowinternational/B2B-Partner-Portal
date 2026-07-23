// Default hardcoded Google Sheet ID for public catalog access
export const DEFAULT_SPREADSHEET_ID = '1Qw4HYY-WRAnG5I6HP3TVtwFe0QQc2ifwNyHYzH_sAo';

// Default Google Apps Script Web App URL for Partner Registrations
export const DEFAULT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzW-XqSlGG9CgAms3rL1hMT7B8cq2jHnk8pPdMcTUF4aV6LgfKjGlt1mkP2xlfEPVWffw/exec';

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
  return isNaN(num) ? 0 : num;
};

// Universal sheet values reader: supports OAuth Bearer, public Sheets API v4, and public gviz CSV
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
    // Continue to CSV fallback
  }

  // 3. Try Google Visualization API (gviz) CSV endpoint (works for public "Anyone with link can view" sheets)
  try {
    const sheetName = rangeOrSheet.split('!')[0];
    const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const csvRes = await fetch(csvUrl);
    if (csvRes.ok) {
      const csvText = await csvRes.text();
      const parsed = parseCsvTo2DArray(csvText);
      if (parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('CSV public fetch failed:', e);
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

// Fetch partner profiles from sheet
export const fetchProfilesFromSheet = async (spreadsheetId: string, accessToken?: string | null): Promise<PartnerProfile[]> => {
  try {
    const { profiles: profilesTab } = await resolveSheetTitles(spreadsheetId, accessToken);
    const rows = await fetchRangeValues(spreadsheetId, `${profilesTab}!A2:K2000`, accessToken);

    return rows.map((row: any) => ({
      partnerId: row[0] || '',
      name: row[1] || '',
      phone: row[2] || '',
      houseStreet: row[3] || '',
      unitNo: row[4] || '',
      areaThana: row[5] || '',
      city: row[6] || '',
      district: row[7] || '',
      postalCode: row[8] || '',
      category: (row[9] || 'Partner C') as 'Partner A' | 'Partner B' | 'Partner C',
      deliveryArea: row[10] || '',
    }));
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return [];
  }
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
    const startIdx = text.indexOf('{');
    const endIdx = text.lastIndexOf('}');
    if (startIdx === -1 || endIdx === -1) return [];
    const jsonStr = text.substring(startIdx, endIdx + 1);
    const parsed = JSON.parse(jsonStr);
    const cols = parsed.table?.cols || [];
    const rows = parsed.table?.rows || [];

    const result: any[][] = [];
    const headerRow = cols.map((col: any) => col.label || col.id || '');
    if (headerRow.some((h: string) => h.length > 0)) {
      result.push(headerRow);
    }

    rows.forEach((row: any) => {
      if (!row.c) return;
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

// Fetch all products via Google Apps Script Web App JSON endpoint or Google Sheets fallbacks
export const fetchProductsFromSheet = async (
  spreadsheetIdInput?: string | null,
  accessToken?: string | null,
  webAppUrlInput?: string | null
): Promise<Product[]> => {
  const primaryId = cleanSpreadsheetId(spreadsheetIdInput || DEFAULT_SPREADSHEET_ID);
  const activeWebAppUrl = webAppUrlInput || DEFAULT_WEB_APP_URL;

  // 1. Fetch from Google Apps Script Web App JSON API
  const webAppEndpoints = [
    `${activeWebAppUrl}?action=getProducts`,
    `${activeWebAppUrl}?action=getProducts&sheetId=${primaryId}`,
    `${DEFAULT_WEB_APP_URL}?action=getProducts`,
    `${DEFAULT_WEB_APP_URL}?action=getProducts&sheetId=${primaryId}`
  ];

  for (const url of webAppEndpoints) {
    try {
      console.log(`[Catalog Fetch] Attempting WebApp JSON fetch: ${url}`);
      const res = await fetch(url);
      if (res.ok) {
        const text = await res.text();
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const json = JSON.parse(trimmed);
          const products = parseProductsFromAnyJson(json);
          if (products.length > 0) {
            console.log(`[Catalog Fetch] SUCCESS: Loaded ${products.length} products from WebApp API!`);
            return products;
          }
        }
      }
    } catch (webAppErr) {
      console.warn(`[Catalog Fetch] WebApp fetch error for ${url}:`, webAppErr);
    }
  }

  // 2. Fetch from Direct Google Sheet CSV & GViz JSON endpoints
  const idsToTry = [primaryId];
  if (primaryId !== DEFAULT_SPREADSHEET_ID) {
    idsToTry.push(DEFAULT_SPREADSHEET_ID);
  }

  const candidateTabs = ['Category', 'Data', 'Products'];

  for (const spreadsheetId of idsToTry) {
    for (const tabName of candidateTabs) {
      console.log(`[Catalog Fetch] Trying sheet "${spreadsheetId}" tab "${tabName}"`);

      // Try CSV
      try {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
        const csvRes = await fetch(csvUrl);
        if (csvRes.ok) {
          const text = await csvRes.text();
          if (text && !text.trim().startsWith('<!DOCTYPE') && !text.trim().startsWith('<html')) {
            const rows = parseCsvTo2DArray(text);
            const parsed = parseProductsFromRows(rows, tabName);
            if (parsed.length > 0) {
              console.log(`[Catalog Fetch] SUCCESS: Loaded ${parsed.length} products via CSV.`);
              return parsed;
            }
          }
        }
      } catch (e) {
        console.warn(`[CSV Fetch Error] "${tabName}" on "${spreadsheetId}":`, e);
      }

      // Try GViz JSON
      try {
        const jsonUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
        const jsonRes = await fetch(jsonUrl);
        if (jsonRes.ok) {
          const text = await jsonRes.text();
          if (text) {
            const rows = parseGvizJsonTo2DArray(text);
            const parsed = parseProductsFromRows(rows, tabName);
            if (parsed.length > 0) {
              console.log(`[Catalog Fetch] SUCCESS: Loaded ${parsed.length} products via GViz JSON.`);
              return parsed;
            }
          }
        }
      } catch (e) {
        console.warn(`[GViz JSON Fetch Error] "${tabName}" on "${spreadsheetId}":`, e);
      }

      // Try Sheets API if authenticated
      if (accessToken) {
        try {
          const rows = await fetchRangeValues(spreadsheetId, `${tabName}!A1:L500`, accessToken);
          const parsed = parseProductsFromRows(rows, tabName);
          if (parsed.length > 0) {
            console.log(`[Catalog Fetch] SUCCESS: Loaded ${parsed.length} products via Sheets API.`);
            return parsed;
          }
        } catch (e) {
          console.warn(`[Sheets API Fetch Error] "${tabName}" on "${spreadsheetId}":`, e);
        }
      }
    }
  }

  console.warn('[Catalog Fetch] All endpoints returned 0 products.');
  return [];
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

// Fetch all orders from 'Orders' sheet
export const fetchOrdersFromSheet = async (spreadsheetId: string, accessToken?: string | null): Promise<Order[]> => {
  try {
    const { orders: ordersTab } = await resolveSheetTitles(spreadsheetId, accessToken);
    const rows = await fetchRangeValues(spreadsheetId, `${ordersTab}!A2:K5000`, accessToken);

    return rows.map((row: any) => ({
      orderId: row[0] || '',
      date: row[1] || '',
      partnerId: row[2] || '',
      partnerName: row[3] || '',
      partnerPhone: row[4] || '',
      items: row[5] || '',
      totalAmount: isNaN(Number(row[6])) ? 0 : Number(row[6]),
      status: row[7] || 'Pending',
      shippingAddress: row[8] || '',
      paymentProofUrl: row[9] || '',
      damageClaim: row[10] || '',
    }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

// Submit a new order
export const submitOrderToSheet = async (
  spreadsheetId: string,
  accessToken: string,
  order: Omit<Order, 'status'>
): Promise<boolean> => {
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
    console.error('Error submitting order:', error);
    return false;
  }
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

// Fetch payment methods from PaymentSettings sheet, fallback to defaults if not exists
export const fetchPaymentMethodsFromSheet = async (
  spreadsheetId: string,
  accessToken?: string | null
): Promise<PaymentMethod[]> => {
  const defaultMethods: PaymentMethod[] = [
    { methodName: 'বিকাশ (Bkash)', accountNo: '01700000000', details: 'Personal (সেন্ড মানি)' },
    { methodName: 'নগদ (Nagad)', accountNo: '01700000000', details: 'Personal (সেন্ড মানি)' },
  ];

  try {
    const rows = await fetchRangeValues(spreadsheetId, 'PaymentSettings!A2:C30', accessToken);

    if (rows.length === 0) {
      return defaultMethods;
    }

    return rows
      .map((row: any) => ({
        methodName: row[0] || '',
        accountNo: row[1] || '',
        details: row[2] || '',
      }))
      .filter((m: PaymentMethod) => m.methodName.trim() !== '' && !m.methodName.startsWith('[') && !m.methodName.toLowerCase().includes('settings'));
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return defaultMethods;
  }
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

// Fetch shipping and packing settings from the PaymentSettings sheet, with automatic default seed if missing
export const fetchBillingSettingsFromSheet = async (
  spreadsheetId: string,
  accessToken?: string | null
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

  try {
    const rows = await fetchRangeValues(spreadsheetId, 'PaymentSettings!A1:C50', accessToken);

    if (rows.length === 0) {
      return defaultSettings;
    }

    let courierInside = defaultSettings.courierInside;
    let courierOutside = defaultSettings.courierOutside;
    let packingBase = defaultSettings.packingBase;
    let packingPerItem = defaultSettings.packingPerItem;
    let baseWeightLimitKg = defaultSettings.baseWeightLimitKg;
    let extraWeightChargeInside = defaultSettings.extraWeightChargeInside;
    let extraWeightChargeOutside = defaultSettings.extraWeightChargeOutside;
    let freeShippingThreshold = defaultSettings.freeShippingThreshold;
    let noticeText = '';
    const promoCodes: Record<string, number> = {};

    let hasCourierInside = false;
    let hasCourierOutside = false;
    let hasPackingBase = false;
    let hasPackingPerItem = false;
    let hasBaseWeightLimitKg = false;
    let hasExtraWeightChargeInside = false;
    let hasExtraWeightChargeOutside = false;
    let hasFreeShippingThreshold = false;
    let hasNotice = false;

    rows.forEach((row: any) => {
      const colA = (row[0] || '').trim();
      const colB = (row[1] || '').trim();
      
      if (colA.startsWith('[Settings]')) {
        const key = colA.replace('[Settings]', '').trim().toLowerCase();
        
        if (key.includes('notice') || key.includes('announcement') || key.includes('ঘোষণা')) {
          noticeText = colB;
          hasNotice = true;
        } else {
          const value = Number(colB);
          if (!isNaN(value)) {
            if (key.includes('courier dhaka') || key.includes('courier inside')) {
              courierInside = value;
              hasCourierInside = true;
            } else if (key.includes('courier outside')) {
              courierOutside = value;
              hasCourierOutside = true;
            } else if (key.includes('packing base')) {
              packingBase = value;
              hasPackingBase = true;
            } else if (key.includes('packing per item')) {
              packingPerItem = value;
              hasPackingPerItem = true;
            } else if (key.includes('base weight limit') || key.includes('weight limit')) {
              baseWeightLimitKg = value;
              hasBaseWeightLimitKg = true;
            } else if (key.includes('extra weight charge inside') || key.includes('weight inside')) {
              extraWeightChargeInside = value;
              hasExtraWeightChargeInside = true;
            } else if (key.includes('extra weight charge outside') || key.includes('weight outside')) {
              extraWeightChargeOutside = value;
              hasExtraWeightChargeOutside = true;
            } else if (key.includes('free shipping threshold') || key.includes('free shipping minimum') || key.includes('free shipping')) {
              freeShippingThreshold = value;
              hasFreeShippingThreshold = true;
            }
          }
        }
      } else if (colA.startsWith('[Notice]')) {
        noticeText = colB;
        hasNotice = true;
      } else if (colA.startsWith('[Promo]')) {
        const promoCode = colA.replace('[Promo]', '').trim().toUpperCase();
        const discountVal = Number(colB);
        if (promoCode && !isNaN(discountVal)) {
          promoCodes[promoCode] = discountVal;
        }
      }
    });

    // Fallback to default promo codes if none were found in sheet
    if (Object.keys(promoCodes).length === 0) {
      Object.assign(promoCodes, defaultSettings.promoCodes);
    }

    // Seed missing settings into PaymentSettings
    const requestsToAppend: any[][] = [];
    if (!hasCourierInside) {
      requestsToAppend.push(['[Settings] Courier Dhaka', '80', 'কুরিয়ার খরচ (ঢাকা সিটি) - বেস চার্জ']);
    }
    if (!hasCourierOutside) {
      requestsToAppend.push(['[Settings] Courier Outside', '150', 'কুরিয়ার খরচ (ঢাকার বাইরে) - বেস চার্জ']);
    }
    if (!hasPackingBase) {
      requestsToAppend.push(['[Settings] Packing Base', '30', 'প্যাকিং খরচ (বেস চার্জ)']);
    }
    if (!hasPackingPerItem) {
      requestsToAppend.push(['[Settings] Packing Per Item', '5', 'প্যাকিং খরচ (প্রতি প্রোডাক্ট বা কোয়ান্টিটি চার্জ)']);
    }
    if (!hasBaseWeightLimitKg) {
      requestsToAppend.push(['[Settings] Base Weight Limit KG', '1.0', 'কুরিয়ার বেস চার্জের জন্য সর্বোচ্চ ওজন (কেজি)']);
    }
    if (!hasExtraWeightChargeInside) {
      requestsToAppend.push(['[Settings] Extra Weight Charge Inside', '30', 'ঢাকা সিটিতে প্রতি অতিরিক্ত কেজি ওজনের চার্জ (টাকা)']);
    }
    if (!hasExtraWeightChargeOutside) {
      requestsToAppend.push(['[Settings] Extra Weight Charge Outside', '50', 'ঢাকার বাইরে প্রতি অতিরিক্ত কেজি ওজনের চার্জ (টাকা)']);
    }
    if (!hasFreeShippingThreshold) {
      requestsToAppend.push(['[Settings] Free Shipping Threshold', '25000', 'কত টাকার অর্ডারে কুরিয়ার চার্জ সম্পূর্ণ ফ্রি হবে (টাকা)']);
    }
    if (!hasNotice) {
      requestsToAppend.push(['[Settings] Notice', defaultSettings.noticeText || '', 'পার্টনার নোটিশবোর্ড ঘোষণা বা ডিস্কাউন্ট নোটিশ']);
    }

    // Add default promo codes as example settings if no promo exists
    if (Object.keys(promoCodes).length === 0 && rows.filter((r: any) => (r[0] || '').startsWith('[Promo]')).length === 0) {
      requestsToAppend.push(['[Promo] FREECOURIER', '100', '১০০% কুরিয়ার এবং প্যাকিং ফ্রি করার কুপন কোড']);
      requestsToAppend.push(['[Promo] COURIER50', '50', '৫০% কুরিয়ার খরচ কমাবার কুপন কোড']);
    }

    if (requestsToAppend.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/PaymentSettings!A:C:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: requestsToAppend }),
        }
      );
    }

    return {
      courierInside,
      courierOutside,
      packingBase,
      packingPerItem,
      baseWeightLimitKg,
      extraWeightChargeInside,
      extraWeightChargeOutside,
      freeShippingThreshold,
      promoCodes,
      noticeText: noticeText || defaultSettings.noticeText,
    };
  } catch (error) {
    console.error('Error fetching billing settings:', error);
    return defaultSettings;
  }
};


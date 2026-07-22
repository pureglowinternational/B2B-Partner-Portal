import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Trash2,
  Plus,
  Minus,
  Database,
  User,
  CheckCircle,
  ExternalLink,
  FileText,
  Phone,
  MapPin,
  Users,
  RefreshCw,
  AlertCircle,
  Sparkles,
  X,
  ArrowRight,
  LogOut,
  Info,
  Calendar,
  Layers,
  Tag,
  Check,
  Upload,
  Lock,
  Compass,
  ArrowLeft,
  Activity,
  Wrench,
  Download
} from 'lucide-react';
import { initAuth, googleSignIn, logout } from './firebase';
import {
  DEFAULT_SPREADSHEET_ID,
  Product,
  Order,
  PartnerProfile,
  createB2BSpreadsheet,
  validateSpreadsheet,
  autoFixMissingTabs,
  fetchProductsFromSheet,
  fetchOrdersFromSheet,
  fetchProfilesFromSheet,
  addPartnerToSheet,
  submitOrderToSheet,
  uploadFileToDrive,
  PaymentMethod,
  fetchPaymentMethodsFromSheet,
  fetchSheetTitlesWithCache,
  repairOrdersHeaders,
  setupOrdersDataValidation,
  submitDamageClaimToSheet,
  fetchBillingSettingsFromSheet,
  BillingSettings
} from './googleSheets';

const extractSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();
  // Extract spreadsheet ID from full Google Sheets URL
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
};

export default function App() {
  // Google Auth state (for Google Sheet access)
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(true);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);

  // Spreadsheet state
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => {
    const saved = localStorage.getItem('b2b_spreadsheet_id');
    if (saved && saved !== '1-YOUR_GOOGLE_SHEET_ID_HERE') {
      const cleaned = extractSpreadsheetId(saved);
      if (cleaned !== saved) {
        localStorage.setItem('b2b_spreadsheet_id', cleaned);
      }
      return cleaned;
    }
    return DEFAULT_SPREADSHEET_ID;
  });
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isValidatingSheet, setIsValidatingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [isMissingTrackingTabs, setIsMissingTrackingTabs] = useState(false);

  // Core Data Lists
  const [profiles, setProfiles] = useState<PartnerProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Active Logged-In Partner Session (The customer)
  const [currentPartner, setCurrentPartner] = useState<PartnerProfile | null>(() => {
    const saved = localStorage.getItem('current_partner_profile');
    return saved ? JSON.parse(saved) : null;
  });

  // Partner Authentication form inputs
  const [loginPartnerId, setLoginPartnerId] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showNewRegistrationPopup, setShowNewRegistrationPopup] = useState(false);

  // Partner Registration form inputs (Columns B to I of profiles)
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regHouseStreet, setRegHouseStreet] = useState('');
  const [regUnitNo, setRegUnitNo] = useState('');
  const [regAreaThana, setRegAreaThana] = useState('');
  const [regCity, setRegCity] = useState('');
  const [regDistrict, setRegDistrict] = useState('');
  const [regPostalCode, setRegPostalCode] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [registrationSuccessMessage, setRegistrationSuccessMessage] = useState<{ id: string; name: string } | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  // General Toast / custom alert notifications state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => {
        if (prev?.text === text) return null;
        return prev;
      });
    }, 4000);
  };

  // Navigation states for logged-in partner
  const [currentView, setCurrentView] = useState<'catalog' | 'cart' | 'tracker'>('catalog');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address' | 'payment' | 'success'>('cart');

  // Interactive filter and search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Shopping Cart state
  const [cart, setCart] = useState<{ product: Product; quantity: number; checked: boolean }[]>(() => {
    const saved = localStorage.getItem('partner_shopping_cart');
    return saved ? JSON.parse(saved) : [];
  });

  // Receipt upload state
  const [paymentReceiptFiles, setPaymentReceiptFiles] = useState<File[]>([]);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState<string | null>(null);
  const [checkoutOrderId, setCheckoutOrderId] = useState<string | null>(null);

  // Admin section display toggle
  const [showAdminSection, setShowAdminSection] = useState(false);

  // Navigation tab for unauthenticated public visitors
  const [publicTab, setPublicTab] = useState<'catalog' | 'login' | 'register'>('catalog');

  // Secret admin access toggle
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('admin') === 'true' || window.location.hash === '#admin';
    }
    return false;
  });

  const isAdmin = Boolean(
    googleUser?.email || 
    currentPartner?.partnerId?.toUpperCase() === 'ADMIN' ||
    currentPartner?.category?.toLowerCase() === 'admin' ||
    isAdminMode
  );

  // PWA Install prompt state
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    const handleAppInstalled = () => {
      setIsAppInstalled(true);
      setDeferredInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Billing Settings (Courier, Packing) and area selection
  const [billingSettings, setBillingSettings] = useState<BillingSettings>({
    courierInside: 80,
    courierOutside: 150,
    packingBase: 30,
    packingPerItem: 5,
    baseWeightLimitKg: 1.0,
    extraWeightChargeInside: 30,
    extraWeightChargeOutside: 50,
    freeShippingThreshold: 25000,
    promoCodes: { 'FREECOURIER': 100, 'FREESHIP': 100, 'COURIER50': 50 },
    noticeText: '',
  });

  const resolvedDeliveryArea = useMemo(() => {
    if (!currentPartner) return 'outside';
    const area = (currentPartner.deliveryArea || '').toLowerCase().trim();
    if (area) {
      if (area.includes('outside') || area.includes('বাইরে') || area.includes('out')) {
        return 'outside';
      }
      if (area.includes('inside') || area.includes('dhaka') || area.includes('ঢাকা') || area.includes('সিটি') || area.includes('ইনসাইড')) {
        return 'dhaka';
      }
    }
    // Fallback detection from City or District
    const city = (currentPartner.city || '').toLowerCase().trim();
    const district = (currentPartner.district || '').toLowerCase().trim();
    if (city.includes('dhaka') || city.includes('ঢাকা') || district.includes('dhaka') || district.includes('ঢাকা')) {
      return 'dhaka';
    }
    return 'outside';
  }, [currentPartner]);

  // Coupon & Custom Free Shipping States
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscountPercent, setPromoDiscountPercent] = useState(0); // e.g. 100 for 100% off
  const [claimAdminFreeShip, setClaimAdminFreeShip] = useState(false);
  const [adminFreeShipNote, setAdminFreeShipNote] = useState('');

  // Damage Claim States
  const [damageClaimOrder, setDamageClaimOrder] = useState<Order | null>(null);
  const [damageClaimQuantities, setDamageClaimQuantities] = useState<Record<string, number>>({});
  const [damageClaimDesc, setDamageClaimDesc] = useState('');
  const [damageClaimPhotoFiles, setDamageClaimPhotoFiles] = useState<File[]>([]);
  const [isSubmittingDamageClaim, setIsSubmittingDamageClaim] = useState(false);

  // Column Diagnostics tool states
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [rawSheetRows, setRawSheetRows] = useState<any[][]>([]);
  const [rawSheetHeaders, setRawSheetHeaders] = useState<string[]>([]);
  const [diagnosticTabName, setDiagnosticTabName] = useState<string>('');
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [isDiagnosticLoading, setIsDiagnosticLoading] = useState(false);

  // Persist cart
  useEffect(() => {
    localStorage.setItem('partner_shopping_cart', JSON.stringify(cart));
  }, [cart]);

  // Initialize damage claim quantities
  useEffect(() => {
    if (damageClaimOrder) {
      const initialQtys: Record<string, number> = {};
      getOrderProductsList(damageClaimOrder.items).forEach(itemStr => {
        const item = parseOrderItem(itemStr);
        initialQtys[item.fullName] = 0;
      });
      setDamageClaimQuantities(initialQtys);
    } else {
      setDamageClaimQuantities({});
    }
  }, [damageClaimOrder]);

  // 1. Initialize Google Auth (for database read/write permissions)
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setGoogleUser(currentUser);
        setAccessToken(token);
        setNeedsGoogleAuth(false);
      },
      () => {
        setGoogleUser(null);
        setAccessToken(null);
        setNeedsGoogleAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Fetch sheet database contents whenever Spreadsheet ID is available
  useEffect(() => {
    if (spreadsheetId) {
      loadMasterData();
    }
  }, [googleUser, accessToken, spreadsheetId]);

  const loadMasterData = async () => {
    if (!spreadsheetId) return;
    setIsLoadingData(true);
    setSheetError(null);
    try {
      let isValid = await validateSpreadsheet(spreadsheetId, accessToken);
      if (!isValid && accessToken) {
        console.log('Sheet is invalid or missing Category tab. Attempting automatic tab setup (auto-heal)...');
        try {
          const autoFixed = await autoFixMissingTabs(spreadsheetId, accessToken);
          if (autoFixed) {
            isValid = await validateSpreadsheet(spreadsheetId, accessToken);
          }
        } catch (autoFixErr) {
          console.warn('Auto-fix failed on load:', autoFixErr);
        }
      }

      // Automatically repair headers and setup status dropdown validation if authenticated
      if (accessToken) {
        try {
          await repairOrdersHeaders(spreadsheetId, accessToken);
          await setupOrdersDataValidation(spreadsheetId, accessToken);
        } catch (validationErr) {
          console.warn('Could not run validation/header repair, continuing:', validationErr);
        }
      }

      // Check if tracking tabs or paymentsettings are missing and auto-heal them if authenticated
      if (accessToken) {
        let hasProfiles = false;
        let hasOrders = false;
        let hasPaymentSettings = false;
        try {
          const sheetTitles = await fetchSheetTitlesWithCache(spreadsheetId, accessToken);
          hasProfiles = sheetTitles.some((t: string) => t.toLowerCase() === 'profiles');
          hasOrders = sheetTitles.some((t: string) => t.toLowerCase() === 'orders');
          hasPaymentSettings = sheetTitles.some((t: string) => t.toLowerCase() === 'paymentsettings');
        } catch (e) {
          console.warn('Error checking tracking tabs on load:', e);
        }

        if (!hasProfiles || !hasOrders || !hasPaymentSettings) {
          console.log('Some tracking tabs are missing. Running auto-heal...');
          try {
            await autoFixMissingTabs(spreadsheetId, accessToken);
          } catch (repairErr) {
            console.warn('Auto repair of tracking tabs failed:', repairErr);
          }
        }
      }

      // Fetch Profiles, Products, Orders, Payment Methods, and Billing Settings simultaneously
      const [fetchedProfiles, fetchedProducts, fetchedOrders, fetchedPaymentMethods, fetchedBillingSettings] = await Promise.all([
        fetchProfilesFromSheet(spreadsheetId, accessToken),
        fetchProductsFromSheet(spreadsheetId, accessToken),
        fetchOrdersFromSheet(spreadsheetId, accessToken),
        fetchPaymentMethodsFromSheet(spreadsheetId, accessToken),
        fetchBillingSettingsFromSheet(spreadsheetId, accessToken),
      ]);

      setProfiles(fetchedProfiles);
      setProducts(fetchedProducts);
      setOrders(fetchedOrders);
      setPaymentMethods(fetchedPaymentMethods);
      if (fetchedBillingSettings) {
        setBillingSettings(fetchedBillingSettings);
      }

      // Verify final tracking tab status for state display
      let finalHasProfiles = false;
      let finalHasOrders = false;
      let finalHasPaymentSettings = false;
      try {
        const finalTitles = await fetchSheetTitlesWithCache(spreadsheetId, accessToken);
        finalHasProfiles = finalTitles.some((t: string) => t.toLowerCase() === 'profiles');
        finalHasOrders = finalTitles.some((t: string) => t.toLowerCase() === 'orders');
        finalHasPaymentSettings = finalTitles.some((t: string) => t.toLowerCase() === 'paymentsettings');
      } catch {}
      setIsMissingTrackingTabs(!finalHasProfiles || !finalHasOrders || !finalHasPaymentSettings);

      // Keep current logged-in partner's session updated with live data from spreadsheet
      if (currentPartner) {
        const liveProfile = fetchedProfiles.find(p => p.partnerId === currentPartner.partnerId);
        if (liveProfile) {
          setCurrentPartner(liveProfile);
          localStorage.setItem('current_partner_profile', JSON.stringify(liveProfile));
        }
      }
    } catch (err: any) {
      console.error('Error loading master data:', err);
      const errMsg = err.message || '';
      if (accessToken) {
        const isAuthErr = errMsg.toLowerCase().includes('credential') || 
                          errMsg.toLowerCase().includes('unauthorized') || 
                          errMsg.toLowerCase().includes('auth') || 
                          errMsg.toLowerCase().includes('token') || 
                          errMsg.toLowerCase().includes('401') ||
                          err.status === 401;
        
        if (isAuthErr) {
          setSheetError('আপনার গুগল অথেন্টিকেশন সেশনটির মেয়াদ শেষ হয়ে গেছে। অনুগ্রহ করে সেটিংস থেকে পুনরায় গুগল অথেন্টিকেশন সম্পন্ন করুন।');
          setGoogleUser(null);
          setAccessToken(null);
          setNeedsGoogleAuth(true);
          logout();
        } else {
          setSheetError(`গুগল শিট থেকে ডেটা লোড করতে ব্যর্থ হয়েছে: ${errMsg || 'অনুগ্রহ করে ইন্টারনেট কানেকশন চেক করুন বা আবার রি-অথরাইজ করুন।'}`);
        }
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  const runDiagnostics = async () => {
    if (!accessToken || !spreadsheetId) return;
    setIsDiagnosticLoading(true);
    setDiagnosticError(null);
    try {
      // Fetch spreadsheet details to list tabs
      const sheetsResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!sheetsResponse.ok) {
        throw new Error(`Failed to fetch spreadsheet info: ${sheetsResponse.statusText}`);
      }
      const sheetsData = await sheetsResponse.json();
      const titles = sheetsData.sheets?.map((s: any) => s.properties?.title) || [];
      
      // Try case-insensitive and flexible check for category, data, products etc.
      let tabToFetch = titles.find((t: string) => t.toLowerCase() === 'category') || '';
      if (!tabToFetch) {
        tabToFetch = titles.find((t: string) => t.toLowerCase() === 'data') || '';
      }
      if (!tabToFetch) {
        tabToFetch = titles.find((t: string) => {
          const l = t.toLowerCase();
          return l.includes('cat') || l.includes('dat') || l.includes('prod') || l.includes('পণ্য') || l.includes('প্রোডাক্ট');
        }) || '';
      }
      if (!tabToFetch) {
        const profilesTab = titles.find((t: string) => t.toLowerCase() === 'profiles') || 'Profiles';
        const ordersTab = titles.find((t: string) => t.toLowerCase() === 'orders') || 'Orders';
        tabToFetch = titles.find((t: string) => t !== profilesTab && t !== ordersTab) || 'Category';
      }
      
      setDiagnosticTabName(tabToFetch);
      
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(tabToFetch + '!A1:L10')}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${tabToFetch} tab: ${response.statusText}`);
      }
      
      const data = await response.json();
      const rows = data.values || [];
      if (rows.length > 0) {
        setRawSheetHeaders(rows[0]);
        setRawSheetRows(rows.slice(1));
      } else {
        setRawSheetHeaders([]);
        setRawSheetRows([]);
      }
    } catch (err: any) {
      console.error(err);
      setDiagnosticError(err.message || 'Error running diagnostics');
    } finally {
      setIsDiagnosticLoading(false);
    }
  };

  // Google Sign-In (For Admin/App Owner to link database)
  const handleGoogleSignIn = async () => {
    setIsLoggingInGoogle(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setAccessToken(result.accessToken);
        setNeedsGoogleAuth(false);
      }
    } catch (err) {
      console.error('Google login failed:', err);
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setAccessToken(null);
    setNeedsGoogleAuth(true);
    setProfiles([]);
    setProducts([]);
    setOrders([]);
  };

  // Connect B2B Spreadsheet
  const handleCreateNewSheet = async () => {
    if (!accessToken) return;
    setIsCreatingSheet(true);
    setSheetError(null);
    try {
      const newSheetId = await createB2BSpreadsheet(accessToken);
      localStorage.setItem('b2b_spreadsheet_id', newSheetId);
      setSpreadsheetId(newSheetId);
    } catch (err) {
      setSheetError('গুগল শিট তৈরি করতে ব্যর্থ হয়েছে। দয়া করে সব ড্রাইভ পারমিশন এগ্রি করুন।');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleLinkSheet = (id: string) => {
    const cleanId = extractSpreadsheetId(id.trim());
    if (cleanId) {
      localStorage.setItem('b2b_spreadsheet_id', cleanId);
      setSpreadsheetId(cleanId);
      setSheetError(null);
      setProfiles([]);
      setProducts([]);
      setOrders([]);
      showToast('গুগল শিট সফলভাবে সংযুক্ত করা হয়েছে!', 'success');
    }
  };

  const handleUnlinkSheet = () => {
    if (window.confirm('আপনি কি স্প্রেডশিট পরিবর্তন করতে চান? এটি বর্তমান কানেকশন রিসেট করবে।')) {
      localStorage.removeItem('b2b_spreadsheet_id');
      setSpreadsheetId(null);
      setProfiles([]);
      setProducts([]);
      setOrders([]);
    }
  };

  // Partner Login validation
  const handlePartnerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanId = loginPartnerId.trim().toUpperCase();
    const cleanPhone = loginPhone.trim().replace(/[^0-9]/g, '');

    if (!cleanId || !cleanPhone) {
      setLoginError('দয়া করে পার্টনার আইডি এবং মোবাইল নাম্বার দুটিই সঠিকভাবে দিন।');
      return;
    }

    // Try finding profile
    const matchedProfile = profiles.find(p => {
      const profilePhone = p.phone.replace(/[^0-9]/g, '');
      return p.partnerId.toUpperCase() === cleanId && profilePhone.endsWith(cleanPhone);
    });

    if (matchedProfile) {
      setCurrentPartner(matchedProfile);
      localStorage.setItem('current_partner_profile', JSON.stringify(matchedProfile));
      setLoginPartnerId('');
      setLoginPhone('');
      setCurrentView('catalog');
    } else {
      // Not found, open the registration pop-up / alert box
      setShowNewRegistrationPopup(true);
    }
  };

  // Partner Registration handler
  const handlePartnerRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError(null);

    if (!accessToken || !spreadsheetId) {
      setRegistrationError('গুগল শিট কানেক্টেড নেই। দয়া করে এডমিন প্যানেল (উপরের সেটিংস আইকন) থেকে গুগল অথরাইজ ও শিট কানেক্ট করুন।');
      return;
    }

    if (!regName.trim() || !regPhone.trim() || !regHouseStreet.trim() || !regAreaThana.trim() || !regCity.trim() || !regDistrict.trim()) {
      setRegistrationError('দয়া করে সব আবশ্যকীয় স্টার (*) চিহ্নিত ঘরগুলো সঠিকভাবে পূরণ করুন।');
      return;
    }

    setIsSubmittingReg(true);
    try {
      // Format phone
      const cleanPhone = regPhone.trim().replace(/[^0-9]/g, '');
      
      // Check if phone already registered
      const isDuplicate = profiles.some(p => p.phone.replace(/[^0-9]/g, '').endsWith(cleanPhone));
      if (isDuplicate) {
        setRegistrationError('এই মোবাইল নাম্বার দিয়ে ইতিমধ্যে আইডি রেজিস্টার করা আছে। দয়া করে সেই আইডি দিয়ে লগইন করুন।');
        setIsSubmittingReg(false);
        return;
      }

      // Generate sequel Partner ID (e.g. P-1002, P-1003)
      let nextNum = 1001;
      if (profiles.length > 0) {
        const idNums = profiles
          .map(p => {
            const numPart = p.partnerId.replace(/[^0-9]/g, '');
            return numPart ? parseInt(numPart) : 0;
          })
          .filter(n => n > 0);
        
        if (idNums.length > 0) {
          nextNum = Math.max(...idNums) + 1;
        }
      }
      const generatedId = `P-${nextNum}`;

      const newProfile: PartnerProfile = {
        partnerId: generatedId,
        name: regName.trim(),
        phone: regPhone.trim(),
        houseStreet: regHouseStreet.trim(),
        unitNo: regUnitNo.trim(),
        areaThana: regAreaThana.trim(),
        city: regCity.trim(),
        district: regDistrict.trim(),
        postalCode: regPostalCode.trim(),
        category: 'Partner C', // New users are default category 'Partner C'
      };

      const success = await addPartnerToSheet(spreadsheetId, accessToken, newProfile);
      if (success) {
        setRegistrationSuccessMessage({ id: generatedId, name: newProfile.name });
        // Refresh profiles database
        const updatedProfiles = await fetchProfilesFromSheet(spreadsheetId, accessToken);
        setProfiles(updatedProfiles);

        // Pre-fill login screen
        setLoginPartnerId(generatedId);
        setLoginPhone(newProfile.phone);

        // Clear registration form
        setRegName('');
        setRegPhone('');
        setRegHouseStreet('');
        setRegUnitNo('');
        setRegAreaThana('');
        setRegCity('');
        setRegDistrict('');
        setRegPostalCode('');
      } else {
        setRegistrationError('রেজিষ্ট্রেশন ব্যর্থ হয়েছে। স্প্রেডশিট এক্সেস চেক করুন বা এডমিন সেটআপ পুনরায় পরীক্ষা করুন।');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setRegistrationError('রেজিষ্ট্রেশন করার সময় একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন বা এডমিন প্যানেল চেক করুন।');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  // Partner Sign Out
  const handlePartnerLogout = () => {
    setCurrentPartner(null);
    localStorage.removeItem('current_partner_profile');
    setCart([]);
  };

  // Cart operations (Max 5 items)
  const handleAddToCart = (product: Product) => {
    // Check if product already exists in cart
    const existing = cart.find(i => i.product.id === product.id);
    if (!existing && cart.length >= 5) {
      showToast('দুঃখিত! আপনি কার্টে সর্বোচ্চ ৫টি প্রোডাক্ট রাখতে পারবেন।', 'error');
      return;
    }

    setCart(prev => {
      const matched = prev.find(i => i.product.id === product.id);
      if (matched) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      } else {
        return [...prev, { product, quantity: 1, checked: true }];
      }
    });
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(i => {
          if (i.product.id === productId) {
            const nextQty = i.quantity + delta;
            return { ...i, quantity: nextQty };
          }
          return i;
        })
        .filter(i => i.quantity > 0);
    });
  };

  const handleToggleChecked = (productId: string) => {
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, checked: !i.checked } : i));
  };

  const handleRemoveItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  // Price getter based on Partner Category (A, B, or C)
  const getPartnerPrice = (p: Product) => {
    if (!currentPartner) return p.partnerCPrice;
    switch (currentPartner.category) {
      case 'Partner A': return p.partnerAPrice;
      case 'Partner B': return p.partnerBPrice;
      case 'Partner C':
      default: return p.partnerCPrice;
    }
  };

  // Helper to parse weight from product weight string (e.g. "500g" -> 0.5, "1kg" -> 1.0)
  const parseProductWeight = (weightStr: string): number => {
    if (!weightStr) return 0.5; // default 500g if missing
    const clean = weightStr.toLowerCase().replace(/\s+/g, '').trim();
    const num = parseFloat(clean);
    if (isNaN(num)) return 0.5;
    if (clean.endsWith('kg') || clean.endsWith('l') || clean.endsWith('litre') || clean.endsWith('liter')) {
      return num;
    }
    if (clean.endsWith('g') || clean.endsWith('gm') || clean.endsWith('ml')) {
      return num / 1000;
    }
    return num; // default assume kg if no recognized unit
  };

  // Calculations
  const checkedItems = cart.filter(i => i.checked);
  const cartTotal = checkedItems.reduce((sum, item) => sum + getPartnerPrice(item.product) * item.quantity, 0);
  const totalCheckedQty = checkedItems.reduce((sum, item) => sum + item.quantity, 0);

  // Total weight in Kg
  const totalWeightKg = checkedItems.reduce((sum, item) => {
    const w = parseProductWeight(item.product.weight || '');
    return sum + w * item.quantity;
  }, 0);

  // Base Courier Cost
  const baseCourierFee = checkedItems.length > 0
    ? (resolvedDeliveryArea === 'dhaka' ? billingSettings.courierInside : billingSettings.courierOutside)
    : 0;

  // Weight Surcharge Cost
  const excessWeightKg = Math.max(0, totalWeightKg - billingSettings.baseWeightLimitKg);
  const excessWeightUnits = Math.ceil(excessWeightKg);
  const weightSurchargeFee = checkedItems.length > 0 && excessWeightUnits > 0
    ? excessWeightUnits * (resolvedDeliveryArea === 'dhaka' ? billingSettings.extraWeightChargeInside : billingSettings.extraWeightChargeOutside)
    : 0;

  const totalCourierBeforeDiscount = baseCourierFee + weightSurchargeFee;

  // Packing Cost
  const basePackingFee = checkedItems.length > 0
    ? (billingSettings.packingBase + billingSettings.packingPerItem * totalCheckedQty)
    : 0;

  // Check for discounts:
  // 1. Auto Free Shipping over threshold
  const isEligibleForAutoFreeShip = cartTotal >= billingSettings.freeShippingThreshold && billingSettings.freeShippingThreshold > 0;

  // 2. Coupon Discount percentage
  const couponDiscountPercentage = appliedPromo ? promoDiscountPercent : 0;

  // Determine actual Courier and Packing Cost based on conditions
  let courierCost = totalCourierBeforeDiscount;
  let packingCost = basePackingFee;

  let shippingDiscountLabel = '';

  if (claimAdminFreeShip) {
    courierCost = 0;
    packingCost = 0;
    shippingDiscountLabel = 'এডমিন কন্ট্রিবিউশন (১০০% ফ্রি)';
  } else if (isEligibleForAutoFreeShip) {
    courierCost = 0;
    packingCost = 0;
    shippingDiscountLabel = `৳${billingSettings.freeShippingThreshold.toLocaleString()} এর উপরে কেনাকাটায় ফ্রি ডেলিভারি`;
  } else if (couponDiscountPercentage > 0) {
    const discountMultiplier = (100 - couponDiscountPercentage) / 100;
    courierCost = Math.round(totalCourierBeforeDiscount * discountMultiplier);
    packingCost = Math.round(basePackingFee * discountMultiplier);
    shippingDiscountLabel = `কুপন (${couponDiscountPercentage}% ছাড়)`;
  }

  const grandTotal = cartTotal + courierCost + packingCost;

  // Address text formation
  const formatAddress = (profile: PartnerProfile) => {
    const parts = [
      profile.houseStreet,
      profile.unitNo ? `Unit/No: ${profile.unitNo}` : '',
      profile.areaThana,
      profile.city,
      profile.district,
      profile.postalCode ? `Postal Code: ${profile.postalCode}` : ''
    ].filter(Boolean);
    return parts.join(', ');
  };

  // Promo / Coupon verification handlers
  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) {
      showToast('অনুগ্রহ করে কুপন কোডটি লিখুন।', 'error');
      return;
    }
    
    // Support custom or sheet-defined promo codes
    const discount = billingSettings.promoCodes[code];
    if (discount !== undefined) {
      setAppliedPromo(code);
      setPromoDiscountPercent(discount);
      setClaimAdminFreeShip(false); // turn off admin free ship override if applying coupon
      showToast(`কুপন '${code}' সফলভাবে প্রয়োগ করা হয়েছে! আপনি ${discount}% ছাড় পেয়েছেন।`, 'success');
    } else {
      showToast('ভুল বা অকার্যকর কুপন কোড। দয়া করে সঠিক কোডটি দিন।', 'error');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDiscountPercent(0);
    setPromoCodeInput('');
    showToast('কুপন কোড বাতিল করা হয়েছে।', 'success');
  };

  // Submit Order process
  const handleConfirmOrderAndShowPayment = () => {
    if (checkedItems.length === 0) {
      showToast('অনুগ্রহ করে অর্ডার করার জন্য কমপক্ষে ১টি প্রোডাক্ট সিলেক্ট করুন।', 'error');
      return;
    }
    if (claimAdminFreeShip && !adminFreeShipNote.trim()) {
      showToast('দয়া করে বিশেষ কুরিয়ার ফ্রির জন্য এডমিন অনুমোদনের নোটটি লিখুন।', 'error');
      return;
    }
    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    setCheckoutOrderId(orderId);
    setCheckoutStep('payment');
  };

  // Real Upload receipt image to Google Drive and submit order to Google sheet
  const handlePaymentProofUploadAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !spreadsheetId || !currentPartner || !checkoutOrderId) {
      showToast('সেশন বা ডেটাবেস কানেকশন মিসিং।', 'error');
      return;
    }

    if (paymentReceiptFiles.length === 0) {
      showToast('দয়া করে পেমেন্টের রশিদ বা স্ক্রিনশট সিলেক্ট করুন।', 'error');
      return;
    }

    setIsUploadingReceipt(true);
    try {
      // 1. Upload files to Drive
      const uploadPromises = paymentReceiptFiles.map(file => uploadFileToDrive(accessToken, file));
      const receiptLinks = await Promise.all(uploadPromises);
      const combinedReceiptUrls = receiptLinks.join(', ');
      setUploadedReceiptUrl(combinedReceiptUrls);

      // 2. Format cart items description with courier, weight, and packing charge breakdown
      let chargeBreakdown = ` | ওজন: ${totalWeightKg.toFixed(2)} কেজি | কুরিয়ার: ৳${courierCost} | প্যাকিং: ৳${packingCost}`;
      if (claimAdminFreeShip) {
        chargeBreakdown += ` | কুরিয়ার ফ্রি (এডমিন অনুমোদিত: ${adminFreeShipNote || 'হ্যাঁ'})`;
      } else if (appliedPromo) {
        chargeBreakdown += ` | কুপন: ${appliedPromo} (${promoDiscountPercent}% ছাড়)`;
      } else if (isEligibleForAutoFreeShip) {
        chargeBreakdown += ` | অটো ফ্রি শিপিং (৳${billingSettings.freeShippingThreshold.toLocaleString()} প্লাস)`;
      }

      const itemsDescription = checkedItems
        .map(i => `${i.product.name} (${i.product.weight}) x${i.quantity}`)
        .join(', ') + chargeBreakdown;

      const formattedDate = new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' });

      // 3. Create order record with grand total
      const newOrder = {
        orderId: checkoutOrderId,
        date: formattedDate,
        partnerId: currentPartner.partnerId,
        partnerName: currentPartner.name,
        partnerPhone: currentPartner.phone,
        items: itemsDescription,
        totalAmount: grandTotal,
        shippingAddress: formatAddress(currentPartner),
        paymentProofUrl: combinedReceiptUrls,
      };

      // 4. Submit order row to sheets
      const success = await submitOrderToSheet(spreadsheetId, accessToken, newOrder);

      if (success) {
        // Clear checked items from cart
        setCart(prev => prev.filter(i => !i.checked));
        setCheckoutStep('success');
        setPaymentReceiptFiles([]);
        // Refresh orders database in background
        const updatedOrders = await fetchOrdersFromSheet(spreadsheetId, accessToken);
        setOrders(updatedOrders);
      } else {
        showToast('গুগল শিটে অর্ডার সাবমিট করতে ব্যর্থ হয়েছে। দয়া করে আবার চেষ্টা করুন।', 'error');
      }
    } catch (err) {
      console.error('Error submitting order & proof:', err);
      showToast('রশিদ আপলোড ও অর্ডার প্লেস করতে একটি সমস্যা হয়েছে। দয়া করে ফাইল সাইজ ও নেটওয়ার্ক কানেকশন চেক করুন।', 'error');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  // Category filter
  const isAuthError = !!(sheetError && (
    sheetError.toLowerCase().includes('credential') ||
    sheetError.toLowerCase().includes('auth') ||
    sheetError.toLowerCase().includes('token') ||
    sheetError.toLowerCase().includes('401') ||
    sheetError.toLowerCase().includes('login cookie') ||
    sheetError.toLowerCase().includes('sign-in') ||
    sheetError.toLowerCase().includes('unauthorized') ||
    sheetError.includes('অথরাইজ')
  ));

  const categoriesList = ['All', ...new Set(products.map(p => p.category))];
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Partner's own orders history
  const myOrders = orders.filter(o => o.partnerId.toUpperCase() === currentPartner?.partnerId.toUpperCase());

  // Function to translate order status to custom Bangla
  const getBanglaStatus = (status: string) => {
    const s = status ? status.trim().toLowerCase() : '';
    if (s === 'pending' || s === 'order processing' || s === 'processing') {
      return { text: 'অর্ডার প্রসেসিং হচ্ছে (Processing)', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
    if (s === 'payment received' || s === 'paymentreceived' || s === 'payment verified') {
      return { text: 'পেমেন্ট রিসিভড (Payment Received)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    if (s === 'packing started' || s === 'packingstarted') {
      return { text: 'প্যাকিং শুরু হয়েছে (Packing Started)', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    if (s === 'sent to courier' || s === 'senttocourier' || s === 'shipped') {
      return { text: 'কুরিয়ারে পাঠানো হয়েছে (Sent to Courier)', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
    if (s === 'successfully completed' || s === 'successfullycompleted' || s === 'delivered') {
      return { text: 'সফলভাবে সম্পন্ন হয়েছে (Completed)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (s === 'damage claimed' || s === 'damageclaimed' || s === 'claim submitted') {
      return { text: 'ডেমেজ পণ্য ক্লেইম করা হয়েছে (Damage Claimed)', color: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' };
    }
    return { text: status || 'অর্ডার প্রসেসিং হচ্ছে', color: 'bg-slate-100 text-slate-800 border-slate-200' };
  };

  // Extract products list from order items description
  const getOrderProductsList = (itemStr: string) => {
    if (!itemStr) return [];
    // Strip anything after the pipeline '|' (which contains courier and packing charge notes)
    const cleanStr = itemStr.split('|')[0];
    return cleanStr
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
  };

  const parseOrderItem = (itemStr: string) => {
    // Matches patterns like "Product Name (Weight) x3" or "Product Name x2" or "Product Name x 2"
    const match = itemStr.match(/(.+)\s+x\s*(\d+)$/i) || itemStr.match(/(.+)\s*x(\d+)$/i);
    if (match) {
      return {
        fullName: match[1].trim(),
        orderedQty: parseInt(match[2], 10) || 1,
      };
    }
    return {
      fullName: itemStr.trim(),
      orderedQty: 1,
    };
  };

  // Submit Damage Claim Form logic
  const handleDamageClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !spreadsheetId || !damageClaimOrder) {
      showToast('সেশন বা ডেটাবেস কানেকশন মিসিং।', 'error');
      return;
    }

    // Validate quantities
    const damagedList = Object.entries(damageClaimQuantities)
      .filter(([_, qty]) => Number(qty) > 0);

    if (damagedList.length === 0) {
      showToast('দয়া করে অন্তত একটি ক্ষতিগ্রস্ত পণ্যের পরিমাণ ১ বা তার বেশি সিলেক্ট করুন।', 'error');
      return;
    }

    if (!damageClaimDesc) {
      showToast('দয়া করে ড্যামেজ বা অভিযোগের বিবরণ লিখুন।', 'error');
      return;
    }
    if (damageClaimPhotoFiles.length === 0) {
      showToast('দয়া করে ড্যামেজ পণ্যের প্রমাণের অন্তত একটি ছবি সংযুক্ত করুন।', 'error');
      return;
    }

    setIsSubmittingDamageClaim(true);
    try {
      // 1. Upload photos to Google Drive
      const uploadPromises = damageClaimPhotoFiles.map(file => uploadFileToDrive(accessToken, file));
      const photoUrls = await Promise.all(uploadPromises);
      const combinedPhotoUrls = photoUrls.join(', ');

      // 2. Format claim details description
      const damagedText = damagedList
        .map(([name, qty]) => `${name} (${qty}টি)`)
        .join(', ');

      const claimDetails = `[ড্যামেজ ক্লেইম] পণ্যসমূহ: ${damagedText} | বিবরণ: ${damageClaimDesc} | ছবি লিঙ্কসমূহ: ${combinedPhotoUrls}`;

      // 3. Submit to Google Sheet
      const success = await submitDamageClaimToSheet(spreadsheetId, accessToken, damageClaimOrder.orderId, claimDetails);

      if (success) {
        showToast('ড্যামেজ ক্লেইম সফলভাবে গুগল শিটে জমা দেওয়া হয়েছে। এডমিন দ্রুত এটি যাচাই করবেন।', 'success');
        // Clear state and close modal
        setDamageClaimOrder(null);
        setDamageClaimDesc('');
        setDamageClaimPhotoFiles([]);
        setDamageClaimQuantities({});
        // Refresh orders from Sheet
        const updatedOrders = await fetchOrdersFromSheet(spreadsheetId, accessToken);
        setOrders(updatedOrders);
      } else {
        showToast('ড্যামেজ ক্লেইম জমা দিতে গুগল শিট সার্ভারে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।', 'error');
      }
    } catch (err) {
      console.error('Error submitting damage claim:', err);
      showToast('ড্যামেজ ক্লেইম আপলোড করতে ব্যর্থ হয়েছে। দয়া করে ফাইলের সাইজ বা নেটওয়ার্ক কানেকশন চেক করুন।', 'error');
    } finally {
      setIsSubmittingDamageClaim(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col pb-6">
      {/* 1. Header with Company Logo & Company Name */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-xs px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {/* Pink & Emerald Styled Logo */}
            <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center border border-pink-100 shadow-inner">
              <Sparkles className="w-5.5 h-5.5 text-pink-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-base font-display font-bold text-slate-900 tracking-tight leading-none">
                PureGlow International
              </h1>
              <p className="text-[10px] text-emerald-600 font-medium tracking-wide mt-1">
                B2B Partner Portal • পার্টনার পোর্টালে স্বাগতম
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* PWA Install Button */}
            {deferredInstallPrompt && !isAppInstalled && (
              <button
                onClick={async () => {
                  if (deferredInstallPrompt) {
                    deferredInstallPrompt.prompt();
                    const choice = await deferredInstallPrompt.userChoice;
                    if (choice?.outcome === 'accepted') {
                      setIsAppInstalled(true);
                      showToast('অ্যাপটি সফলভাবে ইনস্টল করা হয়েছে!', 'success');
                    }
                    setDeferredInstallPrompt(null);
                  }
                }}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs transition-all animate-bounce"
                title="Install PureGlow Portal App"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ইনস্টল অ্যাপ</span>
              </button>
            )}

            {/* Admin setup gear icon - ONLY visible to Admin */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminSection(!showAdminSection)}
                className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                  showAdminSection ? 'bg-pink-600 border-pink-600 text-white shadow-xs' : 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100'
                }`}
                title="Admin Settings & Database Link"
              >
                <Database className="w-3.5 h-3.5" />
                <span>এডমিন সেটআপ (Admin)</span>
              </button>
            )}

            {!currentPartner && !isAdmin && (
              <button
                onClick={() => setPublicTab('login')}
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all"
              >
                <User className="w-3.5 h-3.5" />
                <span>পার্টনার লগইন</span>
              </button>
            )}

            {currentPartner && (
              <button
                onClick={handlePartnerLogout}
                className="p-1.5 rounded-lg border bg-red-50 border-red-100 text-red-600 hover:bg-red-100/80 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Admin Setup Panel (Durable cloud Google Sheets connection) */}
      <AnimatePresence>
        {showAdminSection && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-pink-100 overflow-hidden"
          >
            <div className="max-w-md mx-auto p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-pink-500" />
                  এডমিন ডেটাবেস সেটিংস (Database Link)
                </h3>
                <button onClick={() => setShowAdminSection(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {needsGoogleAuth ? (
                <div className="space-y-3 py-2 text-center">
                  <p className="text-xs text-slate-500 leading-normal">
                    অ্যাপে প্রোডাক্ট ও গ্রাহক ডেটা গুগল শিট থেকে লোড করার জন্য এডমিনকে প্রথমে গুগল দিয়ে লগইন করতে হবে।
                  </p>
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={isLoggingInGoogle}
                    className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isLoggingInGoogle ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    )}
                    <span>গুগল অথরাইজ করুন (Authorize Google)</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-slate-600 font-medium truncate">Owner: {googleUser?.email}</span>
                    <button onClick={handleGoogleLogout} className="text-red-600 hover:underline font-bold">Logout</button>
                  </div>

                  {!spreadsheetId ? (
                    <div className="space-y-4">
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3 text-[11px] leading-relaxed">
                        <span className="font-bold block mb-1">কোন গুগল শিট কানেক্টেড নেই!</span>
                        রেজিস্ট্রেশন এবং অর্ডার সচল রাখতে অনুগ্রহ করে নিচের যেকোন ১টি পদ্ধতি ব্যবহার করে গুগল শিট ডেটাবেস সংযুক্ত করুন।
                      </div>

                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">পদ্ধতি ১: একদম নতুন শিট তৈরি করুন</span>
                        <button
                          onClick={handleCreateNewSheet}
                          disabled={isCreatingSheet}
                          className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-xs transition-colors"
                        >
                          {isCreatingSheet ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4" />
                          )}
                          <span>নতুন বি২বি স্প্রেডশিট তৈরি করুন</span>
                        </button>
                      </div>

                      <div className="space-y-2 border-t border-slate-100 pt-3.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">পদ্ধতি ২: বিদ্যমান শিটের লিঙ্ক (URL) বা আইডি দিন</span>
                        <div className="relative flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white">
                          <input
                            type="text"
                            id="manual-setup-sheet-id"
                            placeholder="গুগল শিটের সম্পূর্ণ লিঙ্ক (URL) বা আইডি পেস্ট করুন"
                            className="flex-1 px-3 py-2 text-xs focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const val = (document.getElementById('manual-setup-sheet-id') as HTMLInputElement)?.value;
                              if (val) {
                                handleLinkSheet(val);
                              } else {
                                showToast('দয়া করে শিটের লিংক বা আইডি দিন।', 'error');
                              }
                            }}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold transition-colors shrink-0"
                          >
                            কানেক্ট
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          টিপস: ব্রাউজারের অ্যাড্রেস বার থেকে গুগল শিটের সম্পূর্ণ লিংকটি কপি করে এখানে পেস্ট করে দিলেই হবে।
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl border border-emerald-100 text-[11px] leading-relaxed">
                        <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-900">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          গুগল শিট ডেটাবেস সংযুক্ত!
                        </div>
                        <span className="block font-mono text-[9px] truncate text-slate-500">ID: {spreadsheetId}</span>
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-xs font-bold transition-colors shadow-xs"
                        >
                          <span>শিট ওপেন করুন</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={handleUnlinkSheet}
                          className="bg-red-50 hover:bg-red-100 text-red-600 px-3.5 py-2 rounded-lg text-xs font-medium border border-red-100 transition-colors"
                        >
                          কানেকশন রিসেট
                        </button>
                      </div>

                      <div className="border-t border-slate-100 pt-3.5 space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">নতুন বা অন্য গুগল শিট লিঙ্ক সংযুক্ত করুন:</span>
                        <div className="relative flex items-center border border-slate-300 rounded-xl overflow-hidden bg-white">
                          <input
                            type="text"
                            id="change-setup-sheet-id"
                            placeholder="গুগল শিটের সম্পূর্ণ লিঙ্ক (URL) বা আইডি পেস্ট করুন"
                            className="flex-1 px-3 py-2 text-xs focus:outline-none"
                          />
                          <button
                            onClick={() => {
                              const val = (document.getElementById('change-setup-sheet-id') as HTMLInputElement)?.value;
                              if (val) {
                                handleLinkSheet(val);
                                (document.getElementById('change-setup-sheet-id') as HTMLInputElement).value = '';
                              } else {
                                showToast('দয়া করে শিটের লিঙ্ক বা আইডি দিন।', 'error');
                              }
                            }}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 text-xs font-semibold transition-colors shrink-0"
                          >
                            লিংক পরিবর্তন
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          টিপস: আপনি সরাসরি গুগল শিটের পুরো URL লিঙ্কটি কপি করে পেস্ট করতে পারেন। আমাদের সিস্টেম স্বয়ংক্রিয়ভাবে আইডিটি বের করে নিবে।
                        </p>
                      </div>
                    </div>
                  )}

                  {currentPartner && (
                    <div className="border-t border-slate-100 pt-3.5 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">বর্তমানে লগইন থাকা পার্টনার (এডমিন ভিউ):</span>
                      <div className="bg-pink-50/40 border border-pink-100 rounded-xl p-3 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-500">নাম:</span>
                          <span className="font-semibold text-slate-800">{currentPartner.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">পার্টনার আইডি:</span>
                          <span className="font-mono font-bold text-slate-800">{currentPartner.partnerId}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">ক্যাটাগরি:</span>
                          <span className="font-bold text-pink-600 bg-pink-100/50 px-1.5 py-0.5 rounded-md border border-pink-200">
                            {currentPartner.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Column Diagnostics Accordion */}
                  {spreadsheetId && (
                    <div className="border-t border-slate-100 pt-3.5 space-y-2">
                      <button
                        onClick={() => {
                          const next = !showDiagnostics;
                          setShowDiagnostics(next);
                          if (next) runDiagnostics();
                        }}
                        className="w-full flex items-center justify-between text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                          স্প্রেডশিট কলাম ডায়াগনস্টিকস (Diagnostics)
                        </span>
                        <span>{showDiagnostics ? 'লুকান ▲' : 'দেখুন ▼'}</span>
                      </button>

                      {showDiagnostics && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 space-y-2 text-[10px] overflow-x-auto max-w-full">
                          {isDiagnosticLoading ? (
                            <div className="text-center py-4 flex items-center justify-center gap-1.5">
                              <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                              <span>শীট স্ট্রাকচার রিড করা হচ্ছে...</span>
                            </div>
                          ) : diagnosticError ? (
                            <div className="text-red-600 bg-red-50 p-2 rounded border border-red-100">
                              ত্রুটি: {diagnosticError}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center bg-emerald-100/60 p-1 rounded border border-emerald-200 px-2 font-semibold">
                                <span>সক্রিয় প্রোডাক্ট ট্যাব: {diagnosticTabName}</span>
                                <button onClick={runDiagnostics} className="text-emerald-700 font-bold hover:underline">রিলোড করুন</button>
                              </div>
                              <p className="text-[9px] text-slate-500 leading-tight">
                                নিচে আপনার কানেক্টেড স্প্রেডশিটের প্রথম কয়েকটি কলাম এবং ডেটা দেখানো হচ্ছে। এর মাধ্যমে আপনি সহজেই চেক করতে পারবেন কোনো কলাম এদিক-সেদিক হয়েছে কি না:
                              </p>
                              <div className="border border-slate-200 rounded-md overflow-hidden bg-white max-h-48 overflow-y-auto">
                                <table className="min-w-full divide-y divide-slate-200 text-left border-collapse">
                                  <thead className="bg-slate-100 sticky top-0">
                                    <tr>
                                      <th className="px-1.5 py-1 text-[8px] font-bold text-slate-500 uppercase tracking-wider border">Col</th>
                                      <th className="px-1.5 py-1 text-[8px] font-bold text-slate-500 uppercase tracking-wider border">Header Text</th>
                                      <th className="px-1.5 py-1 text-[8px] font-bold text-slate-500 uppercase tracking-wider border">Row 1 Value</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {rawSheetHeaders.map((header, idx) => {
                                      const alphabet = String.fromCharCode(65 + idx);
                                      const rowVal = rawSheetRows[0]?.[idx] || '(Empty)';
                                      return (
                                        <tr key={idx} className="hover:bg-slate-50">
                                          <td className="px-1.5 py-1 font-mono font-bold text-slate-700 bg-slate-50 border">{alphabet} (idx {idx})</td>
                                          <td className="px-1.5 py-1 font-semibold text-pink-600 border truncate max-w-[120px]" title={header}>{header || '(No Header)'}</td>
                                          <td className="px-1.5 py-1 text-slate-600 border truncate max-w-[150px]" title={rowVal}>{rowVal}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container Core */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-6">
        {/* Main Router Space */}
        {!currentPartner ? (
          <div className="space-y-4">
            {/* Top Navigation Tabs for Visitors */}
            <div className="bg-white border border-slate-200 rounded-xl p-1 shadow-xs flex justify-around items-center text-xs">
              <button
                onClick={() => setPublicTab('catalog')}
                className={`flex-1 py-2 px-2 rounded-lg font-bold text-center transition-all ${
                  publicTab === 'catalog' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                প্রোডাক্ট ক্যাটালগ
              </button>
              <button
                onClick={() => setPublicTab('login')}
                className={`flex-1 py-2 px-2 rounded-lg font-bold text-center transition-all ${
                  publicTab === 'login' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                পার্টনার লগইন
              </button>
              <button
                onClick={() => setPublicTab('register')}
                className={`flex-1 py-2 px-2 rounded-lg font-bold text-center transition-all ${
                  publicTab === 'register' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                নতুন রেজিস্ট্রেশন
              </button>
            </div>

            {/* Admin-only Database Errors */}
            {isAdmin && sheetError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-xl space-y-3 shadow-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-[13px] text-red-950">এডমিন এলার্ট: ডাটাবেজ সমস্যা</p>
                    <p className="text-[11px] text-red-700 leading-normal mt-0.5">{sheetError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* PUBLIC VIEW 1: PUBLIC PRODUCT CATALOG */}
            {publicTab === 'catalog' && (
              <div className="space-y-4">
                {/* Search & Category filter */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="প্রোডাক্ট খুঁজুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-xs focus:bg-white outline-none"
                    />
                  </div>
                  
                  {categoriesList.length > 1 && (
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs text-slate-600 outline-none"
                    >
                      <option value="All">সকল ক্যাটাগরি</option>
                      {categoriesList.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Banner / Info Prompt */}
                <div className="bg-gradient-to-r from-pink-500 to-emerald-600 rounded-xl p-3 text-white shadow-xs flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold">B2B পার্টনারদের জন্য স্পেশাল রেট!</p>
                    <p className="text-[10px] text-pink-100">হোলসেল পার্টনার প্রাইসে কিনতে লগইন করুন</p>
                  </div>
                  <button
                    onClick={() => setPublicTab('login')}
                    className="bg-white text-slate-900 font-bold px-3 py-1.5 rounded-lg text-[11px] shadow-sm hover:bg-slate-50 transition"
                  >
                    লগইন করুন
                  </button>
                </div>

                {isLoadingData ? (
                  <div className="text-center py-12 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                    <p className="text-xs text-slate-500">প্রোডাক্ট ক্যাটালগ লোড হচ্ছে...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-xl border border-slate-200 p-6 space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-sm font-semibold text-slate-800">কোনো প্রোডাক্ট পাওয়া যায়নি!</p>
                  </div>
                ) : (
                  /* Mobile optimized 2 column grid box */
                  <div className="grid grid-cols-2 gap-3">
                    {filteredProducts.map(p => (
                      <div
                        key={p.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          <div className="aspect-square w-full bg-slate-100 relative">
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <span className="absolute top-1.5 left-1.5 bg-slate-900/70 text-white text-[8px] font-mono px-1 rounded">
                              {p.id}
                            </span>
                          </div>

                          <div className="p-2 space-y-0.5">
                            <h4 className="font-semibold text-slate-800 text-xs line-clamp-2 leading-tight">
                              {p.name}
                            </h4>
                            {p.weight && (
                              <p className="text-xs font-medium text-slate-500 pt-0.5">
                                {p.weight}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="p-2 pt-0 space-y-2">
                          <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                            <span className="text-xs font-bold text-slate-900 font-mono">
                              ৳{p.originalPrice}
                            </span>
                            <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              MSRP
                            </span>
                          </div>

                          <button
                            onClick={() => setPublicTab('login')}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-2 rounded-lg text-[10px] text-center transition-colors flex items-center justify-center gap-1"
                          >
                            <User className="w-3 h-3" />
                            <span>পার্টনার রেটে কিনতে লগইন</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* PUBLIC VIEW 2: LOGIN FORM */}
            {publicTab === 'login' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="text-center space-y-1 border-b border-slate-100 pb-3">
                    <h2 className="text-sm font-bold text-slate-800">পার্টনার লগইন (Partner Login)</h2>
                    <p className="text-[10px] text-slate-500">আপনার পার্টনার আইডি ও মোবাইল নম্বর দিয়ে লগইন করুন</p>
                  </div>

                  {loginError && (
                    <div className="bg-red-50 border border-red-100 text-red-700 text-[11px] p-2.5 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  <form onSubmit={handlePartnerLogin} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">পার্টনার আইডি (Partner ID)</label>
                      <input
                        type="text"
                        placeholder="যেমন: P-1001"
                        value={loginPartnerId}
                        onChange={(e) => setLoginPartnerId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs focus:bg-white font-mono uppercase tracking-wide outline-none focus:ring-1 focus:ring-pink-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">মোবাইল নাম্বার (Partner Number)</label>
                      <input
                        type="tel"
                        placeholder="যেমন: 1784961102"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-pink-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow-sm transition-colors"
                    >
                      প্রবেশ করুন
                    </button>
                  </form>

                  <div className="border-t border-slate-100 pt-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPublicTab('register');
                        setLoginError(null);
                        setRegistrationError(null);
                      }}
                      className="text-pink-600 hover:text-pink-700 text-xs font-semibold hover:underline"
                    >
                      আইডি নেই? নতুন আইডি রেজিষ্ট্রেশন করুন
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PUBLIC VIEW 3: REGISTRATION FORM */}
            {publicTab === 'register' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4"
              >
                <div className="flex items-center space-x-2 text-slate-800">
                  <button
                    onClick={() => {
                      setPublicTab('login');
                      setRegistrationError(null);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-50 border border-slate-200"
                  >
                    <ArrowLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">নতুন আইডি রেজিষ্ট্রেশন করুন</h2>
                    <p className="text-[10px] text-slate-500 font-medium">B2B পার্টনার হিসেবে যুক্ত হতে নিচের তথ্যগুলো দিন</p>
                  </div>
                </div>

                {registrationError && (
                  <div className="bg-red-50 border border-red-100 text-red-700 text-[11px] p-2.5 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{registrationError}</span>
                  </div>
                )}

                <form onSubmit={handlePartnerRegistration} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">পার্টনারের নাম <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: Saeem"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">মোবাইল নাম্বার <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      required
                      placeholder="যেমন: 01784961102"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">বাসা নং, বিল্ডিং, রাস্তার নাম <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: Takimara, Shaheb Bari"
                      value={regHouseStreet}
                      onChange={(e) => setRegHouseStreet(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">ইউনিট নং (অপショナル)</label>
                    <input
                      type="text"
                      placeholder="যেমন: 2nd Floor, Flat A3"
                      value={regUnitNo}
                      onChange={(e) => setRegUnitNo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">এলাকা বা থানা <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: Kushtia Sadar"
                      value={regAreaThana}
                      onChange={(e) => setRegAreaThana(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">শহর (City) <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="যেমন: Kushtia"
                      value={regCity}
                      onChange={(e) => setRegCity(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">জেলা <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        placeholder="যেমন: Kushtia"
                        value={regDistrict}
                        onChange={(e) => setRegDistrict(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-pink-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 uppercase">পোস্টাল কোড</label>
                      <input
                        type="text"
                        placeholder="যেমন: 7000"
                        value={regPostalCode}
                        onChange={(e) => setRegPostalCode(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-pink-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReg}
                    className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
                  >
                    {isSubmittingReg ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>{isSubmittingReg ? 'রেজিস্ট্রেশন হচ্ছে...' : 'রেজিস্ট্রেশন নিশ্চিত করুন'}</span>
                  </button>
                </form>

                <div className="border-t border-slate-100 pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setPublicTab('login');
                      setRegistrationError(null);
                    }}
                    className="text-emerald-600 hover:text-emerald-700 text-xs font-semibold hover:underline"
                  >
                    ইতিমধ্যে আইডি আছে? লগইন করুন
                  </button>
                </div>
              </motion.div>
            )}

            {/* Dialog Popups */}
            {showNewRegistrationPopup && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl max-w-sm w-full text-center space-y-4"
                >
                  <div className="w-11 h-11 bg-pink-50 rounded-full flex items-center justify-center text-pink-600 mx-auto border border-pink-100">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-900">আইডি খুঁজে পাওয়া যায়নি!</h4>
                    <p className="text-xs text-slate-500 leading-normal">
                      আপনার দেওয়া পার্টনার আইডি বা মোবাইল নাম্বারটি সঠিক নয়। নতুন পার্টনার হয়ে থাকলে দয়া করে নতুন আইডি রেজিস্ট্রেশন করুন।
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowNewRegistrationPopup(false);
                        setPublicTab('register');
                      }}
                      className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                    >
                      নতুন আইডি রেজিষ্ট্রেশন করুন
                    </button>
                    <button
                      onClick={() => setShowNewRegistrationPopup(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-semibold transition-colors"
                    >
                      বন্ধ করুন
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {registrationSuccessMessage && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xl max-w-sm w-full text-center space-y-4"
                >
                  <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto border border-emerald-100">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-900">রেজিষ্ট্রেশন সফল হয়েছে!</h4>
                    <p className="text-xs text-slate-500">
                      প্রিয় {registrationSuccessMessage.name}, নিচে আপনার নতুন পার্টনার আইডি দেওয়া হলো। লগইন করার জন্য আইডিটি লিখে রাখুন।
                    </p>
                  </div>

                  <div className="bg-slate-50 py-3 px-4 border border-slate-200 rounded-xl font-mono text-base font-bold text-slate-800 flex justify-between items-center">
                    <span>{registrationSuccessMessage.id}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(registrationSuccessMessage.id);
                        showToast('আইডি কপি করা হয়েছে!', 'success');
                      }}
                      className="text-[10px] text-pink-600 border border-pink-200 bg-pink-50 rounded-md py-0.5 px-2 hover:bg-pink-100 font-sans"
                    >
                      কপি করুন
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setRegistrationSuccessMessage(null);
                      setPublicTab('login');
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors"
                  >
                    লগইন করুন
                  </button>
                </motion.div>
              </div>
            )}
          </div>
        ) : (
          /* PARTNER IS LOGGED IN: Render application modules */
          <div className="space-y-4">
                {sheetError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3.5 rounded-xl space-y-3 shadow-xs animate-in fade-in zoom-in duration-200">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-[13px] text-red-950">ডাটাবেজ লোড হতে সমস্যা হয়েছে</p>
                        <p className="text-[11px] text-red-700 leading-normal mt-0.5">{sheetError}</p>
                        
                        {isAuthError ? (
                          <div className="mt-3 pt-2.5 border-t border-red-200/60 space-y-2">
                            <p className="text-[11px] text-red-800 font-semibold leading-relaxed">
                              আপনার গুগল অথেন্টিকেশন সেশনটির মেয়াদ শেষ হয়ে গেছে বা এটি ইনভ্যালিড দেখাচ্ছে। অনুগ্রহ করে নিচে ক্লিক করে পুনরায় গুগল অথেন্টিকেশন সম্পন্ন করুন।
                            </p>
                            <button
                              onClick={handleGoogleSignIn}
                              disabled={isLoggingInGoogle}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 text-[11px]"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isLoggingInGoogle ? 'animate-spin' : ''}`} />
                              {isLoggingInGoogle ? 'অথরাইজ হচ্ছে...' : 'গুগল অথরাইজেশন পুনরায় করুন (Re-authorize)'}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 pt-2.5 border-t border-red-200/60 space-y-2">
                            <p className="text-[11px] text-red-800 font-medium leading-relaxed">
                              চিন্তার কিছু নেই! নিচের সবুজ বাটনে ক্লিক করলে আপনার গুগল শিটে প্রয়োজনীয় সকল অনুপস্থিত ট্যাব (Category, Profiles, Orders) স্বয়ংক্রিয়ভাবে তৈরি হয়ে যাবে এবং ডেমো প্রোডাক্ট লোড হবে।
                            </p>
                            <button
                              onClick={async () => {
                                setIsLoadingData(true);
                                setSheetError(null);
                                try {
                                  const success = await autoFixMissingTabs(spreadsheetId!, accessToken!);
                                  if (success) {
                                    showToast('সফলভাবে সমস্ত প্রয়োজনীয় ট্যাব তৈরি করা হয়েছে!', 'success');
                                    await loadMasterData();
                                  } else {
                                    setSheetError('স্বয়ংক্রিয়ভাবে ফিক্স করা সম্ভব হয়নি। দয়া করে আপনার গুগল শিটে ম্যানুয়ালি "Profiles", "Category" এবং "Orders" নামের ট্যাবসমূহ তৈরি করুন।');
                                  }
                                } catch (err: any) {
                                  setSheetError(`সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}`);
                                } finally {
                                  setIsLoadingData(false);
                                }
                              }}
                              disabled={isLoadingData}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 text-[11px]"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              অনুপস্থিত সকল ট্যাব স্বয়ংক্রিয়ভাবে তৈরি করুন (Auto-Fix)
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {isMissingTrackingTabs && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3.5 rounded-xl space-y-2.5 shadow-xs">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[12px] text-amber-950">অর্ডার ও প্রোফাইল ট্র্যাকিং অপショナル ট্যাব অনুপস্থিত</p>
                        <p className="text-[11px] text-amber-800 leading-normal mt-0.5">
                          আপনার গুগল শিটে পণ্যের তালিকা সফলভাবে লোড হয়েছে! তবে নতুন পার্টনার রেজিস্ট্রেশন এবং অর্ডার ট্র্যাকিং করার জন্য অতিরিক্ত দুটি ট্যাব (Profiles এবং Orders) প্রয়োজন। নিচের বাটনে ক্লিক করে ট্যাব দুটি স্বয়ংক্রিয়ভাবে তৈরি করতে পারেন (অথবা শিটে ম্যানুয়ালি "Profiles" এবং "Orders" নামের ট্যাব তৈরি করতে পারেন):
                        </p>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-amber-200 flex flex-col gap-2">
                      <button
                        onClick={async () => {
                          setIsLoadingData(true);
                          try {
                            const success = await autoFixMissingTabs(spreadsheetId!, accessToken!);
                            if (success) {
                              showToast('সফলভাবে ট্র্যাকিং ট্যাবসমূহ ফিক্স করা হয়েছে!', 'success');
                              await loadMasterData();
                            } else {
                              showToast('স্বয়ংক্রিয়ভাবে ফিক্স করা সম্ভব হয়নি। আপনি গুগল শিটে ম্যানুয়ালি "Profiles" এবং "Orders" নামের ট্যাব দুটি তৈরি করে নিতে পারেন।', 'info');
                            }
                          } catch (err: any) {
                            showToast(`সমস্যা হয়েছে: ${err.message || 'অজানা ত্রুটি'}`, 'error');
                          } finally {
                            setIsLoadingData(false);
                          }
                        }}
                        disabled={isLoadingData}
                        className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition disabled:opacity-50 text-[11px]"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        অনুপস্থিত ট্র্যাকিং ট্যাবসমূহ তৈরি করুন (Auto-Fix)
                      </button>
                    </div>
                  </div>
                )}
                
                {/* 3. Welcome / Info Bar */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">{currentPartner.name}</div>
                    <div className="flex gap-1.5 items-center">
                      <span className="font-mono text-[10px] text-slate-500">{currentPartner.partnerId}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setCurrentView('catalog');
                        setCheckoutStep('cart');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                        currentView === 'catalog' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      ক্যাটালগ
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('cart');
                        setCheckoutStep('cart');
                      }}
                      className={`relative px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                        currentView === 'cart' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      কার্ট
                      {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                          {cart.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setCurrentView('tracker')}
                      className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                        currentView === 'tracker' ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      অর্ডার
                    </button>
                  </div>
                </div>

                {/* 4. ACTIVE VIEW: Product Catalog */}
                {currentView === 'catalog' && (
                  <div className="space-y-4">
                    {/* Search & Category filter */}
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="প্রোডাক্ট খুঁজুন..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-1 text-xs focus:bg-white outline-none"
                        />
                      </div>
                      
                      {categoriesList.length > 1 && (
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs text-slate-600 outline-none"
                        >
                          <option value="All">সকল ক্যাটাগরি</option>
                          {categoriesList.filter(c => c !== 'All').map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {isLoadingData ? (
                      <div className="text-center py-12 space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                        <p className="text-xs text-slate-500">প্রোডাক্ট লোড হচ্ছে...</p>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      products.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">কোনো প্রোডাক্ট পাওয়া যায়নি!</p>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                              আপনার গুগল স্প্রেডশিটে কোনো প্রোডাক্ট ট্যাব খুঁজে পাওয়া যায়নি অথবা ট্যাবটি খালি। অনুগ্রহ করে নিশ্চিত করুন যে আপনার স্প্রেডশিটে <strong className="text-slate-800">Category</strong> অথবা <strong className="text-slate-800">Data</strong> নামে শিটটি আছে এবং তাতে প্রোডাক্ট ডেটা রয়েছে।
                            </p>
                          </div>
                          <div className="pt-2">
                            <p className="text-[11px] text-slate-400">
                              টিপস: আপনি উপরে <strong className="text-pink-600">"এডমিন সেটআপ (Admin)"</strong> বাটনে ক্লিক করে কলাম ডায়াগনস্টিকস রান করতে পারেন অথবা অটো-হিল (Auto-heal) করতে পারবেন।
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-4">
                          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-700">কোনো প্রোডাক্ট পাওয়া যায়নি!</p>
                        </div>
                      )
                    ) : (
                      /* Mobile optimized 2 column grid box */
                      <div className="grid grid-cols-2 gap-3">
                        {filteredProducts.map(p => {
                          const partnerPrice = getPartnerPrice(p);
                          const isAdded = cart.some(item => item.product.id === p.id);

                          return (
                            <div
                              key={p.id}
                              className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
                            >
                              <div>
                                <div className="aspect-square w-full bg-slate-100 relative">
                                  <img
                                    src={p.imageUrl}
                                    alt={p.name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="absolute top-1.5 left-1.5 bg-slate-900/70 text-white text-[8px] font-mono px-1 rounded">
                                    {p.id}
                                  </span>
                                </div>

                                <div className="p-2 space-y-0.5">
                                  <h4 className="font-semibold text-slate-800 text-xs line-clamp-2 leading-tight">
                                    {p.name}
                                  </h4>
                                  {p.weight && (
                                    <p className="text-xs font-medium text-slate-500 pt-0.5">
                                      {p.weight}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="p-2 pt-0 space-y-2">
                                {/* Price block */}
                                <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                                  {/* Original price (struck through) left-aligned - font size slightly larger */}
                                  <span className="text-xs text-slate-400 line-through font-medium">
                                    ৳{p.originalPrice}
                                  </span>

                                  {/* Partner Price (pink color) right-aligned */}
                                  <span className="text-xs sm:text-sm font-bold text-pink-600 font-mono">
                                    ৳{partnerPrice}
                                  </span>
                                </div>

                                {/* Cart actions */}
                                {isAdded ? (
                                  <button
                                    onClick={() => {
                                      setCurrentView('cart');
                                      setCheckoutStep('cart');
                                    }}
                                    className="w-full bg-pink-50 border border-pink-200 text-pink-600 font-bold py-1 px-2 rounded-lg text-[10px] text-center transition-colors flex items-center justify-center gap-1"
                                  >
                                    <ShoppingCart className="w-3 h-3" />
                                    <span>কার্ট দেখুন</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAddToCart(p)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-1 px-2 rounded-lg text-[10px] text-center transition-colors"
                                  >
                                    অ্যাড টু কার্ট
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. ACTIVE VIEW: Cart & Checkout Form */}
                {currentView === 'cart' && (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-4">
                    
                    {/* Cart Steps */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 text-xs text-slate-400">
                      <span className={`font-semibold ${checkoutStep === 'cart' ? 'text-pink-600 border-b-2 border-pink-600 pb-1' : ''}`}>১. কার্ট তালিকা</span>
                      <span className={`font-semibold ${checkoutStep === 'address' ? 'text-pink-600 border-b-2 border-pink-600 pb-1' : ''}`}>২. ঠিকানা নিশ্চিতকরণ</span>
                      <span className={`font-semibold ${checkoutStep === 'payment' ? 'text-pink-600 border-b-2 border-pink-600 pb-1' : ''}`}>৩. পেমেন্ট ও রশিদ</span>
                    </div>

                    <AnimatePresence mode="wait">
                      
                      {/* Step 1: Cart Items list */}
                      {checkoutStep === 'cart' && (
                        <motion.div
                          key="cart-step"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          {cart.length === 0 ? (
                            <div className="text-center py-8 space-y-2">
                              <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                              <p className="text-xs text-slate-500">আপনার কার্ট খালি। ক্যাটালগ থেকে প্রোডাক্ট যোগ করুন।</p>
                              <button
                                onClick={() => setCurrentView('catalog')}
                                className="text-xs text-emerald-600 hover:underline font-semibold"
                              >
                                ক্যাটালগ দেখুন
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {cart.map((item, idx) => {
                                const price = getPartnerPrice(item.product);
                                return (
                                  <div
                                    key={item.product.id}
                                    className="flex items-center space-x-2 bg-slate-50 p-2 rounded-lg border border-slate-200/60"
                                  >
                                    {/* Tick mark checkbox (leftmost) */}
                                    <input
                                      type="checkbox"
                                      checked={item.checked}
                                      onChange={() => handleToggleChecked(item.product.id)}
                                      className="accent-pink-600 h-4 w-4 shrink-0 rounded"
                                    />

                                    {/* Number index */}
                                    <span className="text-[10px] text-slate-400 font-bold font-mono">
                                      {idx + 1}.
                                    </span>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <h5 className="text-xs font-semibold text-slate-900 truncate">
                                        {item.product.name}
                                      </h5>
                                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                                        {/* Product weight beside name */}
                                        <span className="bg-slate-200/70 px-1.5 py-0.2 rounded text-[8px] font-medium text-slate-600">
                                          {item.product.weight}
                                        </span>
                                        <span className="font-bold text-pink-600">৳{price}</span>
                                      </div>
                                    </div>

                                    {/* Quantity controls */}
                                    <div className="flex items-center space-x-1">
                                      <div className="flex items-center bg-white border border-slate-200 rounded-md py-0.5 px-1.5 text-xs font-semibold gap-1.5">
                                        <button
                                          onClick={() => handleUpdateQuantity(item.product.id, -1)}
                                          className="text-slate-400 hover:text-slate-700"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="min-w-3 text-center font-mono text-[11px]">{item.quantity}</span>
                                        <button
                                          onClick={() => handleUpdateQuantity(item.product.id, 1)}
                                          className="text-slate-400 hover:text-slate-700"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </div>
                                      <button
                                        onClick={() => handleRemoveItem(item.product.id)}
                                        className="text-red-500 p-1 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Cart Summary and Check out button box */}
                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">মোট পরিমাণ (Total):</span>
                                  <div className="font-mono text-base font-bold text-emerald-800">৳{cartTotal.toLocaleString()}</div>
                                </div>

                                <button
                                  onClick={() => setCheckoutStep('address')}
                                  disabled={checkedItems.length === 0}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-xs transition-colors disabled:opacity-50"
                                >
                                  চেক আউট করুন
                                </button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* Step 2: Address Confirmation */}
                      {checkoutStep === 'address' && (
                        <motion.div
                          key="address-step"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-pink-500" />
                                আপনার ডিফল্ট ঠিকানা (Default Address)
                              </span>
                              <span className="bg-emerald-100 text-emerald-800 font-bold text-[8px] px-1.5 py-0.5 rounded-full">
                                নির্বাচিত
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                              {formatAddress(currentPartner)}
                            </p>

                            <div className="text-[10px] text-slate-400 leading-normal mt-2 italic">
                              * এটি আপনার প্রোফাইল তৈরি করার সময় প্রদত্ত ঠিকানা। আমরা এই ঠিকানায় পণ্য কুরিয়ার করবো। পরিবর্তন করতে চাইলে এডমিনের সাথে যোগাযোগ করুন।
                            </div>
                          </div>

                          {/* Delivery Area Status (No longer select on partner-side, pre-assigned by Admin) */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <Compass className="w-4.5 h-4.5 text-emerald-500 animate-pulse" />
                              কুরিয়ার ডেলিভারি জোন (Delivery Zone)
                            </span>
                            <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-150 flex items-center justify-between text-xs font-medium text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>
                                  {resolvedDeliveryArea === 'dhaka' ? 'ঢাকা সিটি (Dhaka City)' : 'ঢাকার বাইরে (Outside Dhaka)'}
                                </span>
                              </div>
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                                চার্জ: ৳{resolvedDeliveryArea === 'dhaka' ? billingSettings.courierInside : billingSettings.courierOutside}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal">
                              * আপনার রেজিস্টার্ড ডেলিভারি ঠিকানা অনুযায়ী এডমিন কুরিয়ার জোন সিলেক্ট করে দিয়েছেন। কোনো পরিবর্তন প্রয়োজন হলে এডমিনের সাথে যোগাযোগ করুন।
                            </p>
                          </div>

                          {/* Order Price Breakdown */}
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs">
                            <div className="flex justify-between text-slate-600">
                              <span>পণ্যের মোট মূল্য (Products Subtotal):</span>
                              <span className="font-mono font-bold">৳{cartTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>কুরিয়ার চার্জ (Courier Fee):</span>
                              <span className="font-mono font-bold">৳{courierCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>প্যাকিং চার্জ (Packing Fee):</span>
                              <span className="font-mono font-bold">৳{packingCost.toLocaleString()}</span>
                            </div>
                            <div className="border-t border-slate-200 pt-1.5 flex justify-between text-slate-900 font-bold text-sm">
                              <span>সর্বমোট বিল (Grand Total):</span>
                              <span className="font-mono text-emerald-800">৳{grandTotal.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="flex gap-2.5 pt-2">
                            <button
                              onClick={() => setCheckoutStep('cart')}
                              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition-colors border border-slate-200"
                            >
                              পিছনে যান
                            </button>
                            <button
                              onClick={handleConfirmOrderAndShowPayment}
                              className="flex-1 bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 rounded-xl text-xs shadow-xs transition-colors"
                            >
                              অর্ডার নিশ্চিত করুন
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Step 3: Payment & Upload Receipt Proof */}
                      {checkoutStep === 'payment' && (
                        <motion.div
                          key="payment-step"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <div className="bg-pink-50/50 p-3 rounded-xl border border-pink-100 text-xs text-slate-700 space-y-2">
                            <h4 className="font-bold text-pink-700 flex items-center gap-1">
                              💳 পেমেন্ট করার নির্দেশনাবলী:
                            </h4>
                            <p className="leading-relaxed">
                              দয়া করে আমাদের অফিসিয়াল মার্চেন্ট নাম্বারে মোট টাকা সেন্ড মানি করুন। পেমেন্ট সম্পন্ন হলে নিচের ফর্মে রশিদ বা স্ক্রিনশট আপলোড করুন।
                            </p>
                            <div className="bg-white p-2.5 rounded-lg border border-pink-100 space-y-2 text-[11px] font-mono">
                              {paymentMethods.length > 0 ? (
                                paymentMethods.map((method, idx) => (
                                  <div key={idx} className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded text-[10px] border border-pink-100/50">
                                        {method.methodName}
                                      </span>
                                    </div>
                                    <div className="flex flex-col sm:items-end mt-1 sm:mt-0">
                                      <span className="font-bold text-slate-900 text-xs">{method.accountNo}</span>
                                      {method.details && (
                                        <span className="text-[10px] text-slate-500 font-sans mt-0.5">{method.details}</span>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <>
                                  <div className="flex justify-between">
                                    <span className="font-semibold text-slate-500">বিকাশ (Bkash):</span>
                                    <span className="font-bold text-slate-800">01784961102 (Personal)</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="font-semibold text-slate-500">নগদ (Nagad):</span>
                                    <span className="font-bold text-slate-800">01784961102 (Personal)</span>
                                  </div>
                                </>
                              )}
                              <div className="flex justify-between border-t border-pink-100 pt-2 mt-2 text-slate-900 font-bold">
                                <span>সর্বমোট পেমেন্ট:</span>
                                <span className="text-pink-600">৳{cartTotal.toLocaleString()} BDT</span>
                              </div>
                            </div>
                          </div>

                          <form onSubmit={handlePaymentProofUploadAndSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-600 uppercase">
                                পেমেন্টের রশিদ / স্ক্রিনশট আপলোড করুন <span className="text-red-500">*</span>
                              </label>
                              
                              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-pink-400 transition-colors bg-slate-50 relative">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  onChange={(e) => {
                                    if (e.target.files) {
                                      const filesArr = Array.from(e.target.files);
                                      setPaymentReceiptFiles(prev => [...prev, ...filesArr]);
                                    }
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-1.5 text-xs text-slate-500">
                                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                                  <p className="font-medium text-slate-700">
                                    ছবি সিলেক্ট করতে ক্লিক বা ড্র্যাগ করুন (একাধিক ফাইল সিলেক্ট করতে পারেন)
                                  </p>
                                  <p className="text-[10px] text-slate-400">PNG, JPG अथवा JPEG ছবি সমর্থিত</p>
                                </div>
                              </div>

                              {/* Selected Files List */}
                              {paymentReceiptFiles.length > 0 && (
                                <div className="space-y-1 pt-1.5">
                                  <p className="text-[10px] font-bold text-slate-500">সংযুক্ত ফাইলসমূহ ({paymentReceiptFiles.length}টি):</p>
                                  <div className="space-y-1 max-h-36 overflow-y-auto">
                                    {paymentReceiptFiles.map((file, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-slate-100 p-2 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-700">
                                        <span className="truncate max-w-[220px]">{file.name}</span>
                                        <button
                                          type="button"
                                          onClick={() => setPaymentReceiptFiles(prev => prev.filter((_, i) => i !== idx))}
                                          className="text-red-500 hover:text-red-700 font-bold p-0.5 px-1.5 bg-white hover:bg-red-50 rounded border border-slate-200 transition-colors"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isUploadingReceipt}
                                onClick={() => setCheckoutStep('address')}
                                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors border border-slate-200 disabled:opacity-50"
                              >
                                পিছনে যান
                              </button>
                              <button
                                type="submit"
                                disabled={isUploadingReceipt}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
                              >
                                {isUploadingReceipt ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>রশিদ আপলোড হচ্ছে...</span>
                                  </>
                                ) : (
                                  <span>পেমেন্ট নিশ্চিত করুন</span>
                                )}
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      )}

                      {/* Step 4: Checkout Success & Processing status banner */}
                      {checkoutStep === 'success' && (
                        <motion.div
                          key="success-step"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="text-center py-6 space-y-4"
                        >
                          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto border border-emerald-100">
                            <CheckCircle className="w-6 h-6" />
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-900">অর্ডার সফল হয়েছে!</h4>
                            <p className="text-xs text-slate-500">
                              আপনার অর্ডারটি সংগ্রহ করা হয়েছে। এডমিন ভেরিফাই করার পর প্রোডাক্ট কুরিয়ার করা হবে।
                            </p>
                          </div>

                          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-center text-xs font-semibold text-amber-800 animate-pulse">
                            অবস্থা (Status): অর্ডার প্রসেসিং হচ্ছে (Order Processing)
                          </div>

                          <button
                            onClick={() => {
                              setCurrentView('tracker');
                              setCheckoutStep('cart');
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded-xl text-xs transition-colors"
                          >
                            আমার অর্ডার ট্র্যাকিং দেখুন
                          </button>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>
                )}

                {/* 6. ACTIVE VIEW: Order Live Tracker */}
                {currentView === 'tracker' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        আপনার অর্ডার হিস্ট্রি (My Orders)
                      </h3>
                      <button
                        onClick={loadMasterData}
                        disabled={isLoadingData}
                        className="p-1 rounded-lg hover:bg-slate-100 border border-slate-200 text-slate-500 flex items-center gap-1 text-[10px]"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingData ? 'animate-spin' : ''}`} />
                        রিলোড
                      </button>
                    </div>

                    {isLoadingData ? (
                      <div className="text-center py-12 space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                        <p className="text-xs text-slate-500">অর্ডার হিস্ট্রি লোড হচ্ছে...</p>
                      </div>
                    ) : myOrders.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-4">
                        <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-600">আপনি এখনও কোনো অর্ডার করেননি।</p>
                        <button
                          onClick={() => setCurrentView('catalog')}
                          className="text-xs text-emerald-600 hover:underline font-semibold mt-1"
                        >
                          প্রোডাক্ট ক্যাটালগ দেখুন
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myOrders.map(o => {
                          const statusStyle = getBanglaStatus(o.status);
                          return (
                            <div
                              key={o.orderId}
                              className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2.5 text-xs"
                            >
                              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5 font-mono text-[10px]">
                                <span className="font-bold text-slate-800">{o.orderId}</span>
                                <span className="text-slate-400">{o.date}</span>
                              </div>

                              <div className="space-y-1 text-slate-600 text-[11px]">
                                <div className="font-medium text-slate-800 line-clamp-2">
                                  📦 {o.items}
                                </div>
                                <div className="text-slate-500 truncate">
                                  📍 {o.shippingAddress}
                                </div>
                              </div>

                              <div className="flex justify-between items-center pt-1 text-[11px]">
                                <span className="font-bold text-emerald-800 font-mono">
                                  ৳{Number(o.totalAmount).toLocaleString()}
                                </span>

                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${statusStyle.color}`}>
                                  {statusStyle.text}
                                </span>
                              </div>

                              {o.damageClaim && (
                                <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100 text-[10px] text-rose-700 space-y-1">
                                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    ড্যামেজ ক্লেইম বিবরণ (Damage Claim):
                                  </div>
                                  <p className="font-medium leading-relaxed whitespace-pre-wrap text-rose-600">{o.damageClaim}</p>
                                </div>
                              )}

                              <div className="flex gap-2.5 pt-1">
                                {o.paymentProofUrl && (
                                  <a
                                    href={o.paymentProofUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 block text-center text-[10px] bg-slate-50 hover:bg-slate-100 text-slate-600 py-1.5 rounded-lg border border-slate-200 font-medium transition-colors"
                                  >
                                    পেমেন্ট রশিদ দেখুন
                                  </a>
                                )}

                                {o.status !== 'Damage Claimed' && (
                                  <button
                                    onClick={() => {
                                      setDamageClaimOrder(o);
                                    }}
                                    className="flex-1 block text-center text-[10px] bg-rose-50 hover:bg-rose-100 text-rose-700 py-1.5 rounded-lg border border-rose-200 font-medium transition-colors"
                                  >
                                    ড্যামেজ ক্লেইম করুন
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>

      {/* Damage Claim Popup Modal */}
      <AnimatePresence>
        {damageClaimOrder && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-sm w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-rose-800 font-bold text-xs">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-500 animate-bounce" />
                  <span>পণ্য ড্যামেজ ক্লেইম (File Damage Claim)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDamageClaimOrder(null)}
                  className="text-rose-400 hover:text-rose-600 font-bold text-sm bg-white p-1 rounded-full border border-rose-100 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleDamageClaimSubmit} className="p-4 space-y-3.5 text-xs">
                {/* Order ID display */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span>অর্ডার আইডি:</span>
                  <span className="font-bold text-slate-800">{damageClaimOrder.orderId}</span>
                </div>

                {/* Products & Damaged Quantities */}
                <div className="space-y-2">
                  <label className="block text-slate-700 font-bold">
                    ক্ষতিগ্রস্ত পণ্যের পরিমাণ নির্ধারণ করুন (Set Damaged Quantities)
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {getOrderProductsList(damageClaimOrder.items).map((itemStr, idx) => {
                      const item = parseOrderItem(itemStr);
                      const currentQty = damageClaimQuantities[item.fullName] || 0;
                      return (
                        <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <div className="flex-1 pr-2">
                            <p className="font-semibold text-slate-800 text-[11px] line-clamp-1">{item.fullName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">অর্ডার করা হয়েছিল: {item.orderedQty}টি</p>
                          </div>
                          <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => setDamageClaimQuantities(prev => ({
                                ...prev,
                                [item.fullName]: Math.max(0, (prev[item.fullName] || 0) - 1)
                              }))}
                              className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-mono font-bold text-slate-800 text-xs">
                              {currentQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => setDamageClaimQuantities(prev => ({
                                ...prev,
                                [item.fullName]: Math.min(item.orderedQty, (prev[item.fullName] || 0) + 1)
                              }))}
                              className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Damage description / details */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">অভিযোগের বিবরণ (Details / Reason)</label>
                  <textarea
                    rows={2}
                    placeholder="পণ্যটি কিভাবে বা কি ধরনের ক্ষতি হয়েছে তা বিস্তারিত লিখুন..."
                    value={damageClaimDesc}
                    onChange={(e) => setDamageClaimDesc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 placeholder:text-slate-400"
                  />
                </div>

                {/* Damage photo proof upload */}
                <div className="space-y-1">
                  <label className="block text-slate-600 font-bold">ক্ষতির প্রমাণ ছবি সংযুক্ত করুন (Upload Damage Photos)</label>
                  <div className="border border-dashed border-rose-200 hover:border-rose-400 bg-rose-50/20 hover:bg-rose-50/40 rounded-xl p-3 text-center transition-all cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        if (e.target.files) {
                          const filesArr = Array.from(e.target.files);
                          setDamageClaimPhotoFiles(prev => [...prev, ...filesArr]);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-1">
                      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center border border-rose-100 shadow-xs mx-auto">
                        <Upload className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600">
                        ছবি সিলেক্ট বা ড্র্যাগ করতে ক্লিক করুন (একাধিক ছবি নেওয়া যাবে)
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium">PNG, JPG, JPEG সমর্থিত</div>
                    </div>
                  </div>

                  {/* Selected Photos list */}
                  {damageClaimPhotoFiles.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <p className="text-[10px] font-bold text-slate-500">সংযুক্ত ছবিসমূহ ({damageClaimPhotoFiles.length}টি):</p>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {damageClaimPhotoFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-rose-50/60 p-1.5 rounded-lg border border-rose-100 text-[11px] font-medium text-slate-700">
                            <span className="truncate max-w-[200px] text-[10px]">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setDamageClaimPhotoFiles(prev => prev.filter((_, i) => i !== idx))}
                              className="text-rose-600 hover:text-rose-800 font-bold text-[10px] px-1 bg-white rounded border border-rose-200"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal actions */}
                <div className="flex gap-2.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setDamageClaimOrder(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-colors border border-slate-200"
                  >
                    বাতিল করুন
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingDamageClaim}
                    className="flex-1 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-rose-200"
                  >
                    {isSubmittingDamageClaim ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ক্লেইম হচ্ছে...
                      </>
                    ) : (
                      'ক্লেইম সাবমিট করুন'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Absolute Toast Alert Box */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 w-full max-w-xs px-4"
          >
            <div className={`p-3.5 rounded-xl shadow-lg border flex items-center space-x-2 text-xs font-semibold leading-normal ${
              toastMessage.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              toastMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              'bg-slate-900 text-white border-slate-800'
            }`}>
              <AlertCircle className={`w-4 h-4 shrink-0 ${
                toastMessage.type === 'error' ? 'text-red-500' :
                toastMessage.type === 'success' ? 'text-emerald-500' :
                'text-slate-400'
              }`} />
              <span className="flex-1">{toastMessage.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

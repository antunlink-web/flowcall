import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Palette,
  Wallet,
  Users,
  ShoppingCart,
  PiggyBank,
  Receipt,
  ChevronRight,
  Check,
  Upload,
  X,
} from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useBranding } from "@/hooks/useBranding";

const subNavItems = [
  { label: "Lists", href: "/manage/lists" },
  { label: "Pipeline", href: "/manage/pipeline" },
  { label: "Users", href: "/manage/users" },
  { label: "Duplicates", href: "/manage/duplicates" },
  { label: "Claims", href: "/manage/claims" },
  { label: "Settings", href: "/manage/settings" },
  { label: "Account", href: "/manage/account" },
];

const sidebarItems = [
  { icon: CreditCard, label: "Billing Information", id: "billing" },
  { icon: Palette, label: "Custom Branding", id: "branding" },
  { icon: Wallet, label: "Payment Method", id: "payment" },
  { icon: Users, label: "Seats", id: "seats" },
  { icon: ShoppingCart, label: "Subscription", id: "subscription" },
  { icon: PiggyBank, label: "Balance", id: "balance" },
  { icon: Receipt, label: "Invoices", id: "invoices" },
];

const mockInvoices = [
  { date: "5 January 2026", amount: "€105.74", transactionId: "6p5ayg0b" },
  { date: "8 December 2025", amount: "€24.23", transactionId: "rr8nsvgh" },
  { date: "5 December 2025", amount: "€150.00", transactionId: "0rfksbjk" },
  { date: "18 November 2025", amount: "€15.87", transactionId: "cbkann6z" },
  { date: "11 November 2025", amount: "€21.70", transactionId: "g6z5hwwz" },
  { date: "5 November 2025", amount: "€80.61", transactionId: "5dqkb6j5" },
  { date: "13 October 2025", amount: "€20.19", transactionId: "ea2h9f78" },
  { date: "13 October 2025", amount: "€20.19", transactionId: "3a81b297" },
];

const mockBalanceHistory = [
  { timestamp: "07-01-2026 15:45", description: "Credited: Removed seat from Basic (Legacy 2025-12) Plan subscription", amount: "€24.2300", balance: "€24.2300" },
];

export default function ManageAccount() {
  const location = useLocation();
  const { isOwner } = useUserRole();
  const { branding, refetch: refetchBranding } = useBranding();
  const [activeSection, setActiveSection] = useState("billing");
  const [seats, setSeats] = useState("4");
  const [usedSeats, setUsedSeats] = useState(0);
  const [topUpTo, setTopUpTo] = useState("0");
  const [balanceFallsBelow, setBalanceFallsBelow] = useState("0");
  const [showEntries, setShowEntries] = useState("25");
  const [searchInvoices, setSearchInvoices] = useState("");
  
  // Branding state
  const [brandingCompanyName, setBrandingCompanyName] = useState("");
  const [brandingAppName, setBrandingAppName] = useState("");
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState("200 98% 39%");
  const [brandingSecondaryColor, setBrandingSecondaryColor] = useState("215 24% 26%");
  const [brandingAccentColor, setBrandingAccentColor] = useState("210 40% 98%");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState<string | null>(null);
  const [brandingFaviconUrl, setBrandingFaviconUrl] = useState<string | null>(null);
  const [savingBranding, setSavingBranding] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  
  // Billing form state
  const [vatNumber, setVatNumber] = useState("LT100017923517");
  const [companyName, setCompanyName] = useState('Labdaros ir paramos fondas "Gera valia"');
  const [contactPhone, setContactPhone] = useState("+37067679991");
  const [address1, setAddress1] = useState("Pamenkalnio g. 25-1");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("Vilnius");
  const [stateProvince, setStateProvince] = useState("Vilniaus");
  const [zip, setZip] = useState("06326");
  const [country, setCountry] = useState("Lithuania");

  useEffect(() => {
    const fetchSeatsAndUsers = async () => {
      // Fetch seats setting
      const { data: settingsData } = await supabase
        .from("account_settings")
        .select("setting_value")
        .eq("setting_key", "seats")
        .maybeSingle();
      
      if (settingsData?.setting_value) {
        const value = settingsData.setting_value as { total?: number };
        setSeats(String(value.total || 4));
      }

      // Fetch user count
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      
      setUsedSeats(count || 0);
    };

    fetchSeatsAndUsers();
  }, []);

  // Load branding settings when available
  useEffect(() => {
    if (branding) {
      setBrandingCompanyName(branding.company_name || "");
      setBrandingAppName(branding.app_name || "");
      setBrandingPrimaryColor(branding.primary_color || "200 98% 39%");
      setBrandingSecondaryColor(branding.secondary_color || "215 24% 26%");
      setBrandingAccentColor(branding.accent_color || "210 40% 98%");
      setBrandingLogoUrl(branding.logo_url);
      setBrandingFaviconUrl(branding.favicon_url);
    }
  }, [branding]);

  const handleSaveSeats = async () => {
    const { error } = await supabase
      .from("account_settings")
      .update({ setting_value: { total: parseInt(seats) || 4 } })
      .eq("setting_key", "seats");

    if (error) {
      toast.error("Failed to update seats");
    } else {
      toast.success("Seats updated successfully");
    }
  };

  const uploadFile = async (file: File, type: 'logo' | 'favicon'): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error(`Failed to upload ${type}`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('branding')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = await uploadFile(file, 'logo');
    if (url) {
      setBrandingLogoUrl(url);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = await uploadFile(file, 'favicon');
    if (url) {
      setBrandingFaviconUrl(url);
    }
  };

  const handleSaveBranding = async () => {
    if (!isOwner) {
      toast.error("Only account owners can modify branding");
      return;
    }

    setSavingBranding(true);
    
    const { error } = await supabase
      .from("branding_settings")
      .update({
        company_name: brandingCompanyName || null,
        app_name: brandingAppName || null,
        logo_url: brandingLogoUrl,
        favicon_url: brandingFaviconUrl,
        primary_color: brandingPrimaryColor,
        secondary_color: brandingSecondaryColor,
        accent_color: brandingAccentColor,
      })
      .eq("id", branding?.id);

    setSavingBranding(false);

    if (error) {
      toast.error("Failed to save branding settings");
    } else {
      toast.success("Branding settings saved successfully");
      refetchBranding();
    }
  };

  // Convert HSL string to hex for color picker
  const hslToHex = (hsl: string): string => {
    const parts = hsl.split(' ').map(p => parseFloat(p));
    if (parts.length < 3) return '#0077b6';
    
    const h = parts[0];
    const s = parts[1] / 100;
    const l = parts[2] / 100;
    
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  // Convert hex to HSL string
  const hexToHsl = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '200 98% 39%';
    
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const accountInfo = {
    plan: "Basic (Legacy 2025-12) - Billed €25 monthly per user",
    nextBillingDate: "Saturday, 7 February 2026",
    nextBillingAmount: "€100.00",
    paymentMethod: "535550******6227 / 06-2027",
    accountBalance: "€24.23",
  };

  const renderAccountInfoCard = () => (
    <div className="border border-blue-200 bg-blue-50/50 rounded p-6 mb-8">
      <div className="space-y-2 text-sm">
        <div className="grid grid-cols-[180px_1fr] gap-2">
          <span className="font-bold text-right">Your current plan:</span>
          <span>{accountInfo.plan}</span>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-2">
          <span className="font-bold text-right">Next billing date:</span>
          <span>{accountInfo.nextBillingDate}</span>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-2">
          <span className="font-bold text-right">Next billing amount:</span>
          <span>{accountInfo.nextBillingAmount}</span>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-2">
          <span className="font-bold text-right">Payment method:</span>
          <span>{accountInfo.paymentMethod}</span>
        </div>
        <div className="grid grid-cols-[180px_1fr] gap-2">
          <span className="font-bold text-right">Account Balance:</span>
          <span>{accountInfo.accountBalance}</span>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "billing":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Billing Information</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {renderAccountInfoCard()}

            {/* VAT Number */}
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Label className="w-40 text-right font-medium">VAT Number</Label>
                <div className="flex-1 flex gap-2">
                  <Input
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline">Change to validate</Button>
                </div>
              </div>
              <div className="ml-44">
                <p className="text-sm text-primary">provide your VAT-number with country code prefixed, eg. 'DK12345678'</p>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p className="font-medium">About VAT</p>
                  <p>Liisberg Consulting (the provider of Myphoner) is registered in Denmark, this means</p>
                  <ul className="list-disc ml-6 mt-1 space-y-1">
                    <li>Customers in Denmark will be charged VAT.</li>
                    <li>Private persons within the EU will be charged VAT.</li>
                    <li>Companies within the EU will not be charged VAT if they supply a valid VAT number.</li>
                    <li>Customers outside the EU will not be charged VAT.</li>
                  </ul>
                  <p className="mt-2">If supplied, the VAT number will be printed on your invoices for reference.</p>
                </div>
              </div>
            </div>

            {/* Company Name */}
            <div className="flex items-center gap-4">
              <Label className="w-40 text-right font-medium">Company Name</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Contact Phone */}
            <div className="space-y-1">
              <div className="flex items-center gap-4">
                <Label className="w-40 text-right font-medium">
                  Contact phone number<br />
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="ml-44 text-sm text-muted-foreground">We'll contact you only for support and account management purposes.</p>
            </div>

            {/* Address 1 */}
            <div className="flex items-center gap-4">
              <Label className="w-40 text-right font-medium">
                <span className="text-destructive">*</span> Address1
              </Label>
              <Input
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Address 2 */}
            <div className="flex items-center gap-4">
              <Label className="w-40 text-right font-medium">Address2</Label>
              <Input
                value={address2}
                onChange={(e) => setAddress2(e.target.value)}
                placeholder="Address line 2"
                className="flex-1"
              />
            </div>

            {/* City */}
            <div className="flex items-center gap-4">
              <Label className="w-40 text-right font-medium">
                <span className="text-destructive">*</span> City
              </Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* State */}
            <div className="flex items-center gap-4">
              <Label className="w-40 text-right font-medium">
                <span className="text-destructive">*</span> State
              </Label>
              <Input
                value={stateProvince}
                onChange={(e) => setStateProvince(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Zip */}
            <div className="flex items-center gap-4">
              <Label className="w-40 text-right font-medium">
                <span className="text-destructive">*</span> Zip
              </Label>
              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Country */}
            <div className="flex items-center gap-4">
              <Label className="w-40 text-right font-medium"></Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Lithuania">Lithuania</SelectItem>
                  <SelectItem value="Denmark">Denmark</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <Label className="w-40"></Label>
              <Button className="bg-destructive hover:bg-destructive/90">Save account details</Button>
            </div>
          </div>
        );

      case "payment":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Payment Method</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            <div className="border border-border rounded p-6 space-y-6">
              <p className="text-muted-foreground">
                No payment method configured. Add a payment method to manage your subscription.
              </p>

              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start gap-3 h-14" disabled>
                  <CreditCard className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Credit / Debit Card</p>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard, American Express</p>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start gap-3 h-14" disabled>
                  <Wallet className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Bank Transfer</p>
                    <p className="text-xs text-muted-foreground">Direct bank payment</p>
                  </div>
                </Button>

                <Button variant="outline" className="w-full justify-start gap-3 h-14" disabled>
                  <Receipt className="h-5 w-5" />
                  <div className="text-left">
                    <p className="font-medium">Invoice</p>
                    <p className="text-xs text-muted-foreground">Pay by invoice (enterprise only)</p>
                  </div>
                </Button>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Payment integration coming soon. Contact support for billing inquiries.
                </p>
              </div>
            </div>
          </div>
        );

      case "branding":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Custom Branding</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {!isOwner && (
              <div className="border border-border rounded p-6 bg-muted/20">
                <p className="text-muted-foreground">Only account owners can modify branding settings.</p>
              </div>
            )}

            {isOwner && (
              <div className="space-y-6">
                {/* Company & App Names */}
                <div className="border border-border rounded p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Company & Application Names</h2>
                  
                  <div className="flex items-center gap-4">
                    <Label className="w-40 text-right font-medium">Company Name</Label>
                    <Input
                      value={brandingCompanyName}
                      onChange={(e) => setBrandingCompanyName(e.target.value)}
                      placeholder="Your Company Name"
                      className="flex-1"
                    />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Label className="w-40 text-right font-medium">Application Name</Label>
                    <Input
                      value={brandingAppName}
                      onChange={(e) => setBrandingAppName(e.target.value)}
                      placeholder="CRM"
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Logo & Favicon */}
                <div className="border border-border rounded p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Logo & Favicon</h2>
                  
                  <div className="flex items-start gap-4">
                    <Label className="w-40 text-right font-medium pt-2">Logo</Label>
                    <div className="flex-1 space-y-2">
                      {brandingLogoUrl ? (
                        <div className="flex items-center gap-4">
                          <img src={brandingLogoUrl} alt="Logo" className="h-16 object-contain rounded border" />
                          <Button variant="outline" size="sm" onClick={() => setBrandingLogoUrl(null)}>
                            <X className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => logoInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" /> Upload Logo
                        </Button>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground">Recommended: PNG or SVG, at least 200x50 pixels</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <Label className="w-40 text-right font-medium pt-2">Favicon</Label>
                    <div className="flex-1 space-y-2">
                      {brandingFaviconUrl ? (
                        <div className="flex items-center gap-4">
                          <img src={brandingFaviconUrl} alt="Favicon" className="h-8 w-8 object-contain rounded border" />
                          <Button variant="outline" size="sm" onClick={() => setBrandingFaviconUrl(null)}>
                            <X className="h-4 w-4 mr-1" /> Remove
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" onClick={() => faviconInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" /> Upload Favicon
                        </Button>
                      )}
                      <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFaviconUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground">Recommended: ICO, PNG, or SVG, 32x32 pixels</p>
                    </div>
                  </div>
                </div>

                {/* Theme Colors */}
                <div className="border border-border rounded p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Theme Colors</h2>
                  
                  <div className="flex items-center gap-4">
                    <Label className="w-40 text-right font-medium">Primary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hslToHex(brandingPrimaryColor)}
                        onChange={(e) => setBrandingPrimaryColor(hexToHsl(e.target.value))}
                        className="h-10 w-16 rounded border cursor-pointer"
                      />
                      <div 
                        className="h-10 w-32 rounded border flex items-center justify-center text-sm"
                        style={{ backgroundColor: hslToHex(brandingPrimaryColor), color: '#fff' }}
                      >
                        Primary
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Label className="w-40 text-right font-medium">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hslToHex(brandingSecondaryColor)}
                        onChange={(e) => setBrandingSecondaryColor(hexToHsl(e.target.value))}
                        className="h-10 w-16 rounded border cursor-pointer"
                      />
                      <div 
                        className="h-10 w-32 rounded border flex items-center justify-center text-sm"
                        style={{ backgroundColor: hslToHex(brandingSecondaryColor), color: '#fff' }}
                      >
                        Secondary
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Label className="w-40 text-right font-medium">Accent Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hslToHex(brandingAccentColor)}
                        onChange={(e) => setBrandingAccentColor(hexToHsl(e.target.value))}
                        className="h-10 w-16 rounded border cursor-pointer"
                      />
                      <div 
                        className="h-10 w-32 rounded border flex items-center justify-center text-sm"
                        style={{ backgroundColor: hslToHex(brandingAccentColor) }}
                      >
                        Accent
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground ml-44">
                    Changes will apply across the entire application for all users.
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <Button 
                    onClick={handleSaveBranding} 
                    disabled={savingBranding}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {savingBranding ? "Saving..." : "Save Branding Settings"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case "seats":
        const totalSeatsNum = parseInt(seats) || 4;
        const availableSeats = Math.max(0, totalSeatsNum - usedSeats);
        const usedPercent = totalSeatsNum > 0 ? (usedSeats / totalSeatsNum) * 100 : 0;
        const availablePercent = totalSeatsNum > 0 ? (availableSeats / totalSeatsNum) * 100 : 0;
        
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Seats</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {renderAccountInfoCard()}

            <div className="text-center mb-6">
              <p className="text-xl">
                You currently have <span className="font-bold text-primary">{usedSeats}</span> users and <span className="font-bold text-primary">{availableSeats}</span> available seats.
              </p>
            </div>

            <div className="mb-6">
              <div className="flex rounded-md overflow-hidden h-8">
                {usedSeats > 0 && (
                  <div
                    className="bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium"
                    style={{ width: `${usedPercent}%` }}
                  >
                    {usedSeats} Used
                  </div>
                )}
                {availableSeats > 0 && (
                  <div
                    className="bg-green-600 flex items-center justify-center text-white text-sm font-medium"
                    style={{ width: `${availablePercent}%` }}
                  >
                    {availableSeats} Available
                  </div>
                )}
              </div>
            </div>

            <div className="border border-border rounded p-6 space-y-4">
              <p className="text-muted-foreground">
                Adjust your number of seats to enable inviting more users. Upon adjusting we will charge or credit your account accordingly.
              </p>
              <p className="text-sm">
                <span className="text-primary">If</span> you intend to remove seats you may want to delete some users from the{" "}
                <Link to="/manage/users" className="text-primary underline">user management section</Link> first.
              </p>

              <div className="flex items-center gap-4 pt-4">
                <Label>Seats</Label>
                <Input
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  className="w-20"
                  type="number"
                  min="1"
                />
                <Button onClick={handleSaveSeats} className="bg-destructive hover:bg-destructive/90">Submit</Button>
              </div>
            </div>
          </div>
        );

      case "subscription":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Subscription</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {renderAccountInfoCard()}

            <div className="space-y-4 text-sm text-muted-foreground">
              <p>You can upgrade your plan at any time, including upgrading from monthly to annually payment. Your account will be prorated the remainder of the current subscription before charging for the new one.</p>
              <p>If you want to downgrade, you will continue on the current plan for the remainder of the subscription period, and then the system will switch to the selected plan.</p>
              <p>Your current subscription period runs until <span className="text-primary underline">Saturday, 7 February 2026</span>.</p>
              <p>If you wish to change your plan, please do so below.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium text-primary mb-2">Available plans</h2>
              <div className="w-16 h-0.5 bg-primary mb-6" />

              <div className="grid grid-cols-3 gap-6">
                {/* Basic Plan */}
                <div className="border border-border rounded overflow-hidden">
                  <div className="bg-slate-600 text-white text-center py-4">
                    <h3 className="font-bold text-lg">BASIC</h3>
                    <p className="text-sm opacity-80">The Startup Suite</p>
                  </div>
                  <div className="p-6 text-center">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-green-600">€27</span>
                      <span className="text-sm text-muted-foreground"> per user per month</span>
                    </div>
                    <p className="text-sm text-green-600 mb-6">SAVE with Annual</p>
                    <ul className="text-sm space-y-3 text-left">
                      <li className="border-t pt-3">Premium support</li>
                      <li className="border-t pt-3">Duplicate detection</li>
                      <li className="border-t pt-3">Email integration</li>
                      <li className="border-t pt-3">Pipeline automation</li>
                      <li className="border-t pt-3">Power Dialer (rates apply)</li>
                      <li className="border-t pt-3">SMS integration</li>
                    </ul>
                    <Button className="mt-6 bg-destructive hover:bg-destructive/90 w-full">Choose Plan</Button>
                  </div>
                </div>

                {/* Plus Plan */}
                <div className="border-2 border-slate-600 rounded overflow-hidden">
                  <div className="bg-slate-600 text-white text-center py-4">
                    <h3 className="font-bold text-lg">PLUS</h3>
                    <p className="text-sm opacity-80">The Scaleup Suite</p>
                  </div>
                  <div className="p-6 text-center">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-green-600">€38</span>
                      <span className="text-sm text-muted-foreground"> per user per month</span>
                    </div>
                    <p className="text-sm text-green-600 mb-6">SAVE with Annual</p>
                    <p className="text-sm mb-4">Everything from Basic</p>
                    <ul className="text-sm space-y-3 text-left">
                      <li className="border-t pt-3">Bulk deduplication</li>
                      <li className="border-t pt-3">Campaign-wide CIDs</li>
                      <li className="border-t pt-3">Inbound calls</li>
                      <li className="border-t pt-3">Lead recycling</li>
                      <li className="border-t pt-3">Smart caller ID management</li>
                      <li className="border-t pt-3">Time tracking</li>
                    </ul>
                    <Button className="mt-6 bg-destructive hover:bg-destructive/90 w-full">Choose Plan</Button>
                  </div>
                </div>

                {/* Premium Plan */}
                <div className="border border-border rounded overflow-hidden">
                  <div className="bg-white text-slate-600 text-center py-4 border-b">
                    <h3 className="font-bold text-lg">PREMIUM</h3>
                    <p className="text-sm text-green-600">The Agency Suite</p>
                  </div>
                  <div className="p-6 text-center">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-green-600">€59</span>
                      <span className="text-sm text-muted-foreground"> per user per month</span>
                    </div>
                    <p className="text-sm text-green-600 mb-6">SAVE with Annual</p>
                    <p className="text-sm mb-4">Everything from Plus</p>
                    <ul className="text-sm space-y-3 text-left">
                      <li className="border-t pt-3">Callcenter tools</li>
                      <li className="border-t pt-3">Client silos/subaccounts</li>
                      <li className="border-t pt-3">Custom branding</li>
                      <li className="border-t pt-3">Live monitoring and training</li>
                      <li className="border-t pt-3">White-label add-on</li>
                    </ul>
                    <Button className="mt-6 bg-destructive hover:bg-destructive/90 w-full">Choose Plan</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add-ons */}
            <div>
              <h2 className="text-xl font-medium text-primary mb-2">Add-ons</h2>
              <div className="w-16 h-0.5 bg-primary mb-6" />

              <div className="max-w-md mx-auto">
                <div className="border border-border rounded overflow-hidden">
                  <div className="bg-slate-600 text-white text-center py-4">
                    <h3 className="font-bold text-lg">PRIORITY SUPPORT</h3>
                  </div>
                  <div className="p-6 text-center">
                    <div className="mb-4">
                      <span className="text-3xl font-bold text-green-600">€59</span>
                      <span className="text-sm text-muted-foreground"> per month</span>
                    </div>
                    <p className="text-sm mb-4">With Priority Support, you're our top priority</p>
                    <ul className="text-sm space-y-3 text-left">
                      <li className="border-t pt-3">Quick Resolutions: Speed up problem-solving</li>
                      <li className="border-t pt-3">Peace of Mind: Help is always a moment away</li>
                      <li className="border-t pt-3">Convenience at Your Fingertips: Enjoy hassle-free support</li>
                    </ul>
                    <Button className="mt-6 bg-green-600 hover:bg-green-700 w-full">Enable</Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cancel Subscription */}
            <div>
              <h2 className="text-xl font-medium text-primary italic mb-2">Cancel subscription</h2>
              <div className="w-16 h-0.5 bg-primary mb-4" />
              <p className="text-sm text-muted-foreground">
                If you wish to cancel your subscription, please{" "}
                <span className="text-primary underline cursor-pointer">do so here</span>.
              </p>
            </div>
          </div>
        );

      case "balance":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Balance</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {renderAccountInfoCard()}

            <div className="text-center mb-6">
              <p className="text-2xl">Your balance: <span className="text-primary">{accountInfo.accountBalance}</span></p>
            </div>

            <div className="space-y-4 text-sm text-muted-foreground">
              <p>We keep track of your account balance when you add or remove seats, make calls with Myphoner Voice etc.</p>
              <p>Adjust these settings so they fit your usage to make sure your agents can always make calls with Myphoner Voice.</p>
              <p>We recommend having a minimum balance of €5.00 per active agent at all times.</p>
            </div>

            <div>
              <h2 className="text-xl font-medium text-primary mb-2">When to top up your balance</h2>
              <div className="w-16 h-0.5 bg-primary mb-6" />

              <div className="border border-border rounded p-6 space-y-6">
                <p className="text-sm">
                  You <span className="font-bold">only</span> need to add credits to your balance if you are using Myphoner Voice.
                </p>
                <p className="text-sm">
                  If you are using Myphoner Voice, we recommend for your account to top up to <span className="font-bold">€40.00</span> when balance falls below <span className="font-bold">€20.00</span>.
                </p>

                <div className="space-y-4">
                  <div>
                    <Label>Top up to</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-muted-foreground">€</span>
                      <Input
                        value={topUpTo}
                        onChange={(e) => setTopUpTo(e.target.value)}
                        className="max-w-xs"
                        type="number"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>When balance falls below</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-muted-foreground">€</span>
                      <Input
                        value={balanceFallsBelow}
                        onChange={(e) => setBalanceFallsBelow(e.target.value)}
                        className="max-w-xs"
                        type="number"
                      />
                    </div>
                  </div>

                  <Button className="bg-destructive hover:bg-destructive/90">Save</Button>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-medium text-primary mb-2">How we calculated your balance</h2>
              <div className="w-16 h-0.5 bg-primary mb-6" />

              <div className="border border-border rounded overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Timestamp</th>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                      <th className="text-right p-3 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockBalanceHistory.map((item, idx) => (
                      <tr key={idx} className="border-t border-border">
                        <td className="p-3 text-sm">{item.timestamp}</td>
                        <td className="p-3 text-sm text-primary">{item.description}</td>
                        <td className="p-3 text-sm text-right">{item.amount}</td>
                        <td className="p-3 text-sm text-right">{item.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "invoices":
        return (
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light text-primary italic mb-2">Invoices</h1>
              <div className="w-16 h-0.5 bg-primary mb-8" />
            </div>

            {renderAccountInfoCard()}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">Show</span>
                <Select value={showEntries} onValueChange={setShowEntries}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm">entries</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">Search:</span>
                <Input
                  value={searchInvoices}
                  onChange={(e) => setSearchInvoices(e.target.value)}
                  className="w-48"
                />
              </div>
            </div>

            <div className="border border-border rounded overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Transaction ID</th>
                    <th className="text-right p-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {mockInvoices.map((invoice, idx) => (
                    <tr key={idx} className="border-t border-border">
                      <td className="p-3 text-sm text-primary">{invoice.date}</td>
                      <td className="p-3 text-sm">{invoice.amount}</td>
                      <td className="p-3 text-sm text-primary">{invoice.transactionId}</td>
                      <td className="p-3 text-sm text-right">
                        <span className="text-primary cursor-pointer hover:underline">View/print invoice</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Showing 1 to {mockInvoices.length} of {mockInvoices.length} entries</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">Previous</Button>
                <Button variant="default" size="sm" className="bg-destructive hover:bg-destructive/90">1</Button>
                <Button variant="outline" size="sm">Next</Button>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center text-muted-foreground py-12">
            <p>Select a section from the sidebar</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      {/* Sub Navigation */}
      <div className="border-b border-border bg-background">
        <div className="flex gap-6 px-6">
          {subNavItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                location.pathname === item.href
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Content with Sidebar */}
      <div className="flex min-h-[calc(100vh-120px)]">
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-background">
          <nav className="p-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded text-sm transition-colors ${
                  activeSection === item.id
                    ? "text-primary font-medium"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-5 h-5 ${activeSection === item.id ? "text-primary" : ""}`} />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={`w-4 h-4 ${activeSection === item.id ? "text-primary" : "text-muted-foreground"}`} />
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-4xl">
            {renderContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

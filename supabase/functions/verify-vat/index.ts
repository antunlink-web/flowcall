import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VatValidationResult {
  valid: boolean;
  countryCode: string;
  vatNumber: string;
  name?: string;
  address?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vatNumber } = await req.json();

    if (!vatNumber || typeof vatNumber !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "VAT number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean the VAT number - remove spaces and dashes
    const cleanVat = vatNumber.replace(/[\s-]/g, "").toUpperCase();

    // Extract country code (first 2 characters) and number
    const countryCode = cleanVat.slice(0, 2);
    const number = cleanVat.slice(2);

    // Validate format - must have country code and number
    if (!/^[A-Z]{2}/.test(cleanVat) || number.length < 2) {
      return new Response(
        JSON.stringify({
          valid: false,
          countryCode,
          vatNumber: number,
          error: "Invalid VAT number format. Use country code prefix (e.g., DK12345678)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // EU country codes that use VIES
    const euCountries = [
      "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES",
      "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT",
      "NL", "PL", "PT", "RO", "SE", "SI", "SK", "XI"
    ];

    if (!euCountries.includes(countryCode)) {
      // For non-EU countries, we can only validate format
      return new Response(
        JSON.stringify({
          valid: true,
          countryCode,
          vatNumber: number,
          name: "Non-EU VAT (format validated only)",
          address: "",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call EU VIES SOAP service
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns1="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soap:Body>
    <tns1:checkVat>
      <tns1:countryCode>${countryCode}</tns1:countryCode>
      <tns1:vatNumber>${number}</tns1:vatNumber>
    </tns1:checkVat>
  </soap:Body>
</soap:Envelope>`;

    const response = await fetch("https://ec.europa.eu/taxation_customs/vies/services/checkVatService", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        "SOAPAction": "",
      },
      body: soapRequest,
    });

    const xmlResponse = await response.text();

    // Parse the SOAP response
    const validMatch = xmlResponse.match(/<valid>(\w+)<\/valid>/);
    const nameMatch = xmlResponse.match(/<name>([^<]*)<\/name>/);
    const addressMatch = xmlResponse.match(/<address>([^<]*)<\/address>/);

    const isValid = validMatch ? validMatch[1].toLowerCase() === "true" : false;
    const name = nameMatch ? nameMatch[1].trim() : undefined;
    const address = addressMatch ? addressMatch[1].trim().replace(/\n/g, ", ") : undefined;

    const result: VatValidationResult = {
      valid: isValid,
      countryCode,
      vatNumber: number,
      name: name || undefined,
      address: address || undefined,
    };

    if (!isValid) {
      result.error = "VAT number not found in VIES database";
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("VAT verification error:", error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: "Failed to verify VAT number. Please try again later.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

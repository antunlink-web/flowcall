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

    // Call EU VIES SOAP service with updated endpoint
    const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:checkVat>
      <urn:countryCode>${countryCode}</urn:countryCode>
      <urn:vatNumber>${number}</urn:vatNumber>
    </urn:checkVat>
  </soapenv:Body>
</soapenv:Envelope>`;

    console.log("Calling VIES for:", countryCode, number);

    const response = await fetch("https://ec.europa.eu/taxation_customs/vies/services/checkVatService", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        "SOAPAction": "",
      },
      body: soapRequest,
    });

    const xmlResponse = await response.text();
    console.log("VIES Response:", xmlResponse.substring(0, 500));

    // Parse the SOAP response - handle different namespace prefixes
    const validMatch = xmlResponse.match(/<(?:ns2:|tns1:)?valid>(\w+)<\/(?:ns2:|tns1:)?valid>/i);
    const nameMatch = xmlResponse.match(/<(?:ns2:|tns1:)?name>([^<]*)<\/(?:ns2:|tns1:)?name>/i);
    const addressMatch = xmlResponse.match(/<(?:ns2:|tns1:)?address>([^<]*)<\/(?:ns2:|tns1:)?address>/i);

    // Check for SOAP fault
    const faultMatch = xmlResponse.match(/<faultstring>([^<]*)<\/faultstring>/i);
    if (faultMatch) {
      console.log("VIES Fault:", faultMatch[1]);
      return new Response(
        JSON.stringify({
          valid: false,
          countryCode,
          vatNumber: number,
          error: `VIES service error: ${faultMatch[1]}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isValid = validMatch ? validMatch[1].toLowerCase() === "true" : false;
    const name = nameMatch ? nameMatch[1].trim() : undefined;
    const address = addressMatch ? addressMatch[1].trim().replace(/\n/g, ", ") : undefined;

    console.log("Parsed result:", { isValid, name, address });

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

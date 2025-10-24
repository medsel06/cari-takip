// Uyumsoft e-Fatura API Client - Basitleştirilmiş
import { Invoice, InvoiceItem, Customer } from '@/lib/types';

interface UyumsoftConfig {
  username: string;
  password: string;
  baseUrl: string;
  isTest: boolean;
}

export class UyumsoftAPI {
  private config: UyumsoftConfig;

  constructor(config: UyumsoftConfig) {
    this.config = config;
  }

  // Test bağlantısı - WhoAmI metodu
  async testConnection(): Promise<any> {
    try {
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Header>
    <wsse:Security soap:mustUnderstand="1"
      xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${this.config.username}</wsse:Username>
        <wsse:Password>${this.config.password}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <WhoAmI xmlns="http://tempuri.org/">
      <userInformation>
        <UserName>${this.config.username}</UserName>
        <Password>${this.config.password}</Password>
      </userInformation>
    </WhoAmI>
  </soap:Body>
</soap:Envelope>`;

      console.log('WhoAmI Request:', soapEnvelope);

      const response = await fetch('/api/uyumsoft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'WhoAmI',
          data: { envelope: soapEnvelope }
        }),
      });

      const result = await response.json();
      console.log('WhoAmI Response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.response || 'API error');
      }

      return result.response;
    } catch (error) {
      console.error('WhoAmI Error:', error);
      throw error;
    }
  }

  // e-Fatura gönderme - BasicIntegration için
  async sendInvoice(invoice: Invoice, items: InvoiceItem[], customer: Customer): Promise<any> {
    try {
      // UBL XML formatında fatura oluştur - XML declaration'sız
      const invoiceXML = this.createSimpleInvoiceXML(invoice, items, customer);
      const cleanInvoiceXML = invoiceXML.replace(/^\s*<\?xml[^>]*\?>\s*/i, '').trim();
      
      console.log('Username:', this.config.username);
      console.log('Password:', this.config.password);
      console.log('Clean Invoice XML (first 200 chars):', cleanInvoiceXML.substring(0, 200));
      
      // BasicIntegration için SOAP Envelope - WS-Security ile
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <soap:Header>
    <wsse:Security soap:mustUnderstand="1"
      xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <wsse:UsernameToken>
        <wsse:Username>${this.config.username}</wsse:Username>
        <wsse:Password>${this.config.password}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <SaveAsDraft xmlns="http://tempuri.org/">
      <userInformation>
        <UserName>${this.config.username}</UserName>
        <Password>${this.config.password}</Password>
      </userInformation>
      <invoices>
        <InvoiceInfo>
          <LocalDocumentId>INV-${Date.now()}</LocalDocumentId>
          <Invoice>${cleanInvoiceXML}</Invoice>
        </InvoiceInfo>
      </invoices>
    </SaveAsDraft>
  </soap:Body>
</soap:Envelope>`;

      console.log('SOAP Request:', soapEnvelope);

      // API route üzerinden istek gönder
      const response = await fetch('/api/uyumsoft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'SaveAsDraft',
          data: { envelope: soapEnvelope }
        }),
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.response || 'API error');
      }

      // SOAP yanıtını parse et
      return this.parseSoapResponse(result.response);
    } catch (error) {
      console.error('Uyumsoft SOAP API Error:', error);
      throw error;
    }
  }

  // Basitleştirilmiş fatura XML'i
  private createSimpleInvoiceXML(invoice: Invoice, items: InvoiceItem[], customer: Customer): string {
    const issueDate = new Date(invoice.invoice_date).toISOString().split('T')[0];
    
    // Toplam hesaplama
    let lineTotal = 0;
    let taxTotal = 0;
    
    const itemsXML = items.map((item, index) => {
      const itemLineTotal = item.quantity * item.unit_price;
      const itemTaxAmount = itemLineTotal * (item.tax_rate / 100);
      lineTotal += itemLineTotal;
      taxTotal += itemTaxAmount;
      
      return `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.unit}">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="TRY">${itemLineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${item.product_name}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="TRY">${item.unit_price.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
    }).join('');

    const grandTotal = lineTotal + taxTotal;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>TICARIFATURA</cbc:ProfileID>
  <cbc:ID>${invoice.invoice_no}</cbc:ID>
  <cbc:UUID>${this.generateUUID()}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>SATIS</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${items.length}</cbc:LineCountNumeric>
  
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">1111111111</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>Test Satıcı A.Ş.</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Test Mah. Test Cad. No:1</cbc:StreetName>
        <cbc:CitySubdivisionName>Kadıköy</cbc:CitySubdivisionName>
        <cbc:CityName>İstanbul</cbc:CityName>
        <cac:Country>
          <cbc:Name>Türkiye</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme>
          <cbc:Name>Kadıköy VD</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${customer.tax_number || '1234567890'}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${customer.name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${customer.address || 'Test Adres'}</cbc:StreetName>
        <cbc:CitySubdivisionName>${customer.district || 'Test İlçe'}</cbc:CitySubdivisionName>
        <cbc:CityName>${customer.city || 'Test İl'}</cbc:CityName>
        <cac:Country>
          <cbc:Name>Türkiye</cbc:Name>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme>
          <cbc:Name>${customer.tax_office || 'Test VD'}</cbc:Name>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${taxTotal.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="TRY">${lineTotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="TRY">${taxTotal.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cac:TaxScheme>
          <cbc:Name>KDV</cbc:Name>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${lineTotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${grandTotal.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="TRY">${grandTotal.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${itemsXML}
</Invoice>`;
  }

  // Fatura durumu sorgulama
  async getInvoiceStatus(uuid: string): Promise<any> {
    try {
      // Test ortamında BasicIntegration kullan
      const isTest = this.config.isTest;
      
      const soapEnvelope = isTest ? 
        // BasicIntegration için
        `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetInvoiceView xmlns="http://tempuri.org/">
      <userInformation>
        <Username>${this.config.username}</Username>
        <Password>${this.config.password}</Password>
      </userInformation>
      <UUID>${uuid}</UUID>
    </GetInvoiceView>
  </soap:Body>
</soap:Envelope>` :
        // Integration için (canlı ortam)
        `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:u="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">
  <s:Header>
    <o:Security s:mustUnderstand="1" xmlns:o="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
      <o:UsernameToken u:Id="uuid-${this.generateUUID()}">
        <o:Username>${this.config.username}</o:Username>
        <o:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText">${this.config.password}</o:Password>
      </o:UsernameToken>
    </o:Security>
  </s:Header>
  <s:Body>
    <GetInvoiceStatus xmlns="http://tempuri.org/">
      <uuid>${uuid}</uuid>
    </GetInvoiceStatus>
  </s:Body>
</s:Envelope>`;

      const response = await fetch('/api/uyumsoft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isTest ? 'GetInvoiceView' : 'GetInvoiceStatus',
          data: { envelope: soapEnvelope }
        }),
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'API error');
      }

      return this.parseSoapResponse(result.response);
    } catch (error) {
      console.error('Uyumsoft SOAP API Error:', error);
      throw error;
    }
  }

  // UUID oluşturma
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // SOAP yanıtını parse etme
  private parseSoapResponse(xmlResponse: string): any {
    try {
      console.log('Parsing SOAP Response:', xmlResponse);
      
      // Boş veya undefined kontrolü
      if (!xmlResponse) {
        return {
          success: false,
          error: 'Empty response',
          fullResponse: xmlResponse
        };
      }
      
      // IsSucceded değerini kontrol et
      const isSucceededMatch = xmlResponse.match(/IsSucceded="([^"]+)"/i);
      const messageMatch = xmlResponse.match(/Message="([^"]+)"/i);
      const uuidMatch = xmlResponse.match(/UUID="([^"]+)"/i);
      const invoiceIdMatch = xmlResponse.match(/Id="([^"]+)"/i);
      
      if (isSucceededMatch && isSucceededMatch[1] === 'true') {
        return {
          success: true,
          uuid: uuidMatch ? uuidMatch[1] : null,
          invoiceId: invoiceIdMatch ? invoiceIdMatch[1] : null,
          message: messageMatch ? messageMatch[1] : 'Success'
        };
      } else {
        return {
          success: false,
          error: messageMatch ? messageMatch[1] : 'Unknown error',
          fullResponse: xmlResponse
        };
      }
    } catch (error) {
      console.error('SOAP Response Parse Error:', error);
      return {
        success: false,
        error: 'Parse error',
        fullResponse: xmlResponse
      };
    }
  }
}

// API instance oluşturma
export const createUyumsoftClient = () => {
  const baseUrl = process.env.NEXT_PUBLIC_UYUMSOFT_BASE_URL || 'https://efatura-test.uyumsoft.com.tr';
  const isTest = process.env.NEXT_PUBLIC_UYUMSOFT_TEST_MODE === 'true';

  // Test için varsayılan değerler
  const username = process.env.NEXT_PUBLIC_UYUMSOFT_USERNAME || 'Uyumsoft';
  const password = process.env.NEXT_PUBLIC_UYUMSOFT_PASSWORD || 'Uyumsoft';

  console.log('Uyumsoft Client Config:', {
    username,
    baseUrl,
    isTest
  });

  return new UyumsoftAPI({
    username,
    password,
    baseUrl: isTest ? baseUrl : 'https://efatura.uyumsoft.com.tr',
    isTest,
  });
};
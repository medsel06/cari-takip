import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ message: 'Uyumsoft API route is working!' })
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()
    
    // Uyumsoft endpoint - BasicIntegration kullan
    const isTest = process.env.NEXT_PUBLIC_UYUMSOFT_TEST_MODE !== 'false'
    // Test ortamında HTTP kullan
    const baseUrl = isTest 
      ? 'http://efatura-test.uyumsoft.com.tr'
      : (process.env.NEXT_PUBLIC_UYUMSOFT_BASE_URL || 'https://efatura.uyumsoft.com.tr')
    
    // Test ortamında BasicIntegration, canlıda Integration kullan
    const servicePath = isTest ? '/Services/BasicIntegration' : '/Services/Integration'
    const endpoint = `${baseUrl}${servicePath}`
    
    // WSDL kontrolü için log
    console.log('WSDL URL:', `${endpoint}?wsdl`)
    console.log('API Route - Endpoint:', endpoint)
    console.log('API Route - Action:', action)
    console.log('Is Test Mode:', isTest)
    
    // SOAP envelope'ı al
    let soapEnvelope = ''
    let soapAction = ''
    
    switch (action) {
      case 'SendInvoice':
        soapAction = 'http://tempuri.org/IIntegration/SendInvoice'
        soapEnvelope = data.envelope
        break
      case 'SendInvoiceWithUserInfo':
        soapAction = 'http://tempuri.org/IBasicIntegration/SendInvoiceWithUserInfo'
        soapEnvelope = data.envelope
        break
      case 'GetUserList':
        soapAction = 'http://tempuri.org/IBasicIntegration/GetUserList'
        soapEnvelope = data.envelope
        break
      case 'SaveAsDraft':
        soapAction = 'http://tempuri.org/IBasicIntegration/SaveAsDraft'
        soapEnvelope = data.envelope
        break
      case 'WhoAmI':
        soapAction = 'http://tempuri.org/IBasicIntegration/WhoAmI'
        soapEnvelope = data.envelope
        break
      case 'GetInvoiceStatus':
        soapAction = 'http://tempuri.org/IIntegration/GetInvoiceStatus'
        soapEnvelope = data.envelope
        break
      case 'GetInvoiceView':
        soapAction = 'http://tempuri.org/IBasicIntegration/GetInvoiceView'
        soapEnvelope = data.envelope
        break
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
    // Uyumsoft'a istek gönder
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `"${soapAction}"`,
      },
      body: soapEnvelope,
    })
    
    const responseText = await response.text()
    
    // Debug için logla
    console.log('Uyumsoft Response Status:', response.status)
    console.log('Uyumsoft Response:', responseText)
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: 'Uyumsoft API error',
          status: response.status,
          response: responseText
        },
        { status: response.status }
      )
    }
    
    return NextResponse.json({ 
      success: true,
      response: responseText 
    })
    
  } catch (error: any) {
    console.error('API Route Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
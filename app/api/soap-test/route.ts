export async function POST(request: Request) {
  console.log('SOAP test endpoint called')
  
  try {
    const data = await request.json()
    
    return Response.json({ 
      success: true, 
      message: 'SOAP test endpoint works!',
      data: data
    })
  } catch (error) {
    return Response.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
#!/usr/bin/env tsx

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.QDE_API_PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Mock Data
const mockCompanies = [
  { value: "1001", text: "ABC Trading Company" },
  { value: "1002", text: "XYZ Logistics Inc" },
  { value: "1003", text: "Global Petroleum Corp" },
  { value: "1004", text: "Energy Solutions LLC" },
  { value: "1005", text: "Alliance Energy Partners" },
  { value: "1006", text: "Metro Oil & Gas" },
  { value: "1007", text: "Coastal Refining Co" },
  { value: "1008", text: "Midwest Energy Trading" },
  { value: "1009", text: "Pacific Fuel Distribution" },
  { value: "1010", text: "Continental Energy Corp" }
];

const mockOriginLocations = [
  { value: "100", text: "Houston Terminal" },
  { value: "101", text: "Dallas Hub" },
  { value: "102", text: "San Antonio Depot" },
  { value: "103", text: "Austin Facility" },
  { value: "104", text: "Fort Worth Station" },
  { value: "105", text: "Corpus Christi Port" },
  { value: "106", text: "Beaumont Refinery" },
  { value: "107", text: "Tyler Distribution" },
  { value: "108", text: "Amarillo Terminal" },
  { value: "109", text: "El Paso Hub" }
];

const mockDestinationLocations = [
  { value: "200", text: "Oklahoma City Terminal" },
  { value: "201", text: "Tulsa Distribution Center" },
  { value: "202", text: "Little Rock Hub" },
  { value: "203", text: "Kansas City Depot" },
  { value: "204", text: "New Orleans Port" },
  { value: "205", text: "Memphis Junction" },
  { value: "206", text: "Birmingham Terminal" },
  { value: "207", text: "Nashville Distribution" },
  { value: "208", text: "Atlanta Hub" },
  { value: "209", text: "Jacksonville Port" }
];

const mockFrequencies = [
  { value: "1", text: "Daily" },
  { value: "2", text: "Weekly" },
  { value: "3", text: "Bi-Weekly" },
  { value: "4", text: "Monthly" },
  { value: "5", text: "Quarterly" },
  { value: "6", text: "Semi-Annual" },
  { value: "7", text: "Annual" }
];

const mockPriceComponents = {
  "123": {
    id: "123",
    name: "Gasoline Regular Unleaded",
    basePrice: 2.85,
    currency: "USD",
    unit: "gallon",
    components: [
      { name: "Base Price", value: 2.45 },
      { name: "Transportation", value: 0.15 },
      { name: "Storage", value: 0.10 },
      { name: "Handling", value: 0.08 },
      { name: "Margin", value: 0.07 }
    ]
  },
  "124": {
    id: "124", 
    name: "Diesel Fuel",
    basePrice: 3.12,
    currency: "USD",
    unit: "gallon",
    components: [
      { name: "Base Price", value: 2.68 },
      { name: "Transportation", value: 0.18 },
      { name: "Storage", value: 0.12 },
      { name: "Handling", value: 0.09 },
      { name: "Margin", value: 0.05 }
    ]
  }
};

const mockPricePublishers = [
  { value: "1", text: "OPIS (Oil Price Information Service)" },
  { value: "2", text: "Platts" },
  { value: "3", text: "Argus Media" },
  { value: "4", text: "Bloomberg" },
  { value: "5", text: "Reuters" }
];

const mockOpisPrice = {
  locationId: 100,
  productId: 5,
  averagePrice: 2.847,
  currency: "USD",
  unit: "gallon",
  fromDate: "2024-01-15",
  toDate: "2024-01-15",
  dataPoints: 15,
  priceRange: {
    min: 2.810,
    max: 2.885,
    stdDev: 0.023
  }
};

const mockIndexPriceTypes = [
  { value: "1", text: "Daily Average" },
  { value: "2", text: "Weekly Average" },
  { value: "3", text: "Monthly Average" },
  { value: "4", text: "Spot Price" },
  { value: "5", text: "Contract Price" }
];

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// 1. GET /api/fake/tradeentry/externalcompanies
app.get('/api/fake/tradeentry/externalcompanies', (req, res) => {
  const { getByPrimaryMarketer } = req.query;
  
  let companies = [...mockCompanies];
  
  if (getByPrimaryMarketer === 'true') {
    // Filter to primary marketers only
    companies = companies.filter(c => 
      ['1001', '1003', '1005', '1007'].includes(c.value)
    );
  }
  
  res.json(companies);
});

// 2. GET /api/fake/tradeentry/customoriginlocations
app.get('/api/fake/tradeentry/customoriginlocations', (req, res) => {
  const { showFiltered } = req.query;
  
  let locations = [...mockOriginLocations];
  
  if (showFiltered === 'false') {
    // Remove filtered locations (simulate business logic)
    locations = locations.filter(l => !['108', '109'].includes(l.value));
  }
  
  res.json(locations);
});

// 3. GET /api/fake/tradeentry/customdestinationlocations
app.get('/api/fake/tradeentry/customdestinationlocations', (req, res) => {
  const { showFiltered } = req.query;
  
  let locations = [...mockDestinationLocations];
  
  if (showFiltered === 'false') {
    // Remove filtered locations
    locations = locations.filter(l => !['208', '209'].includes(l.value));
  }
  
  res.json(locations);
});

// 4. GET /api/fake/tradeentry/customfrequencyvalues
app.get('/api/fake/tradeentry/customfrequencyvalues', (req, res) => {
  res.json(mockFrequencies);
});

// 5. GET /api/fake/tradeentry/pricecomponents/:id
app.get('/api/fake/tradeentry/pricecomponents/:id', (req, res) => {
  const { id } = req.params;
  const component = mockPriceComponents[id as keyof typeof mockPriceComponents];
  
  if (!component) {
    return res.status(404).json({ 
      error: 'Price component not found', 
      id 
    });
  }
  
  res.json(component);
});

// 6. GET /api/fake/tradeentry/pricepublishers
app.get('/api/fake/tradeentry/pricepublishers', (req, res) => {
  const { priceType } = req.query;
  
  let publishers = [...mockPricePublishers];
  
  if (priceType) {
    // Filter publishers by price type (simulate business logic)
    publishers = publishers.slice(0, 3);
  }
  
  res.json(publishers);
});

// 7. GET /api/fake/tradeentry/previousaverageopisprice
app.get('/api/fake/tradeentry/previousaverageopisprice', (req, res) => {
  const { locationId, productId, fromDateString } = req.query;
  
  if (!locationId || !productId || !fromDateString) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['locationId', 'productId', 'fromDateString']
    });
  }
  
  // Generate realistic price based on location and product
  const basePrice = 2.85;
  const locationMultiplier = (parseInt(locationId as string) % 10) * 0.05;
  const productMultiplier = (parseInt(productId as string) % 5) * 0.10;
  
  const adjustedPrice = basePrice + locationMultiplier + productMultiplier;
  
  const response = {
    ...mockOpisPrice,
    locationId: parseInt(locationId as string),
    productId: parseInt(productId as string),
    averagePrice: Math.round(adjustedPrice * 1000) / 1000,
    fromDate: fromDateString
  };
  
  res.json(response);
});

// 8. GET /api/fake/tradeentry/customindexpricetypes
app.get('/api/fake/tradeentry/customindexpricetypes', (req, res) => {
  const { pricePublisherId } = req.query;
  
  let priceTypes = [...mockIndexPriceTypes];
  
  if (pricePublisherId) {
    // Different publishers support different price types
    const publisherId = parseInt(pricePublisherId as string);
    if (publisherId > 3) {
      priceTypes = priceTypes.slice(0, 3); // Limited options
    }
  }
  
  res.json(priceTypes);
});

// 9. GET /api/fake/tradeentry/bookfromlocation/:id
app.get('/api/fake/tradeentry/bookfromlocation/:id', (req, res) => {
  const { id } = req.params;
  const locationId = parseInt(id);
  
  // Find location details
  const location = mockOriginLocations.find(l => l.value === id) ||
                   mockDestinationLocations.find(l => l.value === id);
  
  if (!location) {
    return res.status(404).json({
      error: 'Location not found',
      locationId: id
    });
  }
  
  const response = {
    locationId,
    locationName: location.text,
    bookingDetails: {
      availableCapacity: Math.floor(Math.random() * 50000) + 10000,
      currentBookings: Math.floor(Math.random() * 30000) + 5000,
      reservationFee: Math.round((locationId % 10) * 0.05 * 1000) / 1000,
      minimumQuantity: 1000,
      maximumQuantity: 75000
    },
    operatingHours: {
      weekdays: "06:00-22:00",
      weekends: "08:00-18:00"
    }
  };
  
  res.json(response);
});

// 10. POST /api/fake/tradeentry/locationdiffpricedefault
app.post('/api/fake/tradeentry/locationdiffpricedefault', (req, res) => {
  const { locationId, productId, quantities } = req.body;
  
  if (!locationId || !productId || !quantities) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['locationId', 'productId', 'quantities']
    });
  }
  
  // Calculate differential pricing based on location and quantities
  const baseDifferential = (locationId % 10) * 0.02;
  
  const results = quantities.map((qty: number) => {
    const volumeDiscount = qty > 10000 ? 0.05 : qty > 5000 ? 0.03 : 0;
    const finalDifferential = Math.round((baseDifferential - volumeDiscount) * 1000) / 1000;
    
    return {
      quantity: qty,
      differential: finalDifferential,
      adjustedPrice: Math.round((2.85 + finalDifferential) * 1000) / 1000
    };
  });
  
  res.json({
    locationId,
    productId,
    baseDifferential,
    calculations: results
  });
});

// 11. POST /api/fake/tradeentry/basepricedefault
app.post('/api/fake/tradeentry/basepricedefault', (req, res) => {
  const { priceDictionary, frequencyType, quantities } = req.body;
  
  if (!priceDictionary || !frequencyType || !quantities) {
    return res.status(400).json({
      error: 'Missing required parameters',
      required: ['priceDictionary', 'frequencyType', 'quantities']
    });
  }
  
  const basePrice = priceDictionary.base || 2.85;
  const premium = priceDictionary.premium || 0.10;
  
  // Frequency adjustments
  const frequencyMultipliers: Record<string, number> = {
    'Daily': 0.02,
    'Weekly': 0.01,
    'Monthly': 0.00,
    'Quarterly': -0.01,
    'Annual': -0.02
  };
  
  const frequencyAdjustment = frequencyMultipliers[frequencyType] || 0;
  
  const results = quantities.map((qty: number) => {
    const volumeDiscount = qty > 10000 ? 0.08 : qty > 5000 ? 0.05 : qty > 2000 ? 0.03 : 0;
    const finalPrice = basePrice + premium + frequencyAdjustment - volumeDiscount;
    
    return {
      quantity: qty,
      basePrice,
      premium,
      frequencyAdjustment,
      volumeDiscount,
      finalPrice: Math.round(finalPrice * 1000) / 1000
    };
  });
  
  res.json({
    frequencyType,
    pricingBreakdown: results,
    summary: {
      basePrice,
      premium,
      frequencyAdjustment,
      priceRange: {
        min: Math.min(...results.map(r => r.finalPrice)),
        max: Math.max(...results.map(r => r.finalPrice))
      }
    }
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /api/fake/tradeentry/externalcompanies',
      'GET /api/fake/tradeentry/customoriginlocations',
      'GET /api/fake/tradeentry/customdestinationlocations',
      'GET /api/fake/tradeentry/customfrequencyvalues',
      'GET /api/fake/tradeentry/pricecomponents/:id',
      'GET /api/fake/tradeentry/pricepublishers',
      'GET /api/fake/tradeentry/previousaverageopisprice',
      'GET /api/fake/tradeentry/customindexpricetypes',
      'GET /api/fake/tradeentry/bookfromlocation/:id',
      'POST /api/fake/tradeentry/locationdiffpricedefault',
      'POST /api/fake/tradeentry/basepricedefault'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 QDE Mock API Server Started');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🧪 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 Available endpoints: 11 QDE trade entry endpoints`);
  console.log('=====================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 QDE Mock API Server shutting down...');
  process.exit(0);
});

export { app };
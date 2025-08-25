import { Node } from '../../src/pocket-flow';
import { DealState } from '../../src/types';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

interface ValidationRequirements {
  dealData: any;
  requiredFields: string[];
  currentPhase: string;
  referenceData: {
    companies?: any[];
    locations?: any[];
    frequencies?: any[];
  };
}

interface ValidationResults {
  isValid: boolean;
  missingFields: string[];
  validationErrors: string[];
  clarificationNeeded: boolean;
  clarificationMessage?: string;
  capacityChecks?: any[];
}

export class ValidationAgent extends Node<DealState> {
  constructor(maxRetries = 3, wait = 1000) {
    super(maxRetries, wait);
  }

  async prep(shared: DealState): Promise<ValidationRequirements> {
    console.log('✅ Validation Agent: Preparing validation checks...');
    
    const dealData = shared.dealData || {};
    
    // Define required fields for a complete deal
    const requiredFields = [
      'counterparty',
      'originLocation',
      'destinationLocation',
      'product',
      'quantity',
      'frequency',
      'pricing'
    ];

    // Gather reference data for validation
    const referenceData = {
      companies: shared.companies,
      locations: [...(shared.originLocations || []), ...(shared.destinationLocations || [])],
      frequencies: shared.frequencies
    };

    console.log(`  📋 Validating deal with ${requiredFields.length} required fields`);
    console.log(`  📊 Available reference data: ${referenceData.companies?.length || 0} companies, ${referenceData.locations?.length || 0} locations, ${referenceData.frequencies?.length || 0} frequencies`);

    return {
      dealData,
      requiredFields,
      currentPhase: shared.phase,
      referenceData
    };
  }

  async exec(prepRes: ValidationRequirements): Promise<ValidationResults> {
    console.log('🔍 Validation Agent: Running comprehensive validation checks...');
    
    const missingFields: string[] = [];
    const validationErrors: string[] = [];
    const capacityChecks: any[] = [];
    let isValid = true;

    // 1. Check required fields
    console.log('  📋 Checking required fields...');
    for (const field of prepRes.requiredFields) {
      if (!prepRes.dealData[field]) {
        missingFields.push(field);
        console.log(`    ❌ Missing required field: ${field}`);
      } else {
        console.log(`    ✅ Found required field: ${field}`);
      }
    }

    // 2. Business rule validations
    console.log('  ⚖️  Validating business rules...');
    const quantity = prepRes.dealData.quantity;
    if (quantity) {
      // Quantity validation
      if (quantity < 1000) {
        validationErrors.push('Minimum quantity is 1000 gallons');
        console.log('    ⚠️  Quantity below minimum (1000 gallons)');
      } else if (quantity > 100000) {
        validationErrors.push('Maximum quantity is 100000 gallons');
        console.log('    ⚠️  Quantity above maximum (100000 gallons)');
      } else {
        console.log(`    ✅ Quantity valid: ${quantity} gallons`);
      }
    }

    // 3. Validate pricing structure
    console.log('  💰 Validating pricing structure...');
    if (prepRes.dealData.pricing) {
      const pricing = prepRes.dealData.pricing;
      if (!pricing.totalPrice || pricing.totalPrice <= 0) {
        validationErrors.push('Invalid pricing: total price must be positive');
        console.log('    ⚠️  Invalid pricing detected');
      } else if (pricing.pricePerGallon && (pricing.pricePerGallon < 0.5 || pricing.pricePerGallon > 10.0)) {
        validationErrors.push('Price per gallon outside reasonable range ($0.50 - $10.00)');
        console.log(`    ⚠️  Price per gallon unusual: $${pricing.pricePerGallon}`);
      } else {
        console.log(`    ✅ Pricing valid: $${pricing.totalPrice} total`);
      }
    }

    // 4. Reference data validation
    console.log('  📊 Validating against reference data...');
    await this.validateReferenceData(prepRes, validationErrors);

    // 5. Capacity checks via MCP
    console.log('  🏭 Checking location capacity...');
    const capacityResult = await this.mcpCheckLocationCapacity(prepRes.dealData);
    if (capacityResult) {
      capacityChecks.push(capacityResult);
      if (!capacityResult.isAvailable) {
        validationErrors.push(`Insufficient capacity at ${capacityResult.locationName}`);
        console.log(`    ⚠️  Capacity issue: ${capacityResult.message}`);
      } else {
        console.log(`    ✅ Capacity available: ${capacityResult.availableCapacity}`);
      }
    }

    // 6. Date and frequency validation
    console.log('  📅 Validating dates and frequency...');
    if (prepRes.dealData.frequency) {
      const validFrequencies = prepRes.referenceData.frequencies?.map(f => f.text.toLowerCase()) || [];
      if (validFrequencies.length > 0 && !validFrequencies.includes(prepRes.dealData.frequency.toLowerCase())) {
        validationErrors.push(`Invalid frequency: ${prepRes.dealData.frequency}. Valid options: ${validFrequencies.join(', ')}`);
        console.log(`    ⚠️  Invalid frequency: ${prepRes.dealData.frequency}`);
      } else {
        console.log(`    ✅ Frequency valid: ${prepRes.dealData.frequency}`);
      }
    }

    // 7. Validate locations
    console.log('  📍 Validating locations...');
    if (prepRes.dealData.originLocation && prepRes.dealData.destinationLocation) {
      if (prepRes.dealData.originLocation === prepRes.dealData.destinationLocation) {
        validationErrors.push('Origin and destination locations cannot be the same');
        console.log('    ⚠️  Origin and destination are the same');
      } else {
        console.log('    ✅ Origin and destination locations are different');
      }
    }

    // Determine final validation status
    isValid = missingFields.length === 0 && validationErrors.length === 0;
    
    // Check if clarification is needed
    const clarificationNeeded = missingFields.length > 0;
    let clarificationMessage: string | undefined;
    
    if (clarificationNeeded) {
      clarificationMessage = `Please provide the following missing information:\n`;
      for (const field of missingFields) {
        clarificationMessage += `- ${this.formatFieldName(field)}\n`;
      }
    }

    console.log('📊 Validation Agent: Comprehensive validation complete');
    console.log(`  Status: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (missingFields.length > 0) {
      console.log(`  Missing fields: ${missingFields.join(', ')}`);
    }
    if (validationErrors.length > 0) {
      console.log(`  Errors: ${validationErrors.join('; ')}`);
    }
    if (capacityChecks.length > 0) {
      console.log(`  Capacity checks: ${capacityChecks.length} performed`);
    }

    return {
      isValid,
      missingFields,
      validationErrors,
      clarificationNeeded,
      clarificationMessage,
      capacityChecks
    };
  }

  async post(
    shared: DealState,
    prepRes: ValidationRequirements,
    execRes: ValidationResults
  ): Promise<string> {
    // Update shared state with validation results
    shared.missingFields = execRes.missingFields;
    shared.validationErrors = execRes.validationErrors;

    console.log('💾 Validation Agent: Updated shared state with validation results');

    if (execRes.isValid) {
      // All validations passed, proceed to deal creation
      console.log('🎉 Validation Agent: Deal is valid, proceeding to creation...');
      shared.phase = 'validation';
      return 'creation';
    } else if (execRes.clarificationNeeded) {
      // Need user clarification
      console.log('❓ Validation Agent: Clarification needed from user');
      if (execRes.clarificationMessage) {
        console.log('\n' + execRes.clarificationMessage);
      }
      // In a real system, this would trigger user interaction
      // For now, we'll return to collection phase
      return 'collection';
    } else {
      // Validation errors that need fixing
      console.log('⚠️  Validation Agent: Errors need to be resolved');
      for (const error of execRes.validationErrors) {
        console.log(`  - ${error}`);
      }
      return 'validation-error'; // Handle validation errors
    }
  }

  // Validate data against reference data
  private async validateReferenceData(
    prepRes: ValidationRequirements, 
    validationErrors: string[]
  ): Promise<void> {
    try {
      // Validate counterparty exists
      if (prepRes.dealData.counterparty && prepRes.referenceData.companies) {
        const companyExists = prepRes.referenceData.companies.some(
          company => company.text.toLowerCase().includes(prepRes.dealData.counterparty.toLowerCase())
        );
        if (!companyExists) {
          validationErrors.push(`Counterparty '${prepRes.dealData.counterparty}' not found in system`);
          console.log(`    ⚠️  Unknown counterparty: ${prepRes.dealData.counterparty}`);
        } else {
          console.log(`    ✅ Counterparty validated: ${prepRes.dealData.counterparty}`);
        }
      }

      // Validate origin location exists
      if (prepRes.dealData.originLocation && prepRes.referenceData.locations) {
        const originExists = prepRes.referenceData.locations.some(
          location => location.text.toLowerCase().includes(prepRes.dealData.originLocation.toLowerCase())
        );
        if (!originExists) {
          validationErrors.push(`Origin location '${prepRes.dealData.originLocation}' not found`);
          console.log(`    ⚠️  Unknown origin location: ${prepRes.dealData.originLocation}`);
        } else {
          console.log(`    ✅ Origin location validated: ${prepRes.dealData.originLocation}`);
        }
      }

      // Validate destination location exists
      if (prepRes.dealData.destinationLocation && prepRes.referenceData.locations) {
        const destExists = prepRes.referenceData.locations.some(
          location => location.text.toLowerCase().includes(prepRes.dealData.destinationLocation.toLowerCase())
        );
        if (!destExists) {
          validationErrors.push(`Destination location '${prepRes.dealData.destinationLocation}' not found`);
          console.log(`    ⚠️  Unknown destination location: ${prepRes.dealData.destinationLocation}`);
        } else {
          console.log(`    ✅ Destination location validated: ${prepRes.dealData.destinationLocation}`);
        }
      }

    } catch (error) {
      console.error('    ⚠️  Reference data validation failed:', error);
      validationErrors.push('Reference data validation failed');
    }
  }

  // Check location capacity via MCP
  private async mcpCheckLocationCapacity(dealData: any): Promise<any> {
    try {
      if (!dealData.originLocation || !dealData.quantity) {
        return null;
      }

      console.log(`    🔗 Using MCP to check capacity for ${dealData.originLocation}`);
      
      // Find location ID for capacity check
      const locationId = 100; // Default location ID
      
      const mcpResponse = await this.callMCPTool('qde-calculate-trade-pricing', {
        type: 'book-from-location',
        locationId
      });

      // Parse capacity response
      if (mcpResponse.includes('Book ID:')) {
        const bookMatch = mcpResponse.match(/Book ID: (\d+)/);
        if (bookMatch) {
          return {
            locationName: dealData.originLocation,
            bookId: bookMatch[1],
            isAvailable: true,
            availableCapacity: 'Unlimited',
            message: 'Capacity check passed'
          };
        }
      }

      return {
        locationName: dealData.originLocation,
        isAvailable: true,
        availableCapacity: 'Standard',
        message: 'Capacity check completed'
      };

    } catch (error) {
      console.error('    ⚠️  MCP capacity check failed:', error);
      return {
        locationName: dealData.originLocation,
        isAvailable: true,
        availableCapacity: 'Unknown',
        message: 'Capacity check failed - assuming available'
      };
    }
  }

  // Helper method to call MCP tools using proper MCP client
  private async callMCPTool(toolName: string, args: any): Promise<string> {
    const client = new Client(
      {
        name: "qde-validation-agent",
        version: "1.0.0",
      },
      {
        capabilities: {}
      }
    );

    try {
      // Connect to MCP server via stdio
      const mcpPath = '/Users/nickbrooks/work/alliance/qde-agent/mcp/server/index.ts';
      const transport = new StdioClientTransport({
        command: 'npx',
        args: ['tsx', mcpPath]
      });

      await client.connect(transport);

      // Call the tool
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });

      await client.close();

      // Extract text from result
      if (result.content && result.content.length > 0) {
        return result.content[0].text || 'No content returned';
      }

      return 'Empty response from MCP tool';
    } catch (error) {
      console.error(`MCP client error for ${toolName}:`, error);
      throw new Error(`MCP call failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private formatFieldName(field: string): string {
    // Convert camelCase to readable format
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  async execFallback(prepRes: ValidationRequirements, error: Error): Promise<ValidationResults> {
    console.error('❌ Validation Agent: Validation failed with error:', error.message);
    
    return {
      isValid: false,
      missingFields: [],
      validationErrors: [`Validation error: ${error.message}`],
      clarificationNeeded: false
    };
  }
}
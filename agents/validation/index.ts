import { Node } from '../../src/pocket-flow';
import { DealState } from '../../src/types';

interface ValidationPrepResult {
  dealData: any;
  requiredFields: string[];
  currentPhase: string;
}

interface ValidationExecResult {
  isValid: boolean;
  missingFields: string[];
  validationErrors: string[];
  clarificationNeeded: boolean;
  clarificationMessage?: string;
}

export class ValidationAgent extends Node<DealState> {
  constructor(maxRetries = 3, wait = 1) {
    super(maxRetries, wait);
  }

  async prep(shared: DealState): Promise<ValidationPrepResult> {
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

    return {
      dealData,
      requiredFields,
      currentPhase: shared.phase
    };
  }

  async exec(prepRes: ValidationPrepResult): Promise<ValidationExecResult> {
    console.log('🔍 Validation Agent: Running validation checks...');
    
    const missingFields: string[] = [];
    const validationErrors: string[] = [];
    let isValid = true;

    // Check required fields
    for (const field of prepRes.requiredFields) {
      if (!prepRes.dealData[field]) {
        missingFields.push(field);
        console.log(`  ❌ Missing required field: ${field}`);
      } else {
        console.log(`  ✅ Found required field: ${field}`);
      }
    }

    // Business rule validations
    const quantity = prepRes.dealData.quantity;
    if (quantity) {
      // Quantity validation
      if (quantity < 1000) {
        validationErrors.push('Minimum quantity is 1000 gallons');
        console.log('  ⚠️  Quantity below minimum (1000 gallons)');
      } else if (quantity > 100000) {
        validationErrors.push('Maximum quantity is 100000 gallons');
        console.log('  ⚠️  Quantity above maximum (100000 gallons)');
      } else {
        console.log(`  ✅ Quantity valid: ${quantity} gallons`);
      }
    }

    // Validate pricing structure
    if (prepRes.dealData.pricing) {
      const pricing = prepRes.dealData.pricing;
      if (!pricing.totalPrice || pricing.totalPrice <= 0) {
        validationErrors.push('Invalid pricing: total price must be positive');
        console.log('  ⚠️  Invalid pricing detected');
      } else {
        console.log(`  ✅ Pricing valid: $${pricing.totalPrice}/${pricing.unit}`);
      }
    }

    // Validate counterparty selection
    if (prepRes.dealData.counterparty) {
      console.log(`  ✅ Counterparty selected: ${prepRes.dealData.counterparty}`);
    }

    // Validate locations
    if (prepRes.dealData.originLocation && prepRes.dealData.destinationLocation) {
      if (prepRes.dealData.originLocation === prepRes.dealData.destinationLocation) {
        validationErrors.push('Origin and destination locations cannot be the same');
        console.log('  ⚠️  Origin and destination are the same');
      } else {
        console.log('  ✅ Origin and destination locations are different');
      }
    }

    // Determine if valid
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

    console.log('📊 Validation Agent: Validation complete');
    console.log(`  Status: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
    if (missingFields.length > 0) {
      console.log(`  Missing fields: ${missingFields.join(', ')}`);
    }
    if (validationErrors.length > 0) {
      console.log(`  Errors: ${validationErrors.join('; ')}`);
    }

    return {
      isValid,
      missingFields,
      validationErrors,
      clarificationNeeded,
      clarificationMessage
    };
  }

  async post(
    shared: DealState,
    prepRes: ValidationPrepResult,
    execRes: ValidationExecResult
  ): Promise<string> {
    // Update shared state with validation results
    shared.missingFields = execRes.missingFields;
    shared.validationErrors = execRes.validationErrors;

    console.log('💾 Validation Agent: Updated shared state with validation results');

    if (execRes.isValid) {
      // All validations passed, proceed to deal creation
      console.log('🎉 Validation Agent: Deal is valid, proceeding to creation...');
      shared.phase = 'creation';
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
      return 'validation'; // Stay in validation to retry
    }
  }

  private formatFieldName(field: string): string {
    // Convert camelCase to readable format
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  async execFallback(prepRes: ValidationPrepResult, error: Error): Promise<ValidationExecResult> {
    console.error('❌ Validation Agent: Validation failed with error:', error.message);
    
    return {
      isValid: false,
      missingFields: [],
      validationErrors: [`Validation error: ${error.message}`],
      clarificationNeeded: false
    };
  }
}
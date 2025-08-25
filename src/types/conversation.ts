// Conversation-specific types for the QDE Agent System
export interface ConversationState {
  // Deal Information (gradually captured)
  dealInfo: Partial<DealData>;
  
  // Conversation Management
  conversationId: string;
  currentTopic: ConversationTopic;
  missingFields: DealField[];
  priorityField?: DealField; // What to ask for next
  
  // User Interaction
  conversationHistory: ConversationMessage[];
  lastUserInput: string;
  lastAgentResponse: string;
  
  // Flow Control
  phase: ConversationPhase;
  confirmationNeeded: boolean;
  clarificationRequests: ClarificationRequest[];
  
  // Context & Memory
  userPreferences: UserPreferences;
  referenceData: ReferenceDataCache;
  
  // Validation & Status
  validationStatus: FieldValidationStatus;
  readyForCreation: boolean;
  
  // Metadata
  startedAt: string;
  lastUpdated: string;
  turnCount: number;
}

export interface DealData {
  // Core deal fields
  customer: CustomerInfo;
  product: ProductInfo;
  quantity: QuantityInfo;
  locations: LocationInfo;
  frequency: FrequencyInfo;
  pricing?: PricingInfo;
  
  // Additional details
  specialInstructions?: string;
  priority?: 'standard' | 'urgent' | 'high';
  estimatedValue?: number;
}

export interface CustomerInfo {
  name: string;
  id?: string;
  type?: 'existing' | 'new';
  confidence: number; // 0-1 how confident we are in the match
}

export interface ProductInfo {
  name: string;
  id?: string;
  category?: 'propane' | 'gasoline' | 'diesel' | 'other';
  specifications?: string;
}

export interface QuantityInfo {
  amount: number;
  unit: 'gallons' | 'barrels' | 'tons';
  flexibility?: 'exact' | 'approximate' | 'minimum';
}

export interface LocationInfo {
  origin?: LocationDetails;
  destination?: LocationDetails;
  route?: string;
}

export interface LocationDetails {
  name: string;
  id?: string;
  type?: 'terminal' | 'depot' | 'hub' | 'facility';
  city?: string;
  state?: string;
  confidence: number;
}

export interface FrequencyInfo {
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'one-time';
  duration?: string;
  startDate?: string;
  endDate?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  topic?: ConversationTopic;
  capturedData?: Partial<DealData>;
  confidence?: number;
}

export interface ClarificationRequest {
  field: DealField;
  question: string;
  suggestions?: string[];
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface UserPreferences {
  preferredUnits: 'gallons' | 'barrels';
  defaultLocations?: LocationDetails[];
  communicationStyle: 'formal' | 'casual' | 'technical';
  confirmationLevel: 'minimal' | 'standard' | 'detailed';
}

export interface ReferenceDataCache {
  companies: any[];
  locations: any[];
  products: any[];
  frequencies: any[];
  lastUpdated: string;
}

export interface FieldValidationStatus {
  [key in DealField]: {
    status: 'missing' | 'partial' | 'complete' | 'invalid';
    confidence: number;
    lastValidated: string;
    issues?: string[];
  };
}

// Enums and Types
export type ConversationPhase = 
  | 'greeting' 
  | 'information_gathering' 
  | 'clarification' 
  | 'confirmation' 
  | 'creation' 
  | 'complete' 
  | 'error';

export type ConversationTopic = 
  | 'customer' 
  | 'product' 
  | 'quantity' 
  | 'origin_location' 
  | 'destination_location' 
  | 'frequency' 
  | 'pricing' 
  | 'confirmation' 
  | 'general';

export type DealField = 
  | 'customer' 
  | 'product' 
  | 'quantity' 
  | 'origin_location' 
  | 'destination_location' 
  | 'frequency' 
  | 'special_instructions';

// Helper types for conversation flow
export interface ConversationFlow {
  requiredFields: DealField[];
  optionalFields: DealField[];
  fieldDependencies: Record<DealField, DealField[]>;
  priorityOrder: DealField[];
}

export interface AgentResponse {
  message: string;
  nextTopic: ConversationTopic;
  suggestedActions?: string[];
  capturedData?: Partial<DealData>;
  needsClarification?: boolean;
  readyToConfirm?: boolean;
}

// Intent recognition types
export interface UserIntent {
  type: 'provide_info' | 'ask_question' | 'confirm' | 'deny' | 'change_info' | 'start_over';
  topic: ConversationTopic;
  confidence: number;
  extractedData?: Partial<DealData>;
  ambiguities?: string[];
}
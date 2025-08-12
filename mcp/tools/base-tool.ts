import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiConfig, McpToolResponse } from '../../src/types/index.js';

export abstract class BaseTool {
  protected client: AxiosInstance;
  protected config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` })
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(`API Error:`, error.response?.data || error.message);
        throw error;
      }
    );
  }

  protected async makeRequest(path: string, options: AxiosRequestConfig = {}): Promise<any> {
    try {
      const response = await this.client.request({
        url: path,
        ...options
      });
      return response.data;
    } catch (error: any) {
      let errorMessage = 'API request failed';
      let errorContext: any = { path, method: options.method || 'GET' };
      
      if (error.response) {
        // API responded with error status
        errorMessage = `API returned ${error.response.status}: ${error.response.statusText}`;
        errorContext.status = error.response.status;
        errorContext.responseData = error.response.data;
      } else if (error.request) {
        // No response received
        errorMessage = 'No response received from API (network/timeout error)';
        errorContext.timeout = this.config.timeout;
        errorContext.baseUrl = this.config.baseUrl;
      } else {
        // Request setup error
        errorMessage = `Request setup error: ${error.message}`;
      }
      
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).context = errorContext;
      throw enhancedError;
    }
  }

  protected createResponse(data: any, isError = false): McpToolResponse {
    let textContent: string;
    
    if (typeof data === 'string') {
      textContent = data;
    } else if (data && typeof data === 'object') {
      // Format object data in a more readable way for Claude
      if (Array.isArray(data)) {
        textContent = `Found ${data.length} items:\n${JSON.stringify(data, null, 2)}`;
      } else if (data.error) {
        textContent = `Error: ${data.error}`;
      } else if (data.type && data.data) {
        // Structured response with type and data
        textContent = `${data.type} data (${data.count || 'unknown'} items):\n${JSON.stringify(data.data, null, 2)}`;
      } else {
        textContent = JSON.stringify(data, null, 2);
      }
    } else {
      textContent = String(data);
    }

    return {
      content: [
        {
          type: 'text',
          text: textContent
        }
      ],
      isError
    };
  }

  protected createErrorResponse(message: string, context?: any): McpToolResponse {
    let errorText = `Error: ${message}`;
    
    if (context) {
      errorText += `\nContext: ${JSON.stringify(context, null, 2)}`;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: errorText
        }
      ],
      isError: true
    };
  }

  abstract execute(args: Record<string, any>): Promise<McpToolResponse>;
}
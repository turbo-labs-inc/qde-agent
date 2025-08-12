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
    } catch (error) {
      throw new Error(`API request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected createResponse(data: any, isError = false): McpToolResponse {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }
      ],
      isError
    };
  }

  protected createErrorResponse(message: string): McpToolResponse {
    return this.createResponse({ error: message }, true);
  }

  abstract execute(args: Record<string, any>): Promise<McpToolResponse>;
}
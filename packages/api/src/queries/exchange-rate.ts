import { BaseQuery } from './base';
import { IExchangeRateQuery } from './interfaces';

/**
 * ExchangeRateQuery retrieves the latest currency exchange rates from the database.
 * It provides a mapping of target currencies to their rates relative to a base currency.
 */
export class ExchangeRateQuery extends BaseQuery implements IExchangeRateQuery {
  /**
   * Fetches the latest exchange rates and returns them as a record.
   * 
   * @returns A promise that resolves to a Record where keys are currency codes and values are rates.
   * @throws Will throw an error if the database query fails.
   */
  async getLatest(): Promise<Record<string, number>> {
    // PSEUDOCODE:
    // 1. Query the 'exchange_rates' table for target and rate columns.
    // 2. Process the results into a key-value record format.
    // 3. Ensure a base rate (USD: 1) is included by default.
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('target, rate');

    if (error) throw error;
    
    return (data || []).reduce((acc, curr) => {
      acc[curr.target] = curr.rate;
      return acc;
    }, { USD: 1 } as Record<string, number>); // USD is the default base for comparisons
  }
}

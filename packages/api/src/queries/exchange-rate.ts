import { BaseQuery } from './base';
import { ExchangeRate } from '@stashflow/core';
import { IExchangeRateQuery } from './interfaces';

export class ExchangeRateQuery extends BaseQuery implements IExchangeRateQuery {
  async getLatest(): Promise<Record<string, number>> {
    const { data, error } = await this.client
      .from('exchange_rates')
      .select('target, rate');

    if (error) throw error;
    
    return (data || []).reduce((acc, curr) => {
      acc[curr.target] = curr.rate;
      return acc;
    }, { USD: 1 } as Record<string, number>);
  }
}

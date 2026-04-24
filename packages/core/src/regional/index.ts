import { RegionalStrategy } from './interface'
import { USStrategy } from './strategies/USStrategy'
import { PHStrategy } from './strategies/PHStrategy'
import { SGStrategy } from './strategies/SGStrategy'

export * from './interface'

class StrategyRegistry {
  private strategies: Map<string, RegionalStrategy> = new Map()

  constructor() {
    this.register(new USStrategy())
    this.register(new PHStrategy())
    this.register(new SGStrategy())
  }

  register(strategy: RegionalStrategy) {
    this.strategies.set(strategy.currency, strategy)
  }

  getStrategy(currency: string): RegionalStrategy {
    return this.strategies.get(currency) || this.strategies.get('USD')!
  }
}

export const regionalRegistry = new StrategyRegistry()

export function getRegionalStrategy(currency: string): RegionalStrategy {
  return regionalRegistry.getStrategy(currency)
}

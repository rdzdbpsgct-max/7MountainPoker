import { createContext, type ReactNode, useContext } from 'react';
import type { TournamentConfig, Settings, Currency } from '../domain/types';

export interface TournamentContextValue {
  config: TournamentConfig;
  settings: Settings;
  currency: Currency;
}

const TournamentContext = createContext<TournamentContextValue | null>(null);

interface ProviderProps extends TournamentContextValue {
  children: ReactNode;
}

export function TournamentProvider({ config, settings, currency, children }: ProviderProps) {
  return (
    <TournamentContext.Provider value={{ config, settings, currency }}>
      {children}
    </TournamentContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTournamentContext(): TournamentContextValue | null {
  return useContext(TournamentContext);
}

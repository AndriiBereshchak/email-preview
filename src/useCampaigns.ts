import { useSyncExternalStore } from 'react';
import { campaignStore } from './campaignStore';
export const useCampaigns = () =>
  useSyncExternalStore(campaignStore.subscribe, campaignStore.getSnapshot);

import { useSyncExternalStore } from 'react';
import { campaignStore } from '../mocks/campaignStore';
export const useCampaigns = () =>
  useSyncExternalStore(campaignStore.subscribe, campaignStore.getSnapshot);

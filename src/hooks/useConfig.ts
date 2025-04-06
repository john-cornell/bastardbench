import { useState, useEffect } from 'react';
import { loadConfig, saveConfig, ConfigData } from '../utils/storage';

export function useConfig() {
  const [config, setConfig] = useState<ConfigData>(() => loadConfig());

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  const updateConfig = (updates: Partial<ConfigData>) => {
    setConfig((prev: ConfigData) => ({ ...prev, ...updates }));
  };

  return {
    config,
    updateConfig
  };
} 
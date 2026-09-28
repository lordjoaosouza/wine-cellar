import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  getTuyaConnectionStatus,
  isTuyaConnected,
  readCellarSensor,
} from "@/services/tuya-connection";
import type { TuyaReading } from "@/types/tuya";

export function useTuyaSensor() {
  const [linked, setLinked] = useState(false);
  const [reading, setReading] = useState<TuyaReading | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const status = await getTuyaConnectionStatus();
    const configured = isTuyaConnected(status);
    setLinked(configured);
    if (!configured) {
      setReading(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setReading(await readCellarSensor());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not read the sensor."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { error, linked, loading, reading, refresh };
}

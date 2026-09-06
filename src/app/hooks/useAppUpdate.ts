import { useEffect, useRef, useState } from 'react';

export function useAppUpdate() {
  const supported = import.meta.env.PROD && 'serviceWorker' in navigator;
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const actions = useRef({ check: () => {}, apply: () => {} });

  useEffect(() => {
    if (!supported) {
      return;
    }
    const listeners = new AbortController();
    const { signal } = listeners;
    let registration: ServiceWorkerRegistration | undefined;
    let checkingNow = false;
    let hadController = Boolean(navigator.serviceWorker.controller);
    let activatedUpdate = false;
    let reloadRequested = false;
    let applyTimeout: number | undefined;

    const announceWaiting = () => {
      if (registration?.waiting && navigator.serviceWorker.controller) {
        setAvailable(true);
        setMessage('');
      }
    };
    const watchInstallation = () => {
      const worker = registration?.installing;
      worker?.addEventListener(
        'statechange',
        () => {
          if (worker.state === 'installed') {
            announceWaiting();
          } else if (worker.state === 'redundant') {
            setMessage(
              'The update could not download. Keep using Saving and try checking again.',
            );
          }
        },
        { signal },
      );
    };
    const check = async (manual = false) => {
      if (checkingNow || (!manual && (document.hidden || !navigator.onLine))) {
        return;
      }
      checkingNow = true;
      if (manual) {
        setChecking(true);
        setMessage('');
      }
      try {
        if (!navigator.onLine) {
          throw new Error('Offline');
        }
        if (!registration) {
          registration = await navigator.serviceWorker.register(
            `${import.meta.env.BASE_URL}sw.js`,
            { scope: import.meta.env.BASE_URL, updateViaCache: 'none' },
          );
          if (signal.aborted) {
            return;
          }
          registration.addEventListener('updatefound', watchInstallation, {
            signal,
          });
          watchInstallation();
        } else {
          await registration.update();
        }
        if (signal.aborted) {
          return;
        }
        announceWaiting();
        if (manual && !registration.waiting && !activatedUpdate) {
          setMessage(
            registration.installing
              ? 'Downloading the update. You can keep working.'
              : 'You’re using the latest available version.',
          );
        }
      } catch {
        if (manual && !signal.aborted) {
          setMessage(
            'Could not check for updates. Check your connection and try again. Your saved savings are unchanged.',
          );
        }
      } finally {
        checkingNow = false;
        if (!signal.aborted) {
          setChecking(false);
        }
      }
    };
    const applyFailed = () => {
      reloadRequested = false;
      window.clearTimeout(applyTimeout);
      setApplying(false);
      setMessage(
        'The update did not finish. Try Update now again, or close all Saving tabs and reopen the app.',
      );
    };
    actions.current = {
      check: () => void check(true),
      apply: () => {
        if (activatedUpdate) {
          window.location.reload();
        } else if (registration?.waiting) {
          reloadRequested = true;
          setApplying(true);
          setMessage('');
          applyTimeout = window.setTimeout(applyFailed, 15000);
          try {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          } catch {
            applyFailed();
          }
        } else {
          setMessage(
            'The update is not ready yet. Check for updates and try again.',
          );
        }
      },
    };
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        if (hadController) {
          activatedUpdate = true;
          setAvailable(true);
          setMessage('');
          if (reloadRequested) {
            window.clearTimeout(applyTimeout);
            window.location.reload();
          }
        }
        hadController = true;
      },
      { signal },
    );
    const checkWhenVisible = () => void check();
    document.addEventListener('visibilitychange', checkWhenVisible, { signal });
    window.addEventListener('online', checkWhenVisible, { signal });
    const interval = window.setInterval(checkWhenVisible, 60 * 60 * 1000);
    void check();

    return () => {
      listeners.abort();
      window.clearInterval(interval);
      window.clearTimeout(applyTimeout);
    };
  }, [supported]);

  return {
    supported,
    available,
    checking,
    applying,
    message,
    check: () => actions.current.check(),
    apply: () => actions.current.apply(),
  };
}
